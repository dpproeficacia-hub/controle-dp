const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Listar todos os grupos (aba de gestão de tarefas)
router.get('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const grupos = await prisma.grupoTarefa.findMany({
      where: { ativo: true },
      include: {
        subtarefas: { where: { ativa: true }, orderBy: { ordem: 'asc' } },
        empresa: { select: { id: true, razaoSocial: true } }
      },
      orderBy: [{ empresa: { razaoSocial: 'asc' } }, { diaVencimento: 'asc' }]
    });
    res.json(grupos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
    const { nome, diaVencimento, tipo, subtarefas, empresaIds, inicioCobrancaEm } = req.body;
    const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

    const criados = [];
    for (const empresaId of ids) {
      const grupo = await prisma.grupoTarefa.create({
        data: {
          empresaId,
          nome,
          diaVencimento: Number(diaVencimento),
          tipo: tipo || 'RECORRENTE',
          inicioCobrancaEm: inicioCobrancaEm ? new Date(inicioCobrancaEm) : null,
          subtarefas: {
            create: (subtarefas || []).map((s, i) => ({
              nome: s.nome,
              temValor: s.temValor || false,
              ordem: i
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

// Atualizar grupo
router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, diaVencimento, tipo, inicioCobrancaEm } = req.body;
    const grupo = await prisma.grupoTarefa.update({
      where: { id: req.params.id },
      data: {
        nome,
        diaVencimento: Number(diaVencimento),
        tipo,
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

module.exports = router;
