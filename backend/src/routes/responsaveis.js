const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { ativo: true, escritorioId: req.user.escritorioId },
      select: { id: true, nome: true, email: true, nivel: true, criadoEm: true }
    });
    res.json(usuarios);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, email, senha, nivel } = req.body;
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'Email já cadastrado' });
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: senhaHash, nivel, escritorioId: req.user.escritorioId },
      select: { id: true, nome: true, email: true, nivel: true, criadoEm: true }
    });
    res.status(201).json(usuario);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { nome, email, nivel, senha } = req.body;
    const data = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (nivel) data.nivel = nivel;
    if (senha) data.senha = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: { id: true, nome: true, email: true, nivel: true, criadoEm: true }
    });
    res.json(usuario);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rota nova — atribuir empresas em lote a um usuário (uma só query no banco)
router.post('/:id/empresas', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { adicionar, remover } = req.body;
    // adicionar: array de IDs para vincular ao usuário
    // remover: array de IDs para desvincular

    if (remover && remover.length > 0) {
      await prisma.empresa.updateMany({
        where: {
          id: { in: remover },
          escritorioId: req.user.escritorioId
        },
        data: { responsavelId: null }
      });
    }

    if (adicionar && adicionar.length > 0) {
      await prisma.empresa.updateMany({
        where: {
          id: { in: adicionar },
          escritorioId: req.user.escritorioId
        },
        data: { responsavelId: req.params.id }
      });
    }

    res.json({ ok: true, adicionadas: adicionar?.length || 0, removidas: remover?.length || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    }
    await prisma.usuario.update({
      where: { id: req.params.id },
      data: { ativo: false }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
