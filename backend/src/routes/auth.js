const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatórios' });

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Credenciais inválidas' });

  const senhaOk = await bcrypt.compare(senha, usuario.senha);
  if (!senhaOk) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel } });
});

router.get('/me', authMiddleware, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { id: true, nome: true, email: true, nivel: true }
  });
  res.json(usuario);
});

module.exports = router;
