const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ─── ROTAS FIXAS PRIMEIRO ────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { empresaId, page = '1', limit = '50', busca, agrupado } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      ativo: true,
      empresa: { escritorioId: req.user.escritorioId }
    };
    if (empresaId) where.empresaId = empresaId;
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { empresa: { razaoSocial: { contains: busca, mode: 'insensitive' } } }
      ];
    }
    if (req.user.nivel === 'OPERADOR') {
      where.empresa = { ...where.empresa, responsavelId: req.user.id };
    }

    if (agrupado === 'true') {
      const todos = await prisma.grupoTarefa.findMany({
        where,
        include: {
          subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } },
          empresa: { select: { id: true, razaoSocial: true, cidade: true, estado: true } }
        },
        orderBy: [{ nome: 'asc' }, { diaVencimento: 'asc' }]
      });
      const mapa = new Map();
      for (const g of todos) {
        const chave = `${g.nome}||${g.diaVencimento}||${g.tipo}||${g.mesSubsequente}||${g.isDiaUtil}`;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            nome: g.nome, diaVencimento: g.diaVencimento, isDiaUtil: g.isDiaUtil,
            mesSubsequente: g.mesSubsequente, tipo: g.tipo, inicioCobrancaEm: g.inicioCobrancaEm,
            subtarefas: g.subtarefas, ids: [], empresas: []
          });
        }
        const grupo = mapa.get(chave);
        grupo.ids.push(g.id);
        grupo.empresas.push(g.empresa);
      }
      const agrupados = Array.from(mapa.values());
      const paginado = agrupados.slice(skip, skip + Number(limit));
      return res.json({ grupos: paginado, total: agrupados.length, page: Number(page), limit: Number(limit) });
    }

    const [grupos, total] = await Promise.all([
      prisma.grupoTarefa.findMany({
        where,
        include: {
          subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } },
          empresa: { select: { id: true, razaoSocial: true } }
        },
        orderBy: [{ empresa: { razaoSocial: 'asc' } }, { diaVencimento: 'asc' }],
        skip, take: Number(limit)
      }),
      prisma.grupoTarefa.count({ where })
    ]);
    res.json({ grupos, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/lote', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { ids, nome, diaVencimento, tipo, inicioCobrancaEm, isDiaUtil, mesSubsequente, subtarefas } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum ID informado.' });
    await prisma.grupoTarefa.updateMany({
      where: { id: { in: ids } },
      data: { nome, diaVencimento: Number(diaVencimento), tipo, isDiaUtil: isDiaUtil || false, mesSubsequente: mesSubsequente || false, inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null }
    });
    if (Array.isArray(subtarefas)) {
      await prisma.subtarefa.updateMany({ where: { grupoId: { in: ids } }, data: { ativa: false } });
      for (const grupoId of ids) {
        for (let i = 0; i < subtarefas.length; i++) {
          await prisma.subtarefa.create({ data: { grupoId, nome: subtarefas[i].nome, temValor: subtarefas[i].temValor || false, ordem: i } });
        }
      }
    }
    res.json({ ok: true, total: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/lote', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum ID informado.' });
    await prisma.grupoTarefa.updateMany({ where: { id: { in: ids } }, data: { ativo: false } });
    res.json({ ok: true, total: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/gerenciar-empresas', async (req, res) => {
  try {
    const { nomeGrupo, diaVencimento, tipo, adicionar, remover } = req.body;
    const escId = req.user.escritorioId;
    if (Array.isArray(remover) && remover.length > 0) {
      await prisma.grupoTarefa.updateMany({
        where: { nome: nomeGrupo, diaVencimento: Number(diaVencimento), tipo, empresaId: { in: remover }, empresa: { escritorioId: escId } },
        data: { ativo: false }
      });
    }
    if (Array.isArray(adicionar) && adicionar.length > 0) {
      const modelo = await prisma.grupoTarefa.findFirst({
        where: { nome: nomeGrupo, diaVencimento: Number(diaVencimento), tipo, ativo: true, empresa: { escritorioId: escId } },
        include: { subtarefas: { where: { ativa: true } } }
      });
      if (!modelo) return res.status(404).json({ error: 'Tarefa modelo não encontrada.' });
      for (const empresaId of adicionar) {
        const existente = await prisma.grupoTarefa.findFirst({ where: { nome: nomeGrupo, diaVencimento: Number(diaVencimento), tipo, empresaId } });
        if (existente) {
          await prisma.grupoTarefa.update({ where: { id: existente.id }, data: { ativo: true } });
        } else {
          await prisma.grupoTarefa.create({
            data: {
              empresaId, nome: modelo.nome, diaVencimento: modelo.diaVencimento,
              isDiaUtil: modelo.isDiaUtil, mesSubsequente: modelo.mesSubsequente,
              tipo: modelo.tipo, inicioCobrancaEm: modelo.inicioCobrancaEm,
              subtarefas: { create: modelo.subtarefas.map((s, i) => ({ nome: s.nome, temValor: s.temValor, ordem: i })) }
            }
          });
        }
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/subtarefas/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.subtarefa.update({ where: { id: req.params.id }, data: { ativa: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, diaVencimento, tipo, subtarefas, empresaIds, inicioCobrancaEm, isDiaUtil, mesSubsequente } = req.body;
    const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];
    const criados = [];
    for (const empresaId of ids) {
      const grupo = await prisma.grupoTarefa.create({
        data: {
          empresaId, nome, diaVencimento: Number(diaVencimento),
          tipo: tipo || 'RECORRENTE', isDiaUtil: isDiaUtil || false, mesSubsequente: mesSubsequente || false,
          inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null,
          subtarefas: { create: (subtarefas || []).map((s, i) => ({ nome: s.nome, temValor: s.temValor || false, ordem: i })) }
        },
        include: { subtarefas: true, empresa: { select: { id: true, razaoSocial: true } } }
      });
      criados.push(grupo);
    }
    res.status(201).json(criados.length === 1 ? criados[0] : criados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ROTAS COM PARÂMETROS ─────────────────────────────────────────────────────

// Retorna grupos da empresa com dataVencimentoReal calculada
router.get('/:empresaId', async (req, res) => {
  try {
    const { competencia } = req.query;
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.empresaId },
      select: { participaTarefas: true, cidade: true, estado: true }
    });
    if (empresa && empresa.participaTarefas === false) return res.json([]);

    const grupos = await prisma.grupoTarefa.findMany({
      where: { empresaId: req.params.empresaId, ativo: true },
      include: { subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } } },
      orderBy: { diaVencimento: 'asc' }
    });

    // Se vier competência, calcula a data real de vencimento de cada grupo
    if (competencia) {
      const feriadosMunicipais = await prisma.feriado.findMany({
        where: { escritorioId: req.user.escritorioId }
      });
      const { calcularDataVencimento } = require('../utils/diasUteis');
      const gruposComData = grupos.map(g => ({
        ...g,
        dataVencimentoReal: calcularDataVencimento(g, competencia, feriadosMunicipais, empresa.cidade, empresa.estado)
      }));
      // Ordena por data de vencimento real (cronológico)
      gruposComData.sort((a, b) => a.dataVencimentoReal - b.dataVencimentoReal);
      return res.json(gruposComData);
    }

    res.json(grupos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:empresaId/entregas/:competencia', async (req, res) => {
  try {
    const { empresaId, competencia } = req.params;
    const historico = await prisma.historicoMensal.findUnique({
      where: { empresaId_competencia: { empresaId, competencia } }
    });
    if (!historico) return res.json([]);
    const entregas = await prisma.entregaGrupo.findMany({
      where: { historicoId: historico.id },
      include: { subtarefas: true }
    });
    res.json(entregas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, diaVencimento, tipo, inicioCobrancaEm, isDiaUtil, mesSubsequente } = req.body;
    const grupo = await prisma.grupoTarefa.update({
      where: { id: req.params.id },
      data: { nome, diaVencimento: Number(diaVencimento), tipo, isDiaUtil: isDiaUtil || false, mesSubsequente: mesSubsequente || false, inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null },
      include: { subtarefas: { where: { ativa: true } }, empresa: { select: { id: true, razaoSocial: true } } }
    });
    res.json(grupo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:grupoId/subtarefas', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, temValor } = req.body;
    const count = await prisma.subtarefa.count({ where: { grupoId: req.params.grupoId } });
    const sub = await prisma.subtarefa.create({ data: { grupoId: req.params.grupoId, nome, temValor: temValor || false, ordem: count } });
    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:grupoId/entregar/:competencia/:empresaId', async (req, res) => {
  try {
    const { grupoId, competencia, empresaId } = req.params;
    const { entregue, dispensada, dataEntrega, subtarefas } = req.body;
    let historico = await prisma.historicoMensal.findUnique({ where: { empresaId_competencia: { empresaId, competencia } } });
    if (!historico) {
      historico = await prisma.historicoMensal.create({ data: { empresaId, competencia, responsavelId: req.user.id } });
    }
    const entregaGrupo = await prisma.entregaGrupo.upsert({
      where: { grupoId_historicoId: { grupoId, historicoId: historico.id } },
      create: { grupoId, historicoId: historico.id, entregue: entregue || false, dispensada: dispensada || false, dataEntrega: dataEntrega ? new Date(dataEntrega) : null },
      update: { entregue: entregue || false, dispensada: dispensada || false, dataEntrega: dataEntrega ? new Date(dataEntrega) : null }
    });
    const todasEntregas = await prisma.entregaGrupo.findMany({ where: { historicoId: historico.id } });
    const todosGrupos = await prisma.grupoTarefa.findMany({ where: { empresaId, ativo: true } });
    const concluidos = todasEntregas.filter(e => e.entregue || e.dispensada).length;
    let status = 'NAO_INICIADO';
    if (todosGrupos.length > 0 && concluidos >= todosGrupos.length) status = 'FINALIZADO';
    else if (concluidos > 0) status = 'PARCIAL';
    await prisma.historicoMensal.update({ where: { id: historico.id }, data: { status } });
    if (!dispensada && subtarefas?.length > 0) {
      for (const sub of subtarefas) {
        await prisma.entregaSubtarefa.upsert({
          where: { subtarefaId_entregaGrupoId: { subtarefaId: sub.subtarefaId, entregaGrupoId: entregaGrupo.id } },
          create: { subtarefaId: sub.subtarefaId, entregaGrupoId: entregaGrupo.id, ok: sub.ok || false, valor: sub.valor || null },
          update: { ok: sub.ok || false, valor: sub.valor || null }
        });
      }
    }
    res.json(entregaGrupo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.grupoTarefa.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
