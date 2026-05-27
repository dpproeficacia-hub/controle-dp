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
        matriz: { select: { id: true, razaoSocial: true } },
        filiaisVinculadas: { select: { id: true, razaoSocial: true } },
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
        matriz: { select: { id: true, razaoSocial: true } },
        filiaisVinculadas: { select: { id: true, razaoSocial: true } },
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
            fatorR, enviaReinf, observacoes, responsavelId,
            matrizId, filiaisIds } = req.body;
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
        matrizId: matrizId || null,
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true, filiais: true,
        matriz: { select: { id: true, razaoSocial: true } },
        filiaisVinculadas: { select: { id: true, razaoSocial: true } },
      }
    });

    // Vincula as filiais selecionadas a esta empresa como matriz
    if (Array.isArray(filiaisIds) && filiaisIds.length > 0) {
      await prisma.empresa.updateMany({
        where: { id: { in: filiaisIds } },
        data: { matrizId: empresa.id, temFilial: false }
      });
    }

    res.status(201).json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { sindical, filiais, filiaisIds, ...dados } = req.body;
    if (dados.cnpj) dados.cnpj = dados.cnpj.replace(/\D/g, '');
    if (dados.prazoEntrega === '' || dados.prazoEntrega === null || dados.prazoEntrega === undefined) {
      dados.prazoEntrega = null;
    } else {
      dados.prazoEntrega = Number(dados.prazoEntrega) || null;
    }
    if (dados.responsavelId === '') dados.responsavelId = null;
    if (dados.matrizId === '') dados.matrizId = null;

    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: dados,
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true, filiais: true,
        matriz: { select: { id: true, razaoSocial: true } },
        filiaisVinculadas: { select: { id: true, razaoSocial: true } },
      }
    });

    // Atualiza filiais vinculadas: desvincula as que saíram, vincula as novas
    if (Array.isArray(filiaisIds)) {
      // Remove vínculo das que não estão mais na lista
      await prisma.empresa.updateMany({
        where: { matrizId: req.params.id, id: { notIn: filiaisIds } },
        data: { matrizId: null }
      });
      // Vincula as selecionadas
      if (filiaisIds.length > 0) {
        await prisma.empresa.updateMany({
          where: { id: { in: filiaisIds } },
          data: { matrizId: req.params.id, temFilial: false }
        });
      }
    }

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

router.delete('/:id', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
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

router.post('/excluir-lote', requireNivel('GESTOR', 'ADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhuma empresa selecionada.' });
    }
    await prisma.empresa.updateMany({
      where: { id: { in: ids } },
      data: { ativa: false }
    });
    res.json({ ok: true, total: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
