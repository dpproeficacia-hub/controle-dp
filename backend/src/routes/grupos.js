const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Listar grupos de uma empresa
router.get('/:empresaId', async (req, res) => {
  try {
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

// Criar grupo para uma ou várias empresas
router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, diaVencimento, tipo, subtarefas, empresaIds } = req.body;
    const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

    const criados = [];
    for (const empresaId of ids) {
      const grupo = await prisma.grupoTarefa.create({
        data: {
          empresaId,
          nome,
          diaVencimento: Number(diaVencimento),
          tipo: tipo || 'RECORRENTE',
          subtarefas: {
            create: (subtarefas || []).map((s, i) => ({
              nome: s.nome,
              temValor: s.temValor || false,
              ordem: i
            }))
          }
        },
        include: { subtarefas: true }
      });
      criados.push(grupo);
    }

    res.status(201).json(criados.length === 1 ? criados[0] : criados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar grupo
router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, diaVencimento, tipo } = req.body;
    const grupo = await prisma.grupoTarefa.update({
      where: { id: req.params.id },
      data: { nome, diaVencimento: Number(diaVencimento), tipo },
      include: { subtarefas: { where: { ativa: true } } }
    });
    res.json(grupo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adicionar subtarefa a um grupo
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

// Remover subtarefa
router.delete('/subtarefas/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.subtarefa.update({ where: { id: req.params.id }, data: { ativa: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover grupo
router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.grupoTarefa.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Salvar entregas do mês
router.post('/:grupoId/entregar/:competencia/:empresaId', async (req, res) => {
  try {
    const { grupoId, competencia, empresaId } = req.params;
    const { entregue, dataEntrega, subtarefas } = req.body;

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
      create: { grupoId, historicoId: historico.id, entregue, dataEntrega: dataEntrega ? new Date(dataEntrega) : null },
      update: { entregue, dataEntrega: dataEntrega ? new Date(dataEntrega) : null }
    });

    if (subtarefas?.length) {
      for (const s of subtarefas) {
        await prisma.entregaSubtarefa.upsert({
          where: { subtarefaId_entregaGrupoId: { subtarefaId: s.subtarefaId, entregaGrupoId: entregaGrupo.id } },
          create: { subtarefaId: s.subtarefaId, entregaGrupoId: entregaGrupo.id, ok: s.ok, valor: s.valor || null },
          update: { ok: s.ok, valor: s.valor || null }
        });
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar entregas de uma empresa em uma competência
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

module.exports = router;
