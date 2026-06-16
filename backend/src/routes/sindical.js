const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/sindicatos', async (req, res) => {
  try {
    const sindicatos = await prisma.sindicato.findMany({
      where: { ativo: true, escritorioId: req.user.escritorioId },
      include: { controles: { select: { empresaId: true } } },
      orderBy: { nome: 'asc' }
    });
    res.json(sindicatos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos podem criar sindicatos
router.post('/sindicatos', async (req, res) => {
  try {
    const { nome, dataBase, observacoes, empresasIds } = req.body;
    const sindicato = await prisma.sindicato.create({
      data: { nome, dataBase, observacoes: observacoes || null, escritorioId: req.user.escritorioId }
    });
    if (Array.isArray(empresasIds) && empresasIds.length > 0) {
      for (const empresaId of empresasIds) {
        await prisma.controleSindical.upsert({
          where: { empresaId },
          create: { empresaId, sindicatoId: sindicato.id, ultimaCct: new Date().getFullYear(), reajusteAplicado: false },
          update: { sindicatoId: sindicato.id }
        });
      }
    }
    res.status(201).json(sindicato);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos podem editar sindicatos
router.put('/sindicatos/:id', async (req, res) => {
  try {
    const { nome, dataBase, observacoes, empresasIds } = req.body;
    const sindicato = await prisma.sindicato.update({
      where: { id: req.params.id },
      data: { nome, dataBase, observacoes: observacoes || null }
    });
    if (Array.isArray(empresasIds)) {
      await prisma.controleSindical.updateMany({
        where: { sindicatoId: req.params.id, empresaId: { notIn: empresasIds } },
        data: { sindicatoId: null }
      });
      for (const empresaId of empresasIds) {
        await prisma.controleSindical.upsert({
          where: { empresaId },
          create: { empresaId, sindicatoId: req.params.id, ultimaCct: new Date().getFullYear(), reajusteAplicado: false },
          update: { sindicatoId: req.params.id }
        });
      }
    }
    res.json(sindicato);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Só GESTOR/ADMIN podem excluir
router.delete('/sindicatos/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    await prisma.sindicato.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const controles = await prisma.controleSindical.findMany({
      include: {
        empresa: { select: { id: true, razaoSocial: true, temFuncionarios: true, escritorioId: true } },
        sindicato: true
      },
      orderBy: { empresa: { razaoSocial: 'asc' } }
    });
    const filtrados = controles.filter(c => c.empresa?.escritorioId === req.user.escritorioId);
    res.json(filtrados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:empresaId', async (req, res) => {
  try {
    const { sindicatoId, ultimaCct, reajusteAplicado } = req.body;

    const anterior = await prisma.controleSindical.findUnique({
      where: { empresaId: req.params.empresaId },
      include: { empresa: { select: { razaoSocial: true, escritorioId: true } }, sindicato: true }
    });

    const controle = await prisma.controleSindical.upsert({
      where: { empresaId: req.params.empresaId },
      create: {
        empresaId: req.params.empresaId,
        sindicatoId: sindicatoId || null,
        ultimaCct: Number(ultimaCct) || new Date().getFullYear(),
        reajusteAplicado: reajusteAplicado || false
      },
      update: {
        sindicatoId: sindicatoId || null,
        ultimaCct: Number(ultimaCct) || new Date().getFullYear(),
        reajusteAplicado: reajusteAplicado || false
      },
      include: { sindicato: true }
    });

    if (reajusteAplicado && (!anterior || !anterior.reajusteAplicado)) {
      const empresa = anterior?.empresa;
      const sindicatoNome = controle.sindicato?.nome || 'Sindicato';
      if (empresa) {
        const usuarios = await prisma.usuario.findMany({
          where: { escritorioId: empresa.escritorioId, ativo: true, id: { not: req.user.id } },
          select: { id: true }
        });
        for (const u of usuarios) {
          await prisma.notificacao.create({
            data: {
              usuarioId: u.id,
              tipo: 'REAJUSTE_APLICADO',
              titulo: 'Reajuste salarial aplicado',
              mensagem: `O reajuste do ${sindicatoNome} foi aplicado em ${empresa.razaoSocial}.`,
              lida: false
            }
          }).catch(() => {});
        }
      }
    }

    res.json(controle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
