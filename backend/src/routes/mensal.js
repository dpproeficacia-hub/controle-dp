const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Status calculado 100% pelas tarefas
async function calcularStatus(historicoId, empresaId) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { temFuncionarios: true, temProLabore: true, semMovimento: true }
  });

  // Busca tarefas aplicáveis à empresa
  const tarefas = await prisma.tarefaExtra.findMany({
    where: {
      ativa: true,
      global: true,
      OR: [
        { paraTodas: true },
        { paraFuncionarios: empresa.temFuncionarios ? true : undefined },
        { paraProLabore: empresa.temProLabore ? true : undefined },
        { paraSemMovimento: empresa.semMovimento ? true : undefined },
      ]
    }
  });

  const tarefasFiltradas = tarefas.filter(t => {
    if (t.paraTodas) return true;
    if (t.paraFuncionarios && empresa.temFuncionarios) return true;
    if (t.paraProLabore && empresa.temProLabore) return true;
    if (t.paraSemMovimento && empresa.semMovimento) return true;
    return false;
  });

  // Tarefas específicas da empresa
  const tarefasEmpresa = await prisma.tarefaExtra.findMany({
    where: { empresaId, ativa: true, global: false }
  });

  const todasTarefas = [...tarefasFiltradas, ...tarefasEmpresa];
  const total = todasTarefas.length;
  if (total === 0) return 'NAO_INICIADO';

  // Busca quais estão ok
  const tarefasOk = await prisma.tarefaExtraOk.findMany({
    where: { historicoId, ok: true }
  });

  const feitos = tarefasOk.length;
  if (feitos === 0) return 'NAO_INICIADO';
  if (feitos >= total) return 'FINALIZADO';
  return 'PARCIAL';
}

function parseDatas(dados) {
  const resultado = {};
  const camposData = ['dataEntregaFolha', 'dataEntregaObrig'];
  const camposPermitidos = ['semMovimentoMes', 'dataEntregaFolha', 'dataEntregaObrig', 'valorInss', 'valorFgts', 'valorIr'];

  for (const [k, v] of Object.entries(dados)) {
    if (!camposPermitidos.includes(k)) continue;
    if (camposData.includes(k)) {
      if (!v || v === '') resultado[k] = null;
      else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) resultado[k] = new Date(v + 'T00:00:00.000Z');
      else resultado[k] = new Date(v);
    } else {
      resultado[k] = v;
    }
  }
  return resultado;
}

// Listar controle mensal por competência
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
        historicos: {
          where: { competencia },
          include: { tarefasOk: true }
        },
        filiais: true,
      },
      orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
    });

    // Busca todas as tarefas globais de uma vez
    const tarefasGlobais = await prisma.tarefaExtra.findMany({
      where: { ativa: true, global: true }
    });

    const resultado = empresas.map(emp => {
      const historico = emp.historicos[0] || null;
      const tarefasOk = historico?.tarefasOk || [];

      // Filtra tarefas aplicáveis
      const tarefasAplicaveis = tarefasGlobais.filter(t => {
        if (t.paraTodas) return true;
        if (t.paraFuncionarios && emp.temFuncionarios) return true;
        if (t.paraProLabore && emp.temProLabore) return true;
        if (t.paraSemMovimento && emp.semMovimento) return true;
        return false;
      });

      const total = tarefasAplicaveis.length;
      const feitos = tarefasOk.filter(t => t.ok).length;

      let statusCalc = 'NAO_INICIADO';
      if (total > 0 && feitos >= total) statusCalc = 'FINALIZADO';
      else if (feitos > 0) statusCalc = 'PARCIAL';

      return {
        ...emp,
        historicos: undefined,
        historico: historico ? { ...historico, status: statusCalc } : {
          id: null, competencia, status: 'NAO_INICIADO',
          semMovimentoMes: false, valorInss: null, valorFgts: null, valorIr: null,
          dataEntregaFolha: null, dataEntregaObrig: null, tarefasOk: []
        },
        _totalTarefas: total,
        _feitosTarefas: feitos,
      };
    });

    const filtrado = status ? resultado.filter(e => e.historico.status === status) : resultado;
    res.json(filtrado);
  } catch (e) {
    console.error('GET /:competencia erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Buscar histórico de uma empresa
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
        semMovimentoMes: false, valorInss: null, valorFgts: null, valorIr: null,
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

// Salvar histórico
router.post('/:competencia/:empresaId', async (req, res) => {
  try {
    const { competencia, empresaId } = req.params;
    const dados = req.body;

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { filiaisData, tarefasOk, tarefasExtrasOk, ...resto } = dados;
    const dadosPrincipais = parseDatas(resto);

    // Cria/atualiza o histórico primeiro com status provisório
    const historico = await prisma.historicoMensal.upsert({
      where: { empresaId_competencia: { empresaId, competencia } },
      create: {
        empresaId, competencia,
        ...dadosPrincipais,
        status: 'NAO_INICIADO',
        responsavelId: req.user.id,
      },
      update: {
        ...dadosPrincipais,
        responsavelId: req.user.id,
      },
      include: { filiais: true, tarefasOk: true }
    });

    // Salva tarefas
    if (tarefasExtrasOk?.length) {
      for (const t of tarefasExtrasOk) {
        await prisma.tarefaExtraOk.upsert({
          where: { tarefaId_historicoId: { tarefaId: t.tarefaId, historicoId: historico.id } },
          create: { tarefaId: t.tarefaId, historicoId: historico.id, ok: t.ok },
          update: { ok: t.ok }
        });
      }
    }

    // Recalcula status baseado nas tarefas
    const statusCalculado = await calcularStatus(historico.id, empresaId);
    const historicoFinal = await prisma.historicoMensal.update({
      where: { id: historico.id },
      data: { status: statusCalculado },
      include: { filiais: true, tarefasOk: true }
    });

    if (filiaisData?.length) {
      for (const filial of filiaisData) {
        await prisma.historicoFilial.upsert({
          where: { filialId_historicoId: { filialId: filial.filialId, historicoId: historico.id } },
          create: { filialId: filial.filialId, historicoId: historico.id, ...filial.valores },
          update: { ...filial.valores }
        });
      }
    }

    res.json(historicoFinal);
  } catch (e) {
    console.error('POST /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Histórico completo de uma empresa
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
