const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Busca tarefas de uma empresa para uma competência
router.get('/:empresaId/:competencia', async (req, res) => {
  const { empresaId, competencia } = req.params;
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

  // Tarefas próprias da empresa (recorrentes sempre, pontuais só do mês)
  const tarefasEmpresa = await prisma.tarefaExtra.findMany({
    where: {
      empresaId,
      ativa: true,
      global: false,
      OR: [
        { tipo: 'RECORRENTE' },
        { tipo: 'PONTUAL', competenciaCriacao: competencia }
      ]
    },
    orderBy: { diaVencimento: 'asc' }
  });

  // Tarefas globais aplicáveis
  const tarefasGlobais = await prisma.tarefaExtra.findMany({
    where: {
      ativa: true,
      global: true,
      OR: [
        { tipo: 'RECORRENTE' },
        { tipo: 'PONTUAL', competenciaCriacao: competencia }
      ],
      AND: [{
        OR: [
          { paraTodas: true },
          { paraFuncionarios: empresa.temFuncionarios ? true : undefined },
          { paraProLabore: empresa.temProLabore ? true : undefined },
          { paraSemMovimento: empresa.semMovimento ? true : undefined },
        ]
      }]
    },
    orderBy: { diaVencimento: 'asc' }
  });

  res.json([...tarefasGlobais, ...tarefasEmpresa]);
});

// Busca tarefas globais
router.get('/globais/listar', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const tarefas = await prisma.tarefaExtra.findMany({
    where: { global: true, ativa: true },
    orderBy: [{ tipo: 'asc' }, { diaVencimento: 'asc' }]
  });
  res.json(tarefas);
});

// Cria tarefa para empresa específica
router.post('/:empresaId', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { nome, tipo, diaVencimento, competencia } = req.body;
  const tarefa = await prisma.tarefaExtra.create({
    data: {
      empresaId: req.params.empresaId,
      nome,
      tipo: tipo || 'RECORRENTE',
      diaVencimento: diaVencimento ? Number(diaVencimento) : null,
      global: false,
      competenciaCriacao: tipo === 'PONTUAL' ? competencia : null
    }
  });
  res.status(201).json(tarefa);
});

// Cria tarefa global
router.post('/globais/criar', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { nome, tipo, diaVencimento, paraTodas, paraFuncionarios, paraProLabore, paraSemMovimento, competencia } = req.body;
  const tarefa = await prisma.tarefaExtra.create({
    data: {
      nome,
      tipo: tipo || 'RECORRENTE',
      diaVencimento: diaVencimento ? Number(diaVencimento) : null,
      global: true,
      paraTodas: paraTodas || false,
      paraFuncionarios: paraFuncionarios || false,
      paraProLabore: paraProLabore || false,
      paraSemMovimento: paraSemMovimento || false,
      competenciaCriacao: tipo === 'PONTUAL' ? competencia : null
    }
  });
  res.status(201).json(tarefa);
});

// Remove tarefa
router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  await prisma.tarefaExtra.update({
    where: { id: req.params.id },
    data: { ativa: false }
  });
  res.json({ ok: true });
});

module.exports = router;
