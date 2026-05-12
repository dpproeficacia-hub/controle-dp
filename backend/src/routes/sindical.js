const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ─── SINDICATOS (cadastro central) ───────────────────────────────────────────

// Listar todos os sindicatos
router.get('/sindicatos', async (req, res) => {
  try {
    const sindicatos = await prisma.sindicato.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });
    res.json(sindicatos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar sindicato
router.post('/sindicatos', async (req, res) => {
  try {
    const { nome, dataBase, observacoes } = req.body;
    const sindicato = await prisma.sindicato.create({
      data: { nome, dataBase, observacoes: observacoes || null }
    });
    res.status(201).json(sindicato);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Editar sindicato
router.put('/sindicatos/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, dataBase, observacoes } = req.body;
    const sindicato = await prisma.sindicato.update({
      where: { id: req.params.id },
      data: { nome, dataBase, observacoes: observacoes || null }
    });
    res.json(sindicato);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover sindicato
router.delete('/sindicatos/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.sindicato.update({
      where: { id: req.params.id },
      data: { ativo: false }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CONTROLE SINDICAL POR EMPRESA ───────────────────────────────────────────

// Listar controles sindicais (para a aba CCT)
router.get('/', async (req, res) => {
  try {
    const controles = await prisma.controleSindical.findMany({
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        sindicato: true
      },
      orderBy: { empresa: { razaoSocial: 'asc' } }
    });
    res.json(controles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Salvar/atualizar controle sindical de uma empresa
router.put('/:empresaId', async (req, res) => {
  try {
    const { sindicatoId, ultimaCct, reajusteAplicado } = req.body;

    const controle = await prisma.controleSindical.upsert({
      where: { empresaId: req.params.empresaId },
      create: {
        empresaId: req.params.empresaId,
        sindicatoId: sindicatoId || null,
        ultimaCct: Number(ultimaCct) || new Date().getFullYear(),
        reajusteAplicado: reajusteAplicado || false
      },
      update: {
        sindicatoId: sindicatoId || null,
        ultimaCct: Number(ultimaCct) || new Date().getFullYear(),
        reajusteAplicado: reajusteAplicado || false
      },
      include: { sindicato: true }
    });

    res.json(controle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
