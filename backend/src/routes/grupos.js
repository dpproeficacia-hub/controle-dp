const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ─── ROTAS FIXAS PRIMEIRO ────────────────────────────────────────────────────

router.get('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { empresaId, page = '1', limit = '50', busca } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { ativo: true };
    if (empresaId) where.empresaId = empresaId;
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { empresa: { razaoSocial: { contains: busca, mode: 'insensitive' } } }
      ];
    }
    const [grupos, total] = await Promise.all([
      prisma.grupoTarefa.findMany({
        where,
        include: {
          subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } },
          empresa: { select: { id: true, razaoSocial: true } }
        },
        orderBy: [{ empresa: { razaoSocial: 'asc' } }, { diaVencimento: 'asc' }],
        skip,
        take: Number(limit)
      }),
      prisma.grupoTarefa.count({ where })
    ]);
    res.json({ grupos, total, page: Number(page), limit: Number(limit) });
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
    const { nome, diaVencimento, tipo, subtarefas, empresaIds, inicioCobrancaEm } = req.body;
    const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];
    const criados = [];
    for (const empresaId of ids) {
      const grupo = await prisma.grupoTarefa.create({
        data: {
          empresaId, nome,
          diaVencimento: Number(diaVencimento),
          tipo: tipo || 'RECORRENTE',
          inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null,
          subtarefas: {
            create: (subtarefas || []).map((s, i) => ({
              nome: s.nome, temValor: s.temValor || false, ordem: i
            }))
          }
        },
        include: {
          subtarefas: true,
          empresa: { select: { id: true, razaoSocial: true } }
        }
      });
      criados.push(grupo);
    }
    res.status(201).json(criados.length === 1 ? criados[0] : criados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ROTAS COM PARÂMETROS ─────────────────────────────────────────────────────

router.get('/:empresaId', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.empresaId },
      select: { participaTarefas: true }
    });
    if (empresa && empresa.participaTarefas === false) return res.json([]);
    const grupos = await prisma.grupoTarefa.findMany({
      where: { empresaId: req.params.empresaId, ativo: true },
      include: { subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } } },
      orderBy: { diaVencimento: 'asc' }
    });
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
    const { nome, diaVencimento, tipo, inicioCobrancaEm } = req.body;
    const grupo = await prisma.grupoTarefa.update({
      where: { id: req.params.id },
      data: {
        nome, diaVencimento: Number(diaVencimento), tipo,
        inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null
      },
      include: {
        subtarefas: { where: { ativa: true } },
        empresa: { select: { id: true, razaoSocial: true } }
      }
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
    const sub = await prisma.subtarefa.create({
      data: { grupoId: req.params.grupoId, nome, temValor: temValor || false, ordem: count }
    });
    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:grupoId/entregar/:competencia/:empresaId', async (req, res) => {
  try {
    const { grupoId, competencia, empresaId } = req.params;
    const { entregue, dispensada, dataEntrega, subtarefas } = req.body;

    let historico = await prisma.historicoMensal.findUnique({
      where: { empresaId_competencia: { empresaId, competencia } }
    });
    if (!historico) {
      historico = await prisma.historicoMensal.create({
        data: { empresaId, competencia, responsavelId: req.user.id }
      });
    }

    const entregaGrupo = await prisma.entregaGrupo.upsert({
      where: { grupoId_historicoId: { grupoId, historicoId: historico.id } },
      create: {
        grupoId, historicoId: historico.id,
        entregue: entregue || false,
        dispensada: dispensada || false,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : null
      },
      update: {
        entregue: entregue || false,
        dispensada: dispensada || false,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : null
      }
    });

    // Só salva subtarefas se não foi dispensada
    if (!dispensada && subtarefas && subtarefas.length > 0) {
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
