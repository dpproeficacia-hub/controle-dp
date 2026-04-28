const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Calcula status automaticamente
function calcularStatus(h, empresa) {
  const campos = [];
  if (empresa.temFuncionarios) campos.push('folhaOk', 'inssOk', 'fgtsOk', 'irOk');
  else if (empresa.temProLabore) campos.push('proLaboreOk', 'inssOk', 'fgtsOk');
  else if (empresa.semMovimento) campos.push('semMovimentoOk');

  const total = campos.length;
  const feitos = campos.filter(c => h[c]).length;

  if (feitos === 0) return 'NAO_INICIADO';
  if (feitos === total) return 'FINALIZADO';
  return 'PARCIAL';
}

// Listar controle mensal por competência
router.get('/:competencia', async (req, res) => {
  const { competencia } = req.params; // ex: "2026-04"
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
      // retorna estrutura vazia (não iniciado)
      historico = {
        id: null, competencia, status: 'NAO_INICIADO',
        folhaOk: false, inssOk: false, fgtsOk: false, irOk: false,
        proLaboreOk: false, semMovimentoOk: false,
        valorInss: null, valorFgts: null, valorIr: null,
        dataEntregaFolha: null, dataEntregaObrig: null,
      };
    }
    return { ...emp, historicos: undefined, historico };
  });

  const filtrado = status
    ? resultado.filter(e => e.historico.status === status)
    : resultado;

  res.json(filtrado);
});

// Buscar/criar histórico de uma empresa para uma competência
router.get('/:competencia/:empresaId', async (req, res) => {
  const { competencia, empresaId } = req.params;

  let historico = await prisma.historicoMensal.findUnique({
    where: { empresaId_competencia: { empresaId, competencia } },
    include: { filiais: { include: { filial: true } } }
  });

  if (!historico) {
    return res.json({
      id: null, empresaId, competencia, status: 'NAO_INICIADO',
      folhaOk: false, inssOk: false, fgtsOk: false, irOk: false,
      proLaboreOk: false, semMovimentoOk: false,
      valorInss: null, valorFgts: null, valorIr: null,
      dataEntregaFolha: null, dataEntregaObrig: null,
      filiais: []
    });
  }

  res.json(historico);
});

// Salvar/atualizar histórico mensal
router.post('/:competencia/:empresaId', async (req, res) => {
  const { competencia, empresaId } = req.params;
  const dados = req.body;

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

  const { filiaisData, ...dadosPrincipais } = dados;

  const statusCalculado = calcularStatus(dadosPrincipais, empresa);

  const historico = await prisma.historicoMensal.upsert({
    where: { empresaId_competencia: { empresaId, competencia } },
    create: {
      empresaId, competencia,
      ...dadosPrincipais,
      status: statusCalculado,
      responsavelId: req.user.id,
    },
    update: {
      ...dadosPrincipais,
      status: statusCalculado,
      responsavelId: req.user.id,
    },
    include: { filiais: true }
  });

  // Atualizar filiais se houver
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
});

// Histórico completo de uma empresa (todos os meses)
router.get('/historico/:empresaId', async (req, res) => {
  const historicos = await prisma.historicoMensal.findMany({
    where: { empresaId: req.params.empresaId },
    include: { filiais: { include: { filial: true } }, responsavel: { select: { nome: true } } },
    orderBy: { competencia: 'desc' }
  });
  res.json(historicos);
});

module.exports = router;
