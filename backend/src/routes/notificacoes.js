const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

// ─── ROTAS FIXAS ANTES DE /:id ───────────────────────────────────────────────

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

// Marcar TODAS como lidas — DEVE VIR ANTES DE /:id
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

// Enviar aviso geral — QUALQUER usuário pode enviar
router.post('/aviso', async (req, res) => {
  try {
    const { titulo, mensagem, destinatarios } = req.body;
    // destinatarios: array de IDs ou 'todos'
    if (!titulo?.trim() || !mensagem?.trim()) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    let usuariosDestino;
    if (destinatarios === 'todos' || !destinatarios) {
      // Todos os usuários do mesmo escritório, exceto o remetente
      usuariosDestino = await prisma.usuario.findMany({
        where: {
          escritorioId: req.user.escritorioId,
          ativo: true,
          id: { not: req.user.id }
        },
        select: { id: true }
      });
    } else if (Array.isArray(destinatarios)) {
      usuariosDestino = destinatarios.map(id => ({ id }));
    } else {
      return res.status(400).json({ error: 'Destinatários inválidos' });
    }

    if (usuariosDestino.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário encontrado' });
    }

    // Cria notificação para cada destinatário
    await prisma.notificacao.createMany({
      data: usuariosDestino.map(u => ({
        usuarioId: u.id,
        tipo: 'AVISO',
        titulo: titulo.trim(),
        mensagem: `${req.user.nome}: ${mensagem.trim()}`,
        lida: false
      }))
    });

    res.json({ ok: true, enviado: usuariosDestino.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ROTAS COM PARÂMETRO /:id ─────────────────────────────────────────────────

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
