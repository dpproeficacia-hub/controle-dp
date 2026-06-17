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
    const where = { ativa: true, escritorioId: req.user.escritorioId };

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
        sindical: true, filiais: true,
        matriz: { select: { id: true, razaoSocial: true } },
        filiaisVinculadas: { select: { id: true, razaoSocial: true } },
      },
      orderBy: [{ razaoSocial: 'asc' }]
    });
    res.json(empresas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findFirst({
      where: { id: req.params.id, escritorioId: req.user.escritorioId },
      include: {
        responsavel: { select: { id: true, nome: true } },
        sindical: true, filiais: true,
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

// Todos os níveis podem criar empresas
router.post('/', async (req, res) => {
  try {
    const {
      razaoSocial, cnpj, tipoDocumento, enquadramento, tipo, nivel, prazoEntrega,
      cidade, estado, competenciaInicial,
      temFuncionarios, temProLabore, semMovimento, temFilial, fatorR, enviaReinf,
      observacoes, responsavelId, matrizId, filiaisIds, participaTarefas
    } = req.body;
    const docLimpo = cnpj ? cnpj.replace(/\D/g, '') : '';
    const prazo = !prazoEntrega ? null : Number(prazoEntrega) || null;
    const empresa = await prisma.empresa.create({
      data: {
        escritorioId: req.user.escritorioId,
        razaoSocial, cnpj: docLimpo,
        tipoDocumento: tipoDocumento || 'CNPJ',
        enquadramento, tipo, nivel: nivel || 'N3', prazoEntrega: prazo,
        cidade: cidade?.trim() || null,
        estado: estado?.trim()?.toUpperCase() || null,
        competenciaInicial: competenciaInicial || null,
        temFuncionarios: temFuncionarios || false,
        temProLabore: temProLabore || false,
        semMovimento: semMovimento || false,
        temFilial: temFilial || false,
        fatorR: fatorR || false,
        enviaReinf: enviaReinf || false,
        participaTarefas: participaTarefas !== undefined ? participaTarefas : false,
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
    if (Array.isArray(filiaisIds) && filiaisIds.length > 0) {
      await prisma.empresa.updateMany({
        where: { id: { in: filiaisIds }, escritorioId: req.user.escritorioId },
        data: { matrizId: empresa.id }
      });
    }
    res.status(201).json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos os níveis podem editar empresas
router.put('/:id', async (req, res) => {
  try {
    const { sindical, filiais, filiaisIds, ...dados } = req.body;
    if (dados.cnpj) dados.cnpj = dados.cnpj.replace(/\D/g, '');
    dados.prazoEntrega = !dados.prazoEntrega ? null : Number(dados.prazoEntrega) || null;
    if (dados.responsavelId === '') dados.responsavelId = null;
    if (dados.matrizId === '') dados.matrizId = null;
    if (dados.cidade !== undefined) dados.cidade = dados.cidade?.trim() || null;
    if (dados.estado !== undefined) dados.estado = dados.estado?.trim()?.toUpperCase() || null;
    if (dados.competenciaInicial === '') dados.competenciaInicial = null;
    delete dados.escritorioId;
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
    if (Array.isArray(filiaisIds)) {
      await prisma.empresa.updateMany({
        where: { matrizId: req.params.id, id: { notIn: filiaisIds }, escritorioId: req.user.escritorioId },
        data: { matrizId: null }
      });
      if (filiaisIds.length > 0) {
        await prisma.empresa.updateMany({
          where: { id: { in: filiaisIds }, escritorioId: req.user.escritorioId },
          data: { matrizId: req.params.id }
        });
      }
    }
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todos os níveis podem editar em lote
router.post('/editar-lote', async (req, res) => {
  try {
    const { ids, campos } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhuma empresa selecionada.' });
    }
    const camposPermitidos = [
      'temFuncionarios', 'temProLabore', 'semMovimento', 'enviaReinf',
      'fatorR', 'participaTarefas', 'nivel', 'tipo', 'enquadramento',
      'responsavelId', 'prazoEntrega', 'cidade', 'estado', 'competenciaInicial'
    ];
    const dadosLimpos = {};
    for (const [k, v] of Object.entries(campos)) {
      if (camposPermitidos.includes(k)) dadosLimpos[k] = v;
    }
    if (Object.keys(dadosLimpos).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para editar.' });
    }
    await prisma.empresa.updateMany({
      where: { id: { in: ids }, escritorioId: req.user.escritorioId },
      data: dadosLimpos
    });
    res.json({ ok: true, total: ids.length });
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
      where: { id: { in: ids }, escritorioId: req.user.escritorioId },
      data: { ativa: false }
    });
    res.json({ ok: true, total: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
