const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Busca tarefas de uma empresa (próprias + globais aplicáveis)
router.get('/:empresaId', async (req, res) => {
  const empresa = await prisma.empresa.findUnique({ where: { id: req.params.empresaId } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

  const tarefasEmpresa = await prisma.tarefaExtra.findMany({
    where: { empresaId: req.params.empresaId, ativa: true, global: false },
    orderBy: { criadoEm: 'asc' }
  });

  const tarefasGlobais = await prisma.tarefaExtra.findMany({
    where: {
      ativa: true,
      global: true,
      OR: [
        { paraFuncionarios: true, AND: [{ paraFuncionarios: empresa.temFuncionarios }] },
        { paraProLabore: true, AND: [{ paraProLabore: empresa.temProLabore }] },
        { paraSemMovimento: true, AND: [{ paraSemMovimento: empresa.semMovimento }] },
        { paraTodas: true },
      ]
    },
    orderBy: { criadoEm: 'asc' }
  });

  res.json([...tarefasGlobais, ...tarefasEmpresa]);
});

// Lista todas as tarefas globais (para tela de gestão)
router.get('/globais/listar', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const tarefas = await prisma.tarefaExtra.findMany({
    where: { global: true, ativa: true },
    orderBy: { criadoEm: 'asc' }
  });
  res.json(tarefas);
});

// Cria tarefa para uma empresa específica
router.post('/:empresaId', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { nome } = req.body;
  const tarefa = await prisma.tarefaExtra.create({
    data: { empresaId: req.params.empresaId, nome, global: false }
  });
  res.status(201).json(tarefa);
});

// Cria tarefa global
router.post('/globais/criar', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { nome, paraTodas, paraFuncionarios, paraProLabore, paraSemMovimento } = req.body;
  const tarefa = await prisma.tarefaExtra.create({
    data: {
      nome, global: true,
      empresaId: null,
      paraTodas: paraTodas || false,
      paraFuncionarios: paraFuncionarios || false,
      paraProLabore: paraProLabore || false,
      paraSemMovimento: paraSemMovimento || false,
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
