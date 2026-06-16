const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { status, responsavelId } = req.query;

    const whereEmpresa = {
      ativa: true,
      saiuDoEscritorio: false,
      escritorioId: req.user.escritorioId,
      participaTarefas: true
    };

    if (req.user.nivel === 'OPERADOR') whereEmpresa.responsavelId = req.user.id;
    else if (responsavelId) whereEmpresa.responsavelId = responsavelId;

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      select: {
        id: true, razaoSocial: true, cnpj: true, tipoDocumento: true,
        enquadramento: true, anexoSimples: true, tipo: true, nivel: true,
        prazoEntrega: true, temFuncionarios: true, temProLabore: true,
        semMovimento: true, fatorR: true, enviaReinf: true, participaTarefas: true,
        cidade: true, estado: true,
        responsavel: { select: { id: true, nome: true } },
        gruposTarefa: {
          where: { ativo: true },
          select: { id: true, diaVencimento: true, isDiaUtil: true, mesSubsequente: true }
        },
        historicos: {
          where: { competencia },
          select: {
            id: true, status: true,
            entregasGrupo: { select: { grupoId: true, entregue: true, dispensada: true } }
          }
        }
      },
      orderBy: [{ razaoSocial: 'asc' }]
    });

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    const anoHoje = hoje.getFullYear();

    // Feriados do escritório para cálculo de dias úteis
    const feriadosMunicipais = await prisma.feriado.findMany({
      where: { escritorioId: req.user.escritorioId }
    });

    const [anoComp, mesComp] = competencia.split('-').map(Number);

    const resultado = empresas.map(emp => {
      const historico = emp.historicos[0] || null;
      const totalGrupos = emp.gruposTarefa.length;
      const entregasGrupo = historico?.entregasGrupo || [];
      const concluidos = entregasGrupo.filter(eg => eg.entregue || eg.dispensada).length;

      const gruposConcluidosIds = new Set(
        entregasGrupo.filter(eg => eg.entregue || eg.dispensada).map(eg => eg.grupoId)
      );
      const gruposPendentes = emp.gruposTarefa.filter(g => !gruposConcluidosIds.has(g.id));

      // Calcula o prazo real de cada grupo considerando mesSubsequente
      const prazosReais = gruposPendentes.map(g => {
        let anoVenc = anoComp;
        let mesVenc = mesComp;

        if (g.mesSubsequente) {
          // Prazo no mês seguinte à competência
          mesVenc = mesComp + 1;
          if (mesVenc > 12) { mesVenc = 1; anoVenc++; }
        }

        // Converte para dia absoluto para comparar com hoje
        const dataVenc = new Date(anoVenc, mesVenc - 1, g.diaVencimento);
        const diasRestantesReais = Math.floor((dataVenc - new Date(anoHoje, mesHoje - 1, diaHoje)) / 86400000);
        return { ...g, diasRestantesReais, dataVenc };
      });

      // Bolinha baseada no prazo real
      const diaVencimentoMinimo = prazosReais.length > 0
        ? Math.min(...prazosReais.map(g => g.diasRestantesReais))
        : null;

      let bolinha = null;
      if (diaVencimentoMinimo !== null && concluidos < totalGrupos) {
        if (diaVencimentoMinimo < 0) bolinha = 'vermelho';
        else if (diaVencimentoMinimo <= 3) bolinha = 'laranja';
        else bolinha = 'azul';
      }

      let statusCalc = 'NAO_INICIADO';
      if (totalGrupos > 0 && concluidos >= totalGrupos) statusCalc = 'FINALIZADO';
      else if (concluidos > 0) statusCalc = 'PARCIAL';

      return {
        id: emp.id, razaoSocial: emp.razaoSocial, cnpj: emp.cnpj,
        tipoDocumento: emp.tipoDocumento, enquadramento: emp.enquadramento,
        anexoSimples: emp.anexoSimples, tipo: emp.tipo, nivel: emp.nivel,
        prazoEntrega: emp.prazoEntrega, temFuncionarios: emp.temFuncionarios,
        temProLabore: emp.temProLabore, semMovimento: emp.semMovimento,
        fatorR: emp.fatorR, enviaReinf: emp.enviaReinf, participaTarefas: emp.participaTarefas,
        responsavel: emp.responsavel,
        historico: { id: historico?.id || null, competencia, status: statusCalc, entregasGrupo: [] },
        _totalGrupos: totalGrupos,
        _entregues: concluidos,
        _bolinha: bolinha,
        _diaVencimentoMinimo: diaVencimentoMinimo,
      };
    });

    resultado.sort((a, b) => {
      if (a.prazoEntrega === null && b.prazoEntrega === null) return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR');
      if (a.prazoEntrega === null) return 1;
      if (b.prazoEntrega === null) return -1;
      if (a.prazoEntrega !== b.prazoEntrega) return a.prazoEntrega - b.prazoEntrega;
      return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR');
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
      include: {
        filiais: { include: { filial: true } },
        entregasGrupo: { include: { subtarefas: true } }
      }
    });
    if (!historico) {
      return res.json({ id: null, empresaId, competencia, status: 'NAO_INICIADO', entregasGrupo: [], filiais: [] });
    }
    res.json(historico);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:competencia/:empresaId', async (req, res) => {
  try {
    const { competencia, empresaId } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { gruposTarefa: { where: { ativo: true } } }
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    let historico = await prisma.historicoMensal.findUnique({
      where: { empresaId_competencia: { empresaId, competencia } }
    });
    if (!historico) {
      historico = await prisma.historicoMensal.create({
        data: { empresaId, competencia, responsavelId: req.user.id }
      });
    }
    res.json(historico);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
