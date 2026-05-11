const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { responsavelId, nivel, tipo, semMovimento, temFuncionarios,
            temProLabore, enviaReinf, fatorR, incluirSaiu } = req.query;
    const where = { ativa: true };
    if (req.user.nivel === 'OPERADOR') {
      where.responsavelId = req.user.id;
      where.saiuDoEscritorio = false;
    } else {
      if (!incluirSaiu || incluirSaiu === 'false') where.saiuDoEscritorio = false;
      if (responsavelId) where.responsavelId = responsavelId;
    }
    if (nivel) where.nivel = nivel;
    if (tipo) where.tipo = tipo;
    if (semMovimento !== undefined) where.semMovimento = semMovimento === 'true';
    if (temFuncionarios !== undefined) where.temFuncionarios = temFuncionarios === 'true';
    if (temProLabore !== undefined) where.temProLabore = temProLabore === 'true';
    if (enviaReinf !== undefined) where.enviaReinf = enviaReinf === 'true';
    if (fatorR !== undefined) where.fatorR = fatorR === 'true';
    const empresas = await prisma.empresa.findMany({
      where,
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true,
        filiais: true,
      },
      orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
    });
    res.json(empresas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.id },
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true,
        filiais: true,
      }
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { razaoSocial, cnpj, enquadramento, tipo, nivel, prazoEntrega,
            temFuncionarios, temProLabore, semMovimento, temFilial,
            fatorR, enviaReinf, observacoes, responsavelId } = req.body;
    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : '';
    const prazo = prazoEntrega === '' || prazoEntrega === null || prazoEntrega === undefined
      ? null : Number(prazoEntrega) || null;
    const empresa = await prisma.empresa.create({
      data: {
        razaoSocial, cnpj: cnpjLimpo, enquadramento, tipo,
        nivel: nivel || 'N3', prazoEntrega: prazo,
        temFuncionarios: temFuncionarios || false,
        temProLabore: temProLabore || false,
        semMovimento: semMovimento || false,
        temFilial: temFilial || false,
        fatorR: fatorR || false,
        enviaReinf: enviaReinf || false,
        observacoes: observacoes || null,
        responsavelId: responsavelId || null,
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true, filiais: true
      }
    });
    res.status(201).json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { sindical, filiais, ...dados } = req.body;
    if (dados.cnpj) dados.cnpj = dados.cnpj.replace(/\D/g, '');
    if (dados.prazoEntrega === '' || dados.prazoEntrega === null || dados.prazoEntrega === undefined) {
      dados.prazoEntrega = null;
    } else {
      dados.prazoEntrega = Number(dados.prazoEntrega) || null;
    }
    if (dados.responsavelId === '') dados.responsavelId = null;
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: dados,
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true, filiais: true
      }
    });
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/saiu', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { saiuDoEscritorio } = req.body;
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: { saiuDoEscritorio }
    });
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireNivel('ADMIN'), async (req, res) => {
  try {
    await prisma.empresa.update({
      where: { id: req.params.id },
      data: { ativa: false }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
