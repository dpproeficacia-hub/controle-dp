const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireNivel } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/config', async (req, res) => {
  try {
    const escritorio = await prisma.escritorio.findUnique({
      where: { id: req.user.escritorioId },
      select: { id: true, nome: true, corPrimaria: true, logo: true, whatsapp: true, emailContato: true }
    });
    res.json(escritorio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/config', requireNivel('ADMIN'), async (req, res) => {
  try {
    const { nome, corPrimaria, logo, whatsapp, emailContato } = req.body;
    const escritorio = await prisma.escritorio.update({
      where: { id: req.user.escritorioId },
      data: {
        nome:         nome         || undefined,
        corPrimaria:  corPrimaria  || undefined,
        logo:         logo         !== undefined ? logo : undefined,
        whatsapp:     whatsapp     !== undefined ? whatsapp : undefined,
        emailContato: emailContato !== undefined ? emailContato : undefined,
      },
      select: { id: true, nome: true, corPrimaria: true, logo: true, whatsapp: true, emailContato: true }
    });
    res.json(escritorio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
