const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const feriados = await prisma.feriado.findMany({
      where: { escritorioId: req.user.escritorioId },
      orderBy: [{ mes: 'asc' }, { dia: 'asc' }]
    });
    res.json(feriados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos podem criar
router.post('/', async (req, res) => {
  try {
    const { nome, dia, mes, cidade, estado } = req.body;
    if (!nome || !dia || !mes) {
      return res.status(400).json({ error: 'Nome, dia e mês são obrigatórios' });
    }
    const feriado = await prisma.feriado.create({
      data: {
        nome, dia: Number(dia), mes: Number(mes),
        cidade: cidade?.trim() || null,
        estado: estado?.trim()?.toUpperCase() || null,
        escritorioId: req.user.escritorioId
      }
    });
    res.status(201).json(feriado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos podem editar
router.put('/:id', async (req, res) => {
  try {
    const { nome, dia, mes, cidade, estado } = req.body;
    const feriado = await prisma.feriado.update({
      where: { id: req.params.id },
      data: {
        nome, dia: Number(dia), mes: Number(mes),
        cidade: cidade?.trim() || null,
        estado: estado?.trim()?.toUpperCase() || null,
      }
    });
    res.json(feriado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos podem excluir
router.delete('/:id', async (req, res) => {
  try {
    await prisma.feriado.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/calcular', async (req, res) => {
  try {
    const { empresaId, competencia, nDiaUtil } = req.query;
    if (!competencia || !nDiaUtil) {
      return res.status(400).json({ error: 'competencia e nDiaUtil são obrigatórios' });
    }
    const [ano, mes] = competencia.split('-').map(Number);
    const n = Number(nDiaUtil);
    let cidade = null, estado = null;
    if (empresaId) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { cidade: true, estado: true }
      });
      cidade = empresa?.cidade || null;
      estado = empresa?.estado || null;
    }
    const feriadosMunicipais = await prisma.feriado.findMany({
      where: { escritorioId: req.user.escritorioId }
    });
    const { calcularNesimoDiaUtil } = require('../utils/diasUteis');
    const diaCalculado = calcularNesimoDiaUtil(ano, mes, n, feriadosMunicipais, cidade, estado);
    res.json({ diaCalculado, cidade, estado, nDiaUtil: n, competencia });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
