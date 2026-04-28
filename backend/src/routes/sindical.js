const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

// Listar controles sindicais
router.get('/', async (req, res) => {
  const anoAtual = new Date().getFullYear();
  const registros = await prisma.controleSindical.findMany({
    include: { empresa: { select: { id: true, razaoSocial: true, responsavelId: true } } },
    orderBy: { ultimaCct: 'asc' }
  });
  const comStatus = registros.map(r => ({
    ...r, cctAtualizada: r.ultimaCct >= anoAtual
  }));
  res.json(comStatus);
});

// Atualizar sindical
router.put('/:empresaId', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  const { sindicato, dataBase, ultimaCct, reajusteAplicado } = req.body;
  const sindical = await prisma.controleSindical.upsert({
    where: { empresaId: req.params.empresaId },
    create: { empresaId: req.params.empresaId, sindicato, dataBase, ultimaCct, reajusteAplicado },
    update: { sindicato, dataBase, ultimaCct, reajusteAplicado }
  });
  res.json(sindical);
});

module.exports = router;
