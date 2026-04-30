const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function calcularStatus(h, empresa) {
  // Se é pró-labore enviado como sem movimento este mês
  if (empresa.temProLabore && !empresa.temFuncionarios && h.semMovimentoMes) {
    return h.semMovimentoOk ? 'FINALIZADO' : 'NAO_INICIADO';
  }
  const campos = [];
  if (empresa.temFuncionarios) campos.push('folhaOk', 'inssOk', 'fgtsOk', 'irOk');
  else if (empresa.temProLabore) campos.push('proLaboreOk', 'inssOk', 'fgtsOk');
  else if (empresa.semMovimento) campos.push('semMovimentoOk');
  const total = campos.length;
  if (total === 0) return 'NAO_INICIADO';
  const feitos = campos.filter(c => h[c]).length;
  if (feitos === 0) return 'NAO_INICIADO';
  if (feitos === total) return 'FINALIZADO';
  return 'PARCIAL';
}

const CAMPOS_HISTORICO = [
  'folhaOk','inssOk','fgtsOk','irOk','proLaboreOk','semMovimentoOk','semMovimentoMes',
  'valorInss','valorFgts','valorIr','dataEntregaFolha','dataEntregaObrig'
];

function filtrarCampos(dados) {
  const resultado = {};
  for (const [k, v] of Object.entries(dados)) {
    if (!CAMPOS_HISTORICO.includes(k)) continue;
    if (k === 'dataEntregaFolha' || k === 'dataEntregaObrig') {
      if (!v || v === '') resultado[k] = null;
      else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) resultado[k] = new Date(v + 'T00:00:00.000Z');
      else resultado[k] = new Date(v);
    } else {
      resultado[k] = v;
    }
  }
  return resultado;
}

router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { status, responsavelId } = req.query;
    const whereEmpresa = { ativa: true };
    if (req.user.nivel === 'OPERADOR') whereEmpresa.responsavelId = req.user.id;
    else if (responsavelId) whereEmpresa.responsavelId = responsavelId;

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      include: {
        responsavel: { select: { id: true, nome: true } },
        historicos: { where: { competencia } },
        filiais: true,
      },
      orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
    });

    const resultado = empresas.map(emp => {
      let historico = emp.historicos[0];
      if (!historico) {
        historico = {
          id: null, competencia, status: 'NAO_INICIADO',
          folhaOk: false, inssOk: false, fgtsOk: false, irOk: false,
          proLaboreOk: false, semMovimentoOk: false, semMovimentoMes: false,
          valorInss: null, valorFgts: null, valorIr: null,
          dataEntregaFolha: null, dataEntregaObrig: null,
        };
      }
      return { ...emp, historicos: undefined, historico };
    });

    const filtrado = status ? resultado.filter(e => e.historico.status === status) : resultado;
    res.json(filtrado);
  } catch (e) {
    console.error('GET /:competencia erro:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/:competencia/:empresaId', async (req, res) => {
  try {
    const { competencia, empresaId } = req.params;
    const historico = await prisma.historicoMensal.findUnique({
      where: { empresaId_competencia: { empresaId, competencia } },
      include: { filiais: { include: { filial: true } }, tarefasOk: true }
    });
    if (!historico) {
      return res.json({
        id: null, empresaId, competencia, status: 'NAO_INICIADO',
        folhaOk: false, inssOk: false, fgtsOk: false, irOk: false,
        proLaboreOk: false, semMovimentoOk: false, semMovimentoMes: false,
        valorInss: null, valorFgts: null, valorIr: null,
        dataEntregaFolha: null, dataEntregaObrig: null,
        filiais: [], tarefasOk: []
      });
    }
    res.json(historico);
  } catch (e) {
    console.error('GET /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/:competencia/:empresaId', async (req, res) => {
  try {
    const { competencia, empresaId } = req.params;
    const dados = req.body;
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { filiaisData, tarefasOk, tarefasExtrasOk, ...resto } = dados;
    const dadosPrincipais = filtrarCampos(resto);
    const statusCalculado = calcularStatus(dadosPrincipais, empresa);

    const historico = await prisma.historicoMensal.upsert({
      where: { empresaId_competencia: { empresaId, competencia } },
      create: { empresaId, competencia, ...dadosPrincipais, status: statusCalculado, responsavelId: req.user.id },
      update: { ...dadosPrincipais, status: statusCalculado, responsavelId: req.user.id },
      include: { filiais: true, tarefasOk: true }
    });

    if (tarefasExtrasOk?.length) {
      for (const t of tarefasExtrasOk) {
        await prisma.tarefaExtraOk.upsert({
          where: { tarefaId_historicoId: { tarefaId: t.tarefaId, historicoId: historico.id } },
          create: { tarefaId: t.tarefaId, historicoId: historico.id, ok: t.ok },
          update: { ok: t.ok }
        });
      }
    }

    if (filiaisData?.length) {
      for (const filial of filiaisData) {
        await prisma.historicoFilial.upsert({
          where: { filialId_historicoId: { filialId: filial.filialId, historicoId: historico.id } },
          create: { filialId: filial.filialId, historicoId: historico.id, ...filial.valores },
          update: { ...filial.valores }
        });
      }
    }

    res.json(historico);
  } catch (e) {
    console.error('POST /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/historico/:empresaId', async (req, res) => {
  try {
    const historicos = await prisma.historicoMensal.findMany({
      where: { empresaId: req.params.empresaId },
      include: { filiais: { include: { filial: true } }, responsavel: { select: { nome: true } }, tarefasOk: true },
      orderBy: { competencia: 'desc' }
    });
    res.json(historicos);
  } catch (e) {
    console.error('GET /historico/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
