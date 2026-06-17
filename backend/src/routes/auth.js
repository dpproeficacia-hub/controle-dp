const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Cadastro de novo escritório + admin
router.post('/cadastro', async (req, res) => {
  try {
    const { nomeEscritorio, nome, email, senha } = req.body;
    if (!nomeEscritorio || !nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    const escritorio = await prisma.escritorio.create({
      data: {
        nome: nomeEscritorio,
        usuarios: {
          create: { nome, email, senha: senhaHash, nivel: 'ADMIN' }
        }
      },
      include: { usuarios: true }
    });
    const usuario = escritorio.usuarios[0];
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel, escritorioId: escritorio.id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.status(201).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel, escritorioId: escritorio.id },
      escritorio: { id: escritorio.id, nome: escritorio.nome }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatórios' });
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { escritorio: true }
    });
    if (!usuario || !usuario.ativo || !usuario.escritorio.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const senhaOk = await bcrypt.compare(senha, usuario.senha);
    if (!senhaOk) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel, escritorioId: usuario.escritorioId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel: usuario.nivel, escritorioId: usuario.escritorioId },
      escritorio: { id: usuario.escritorio.id, nome: usuario.escritorio.nome }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, nivel: true, escritorioId: true, escritorio: { select: { id: true, nome: true } } }
    });
    res.json(usuario);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Usuário logado troca a própria senha (precisa informar a senha atual)
router.put('/alterar-senha', authMiddleware, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.id } });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const senhaOk = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaOk) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const novoHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({ where: { id: req.user.id }, data: { senha: novoHash } });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Solicitar código de recuperação
router.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.ativo) return res.json({ ok: true });
    await prisma.resetSenha.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true }
    });
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.resetSenha.create({ data: { usuarioId: usuario.id, codigo, expiraEm } });
    res.json({ ok: true, codigo, nome: usuario.nome, expiraEm });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Validar código
router.post('/validar-codigo', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: 'Dados incompletos' });
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(400).json({ error: 'Código inválido ou expirado' });
    const reset = await prisma.resetSenha.findFirst({
      where: { usuarioId: usuario.id, codigo, usado: false, expiraEm: { gt: new Date() } },
      orderBy: { criadoEm: 'desc' }
    });
    if (!reset) return res.status(400).json({ error: 'Código inválido ou expirado' });
    res.json({ ok: true, resetId: reset.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Nova senha
router.post('/nova-senha', async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;
    if (!email || !codigo || !novaSenha) return res.status(400).json({ error: 'Dados incompletos' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(400).json({ error: 'Código inválido ou expirado' });
    const reset = await prisma.resetSenha.findFirst({
      where: { usuarioId: usuario.id, codigo, usado: false, expiraEm: { gt: new Date() } },
      orderBy: { criadoEm: 'desc' }
    });
    if (!reset) return res.status(400).json({ error: 'Código inválido ou expirado' });
    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { senha: hash } });
    await prisma.resetSenha.update({ where: { id: reset.id }, data: { usado: true } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
