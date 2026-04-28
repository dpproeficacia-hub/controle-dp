const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, email: true, nivel: true, criadoEm: true }
  });
  res.json(usuarios);
});

router.post('/', requireNivel('ADMIN'), async (req, res) => {
  const { nome, email, senha, nivel } = req.body;
  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senha: senhaHash, nivel },
    select: { id: true, nome: true, email: true, nivel: true }
  });
  res.status(201).json(usuario);
});

router.put('/:id', requireNivel('ADMIN'), async (req, res) => {
  const { nome, email, nivel, senha } = req.body;
  const data = { nome, email, nivel };
  if (senha) data.senha = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.update({
    where: { id: req.params.id }, data,
    select: { id: true, nome: true, email: true, nivel: true }
  });
  res.json(usuario);
});

module.exports = router;
