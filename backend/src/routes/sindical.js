const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const anoAtual = new Date().getFullYear();
  const registros = await prisma.controleSindical.findMany({
    include: { empresa: { select: { id: true, razaoSocial: true, responsavelId: true } } },
    orderBy: { ultimaCct: 'asc' }
  });
  res.json(registros.map(r => ({ ...r, cctAtualizada: r.ultimaCct >= anoAtual })));
});

router.get('/:empresaId', async (req, res) => {
  const r = await prisma.controleSindical.findUnique({
    where: { empresaId: req.params.empresaId },
    include: { empresa: { select: { id: true, razaoSocial: true } } }
  });
  if (!r) return res.status(404).json({ error: 'Não encontrado' });
  res.json(r);
});

router.put('/:empresaId', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { sindicato, dataBase, ultimaCct, reajusteAplicado, observacoes } = req.body;
  const sindical = await prisma.controleSindical.upsert({
    where: { empresaId: req.params.empresaId },
    create: { empresaId: req.params.empresaId, sindicato, dataBase, ultimaCct, reajusteAplicado, observacoes },
    update: { sindicato, dataBase, ultimaCct, reajusteAplicado, observacoes }
  });
  res.json(sindical);
});

module.exports = router;
