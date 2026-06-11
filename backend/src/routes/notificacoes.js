const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

// Listar notificações do usuário logado
router.get('/', async (req, res) => {
  try {
    const notificacoes = await prisma.notificacao.findMany({
      where: { usuarioId: req.user.id },
      orderBy: { criadoEm: 'desc' },
      take: 50
    });
    res.json(notificacoes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Contar não lidas
router.get('/nao-lidas', async (req, res) => {
  try {
    const total = await prisma.notificacao.count({
      where: { usuarioId: req.user.id, lida: false }
    });
    res.json({ total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Marcar uma como lida
router.patch('/:id/ler', async (req, res) => {
  try {
    await prisma.notificacao.update({
      where: { id: req.params.id },
      data: { lida: true }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Marcar todas como lidas
router.patch('/ler-todas', async (req, res) => {
  try {
    await prisma.notificacao.updateMany({
      where: { usuarioId: req.user.id, lida: false },
      data: { lida: true }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir uma notificação
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notificacao.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
