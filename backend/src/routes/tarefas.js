const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/:empresaId', async (req, res) => {
  const tarefas = await prisma.tarefaExtra.findMany({
    where: { empresaId: req.params.empresaId, ativa: true },
    orderBy: { criadoEm: 'asc' }
  });
  res.json(tarefas);
});

router.post('/:empresaId', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { nome } = req.body;
  const tarefa = await prisma.tarefaExtra.create({
    data: { empresaId: req.params.empresaId, nome }
  });
  res.status(201).json(tarefa);
});

router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  await prisma.tarefaExtra.update({
    where: { id: req.params.id },
    data: { ativa: false }
  });
  res.json({ ok: true });
});

module.exports = router;
