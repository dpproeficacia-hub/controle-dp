const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Listar empresas (operador vê só as suas, gestor/admin vê todas)
router.get('/', async (req, res) => {
  const { responsavelId, nivel, tipo, semMovimento, temFuncionarios, temProLabore, enviaReinf, fatorR } = req.query;

  const where = { ativa: true };

  if (req.user.nivel === 'OPERADOR') {
    where.responsavelId = req.user.id;
  } else if (responsavelId) {
    where.responsavelId = responsavelId;
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
});

// Buscar empresa por id
router.get('/:id', async (req, res) => {
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
});

// Criar empresa
router.post('/', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const {
    razaoSocial, cnpj, enquadramento, tipo, nivel, prazoEntrega,
    temFuncionarios, temProLabore, semMovimento, temFilial,
    fatorR, enviaReinf, observacoes, responsavelId, sindical, filiais
  } = req.body;

  const cnpjLimpo = cnpj.replace(/\D/g, '');

  const empresa = await prisma.empresa.create({
    data: {
      razaoSocial, cnpj: cnpjLimpo, enquadramento, tipo,
      nivel: nivel || 'N3',
      prazoEntrega, temFuncionarios, temProLabore, semMovimento,
      temFilial, fatorR, enviaReinf, observacoes, responsavelId,
      sindical: sindical ? { create: sindical } : undefined,
      filiais: filiais?.length ? { create: filiais } : undefined,
    },
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true }
  });

  res.status(201).json(empresa);
});

// Atualizar empresa
router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { sindical, filiais, ...dados } = req.body;
  if (dados.cnpj) dados.cnpj = dados.cnpj.replace(/\D/g, '');

  const empresa = await prisma.empresa.update({
    where: { id: req.params.id },
    data: dados,
    include: { responsavel: { select: { id: true, nome: true } }, sindical: true, filiais: true }
  });

  res.json(empresa);
});

// Inativar empresa
router.delete('/:id', requireNivel('ADMIN'), async (req, res) => {
  await prisma.empresa.update({ where: { id: req.params.id }, data: { ativa: false } });
  res.json({ ok: true });
});

module.exports = router;
