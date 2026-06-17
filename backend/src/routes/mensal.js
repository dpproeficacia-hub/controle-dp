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
      participaTarefas: true,
      escritorioId: req.user.escritorioId
    };
    if (req.user.nivel === 'OPERADOR') whereEmpresa.responsavelId = req.user.id;
    else if (responsavelId) whereEmpresa.responsavelId = responsavelId;

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      select: {
        id: true, razaoSocial: true, cnpj: true, tipoDocumento: true,
        enquadramento: true, anexoSimples: true, tipo: true, nivel: true,
        prazoEntrega: true, cidade: true, estado: true,
        temFuncionarios: true, temProLabore: true,
        semMovimento: true, fatorR: true, enviaReinf: true, participaTarefas: true,
        responsavel: { select: { id: true, nome: true } },
        gruposTarefa: {
          where: { ativo: true },
          select: {
            id: true, nome: true, diaVencimento: true,
            isDiaUtil: true, mesSubsequente: true, tipo: true
          }
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

    // Feriados do escritório para cálculo de dias úteis
    const feriadosMunicipais = await prisma.feriado.findMany({
      where: { escritorioId: req.user.escritorioId }
    });

    const { calcularDataVencimento } = require('../utils/diasUteis');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const [anoComp, mesComp] = competencia.split('-').map(Number);

    // Gera UMA linha por empresa por tarefa
    const linhas = [];

    for (const emp of empresas) {
      if (emp.gruposTarefa.length === 0) continue;

      const historico = emp.historicos[0] || null;
      const entregasGrupo = historico?.entregasGrupo || [];
      const entregaMap = Object.fromEntries(entregasGrupo.map(e => [e.grupoId, e]));

      for (const grupo of emp.gruposTarefa) {
        const entrega = entregaMap[grupo.id];
        const entregue = entrega?.entregue || false;
        const dispensada = entrega?.dispensada || false;
        const concluido = entregue || dispensada;

        // Calcula data real de vencimento
        const dataVencReal = calcularDataVencimento(
          grupo, competencia, feriadosMunicipais, emp.cidade, emp.estado
        );

        const diasRestantes = Math.floor((dataVencReal - hoje) / 86400000);

        let bolinha = null;
        if (!concluido) {
          if (diasRestantes < 0) bolinha = 'vermelho';
          else if (diasRestantes <= 3) bolinha = 'laranja';
          else bolinha = 'azul';
        }

        linhas.push({
          // Identificadores
          id: `${emp.id}_${grupo.id}`,
          empresaId: emp.id,
          grupoId: grupo.id,
          // Dados da empresa
          razaoSocial: emp.razaoSocial,
          cnpj: emp.cnpj,
          tipoDocumento: emp.tipoDocumento,
          enquadramento: emp.enquadramento,
          anexoSimples: emp.anexoSimples,
          tipo: emp.tipo,
          nivel: emp.nivel,
          temFuncionarios: emp.temFuncionarios,
          temProLabore: emp.temProLabore,
          semMovimento: emp.semMovimento,
          fatorR: emp.fatorR,
          enviaReinf: emp.enviaReinf,
          responsavel: emp.responsavel,
          // Dados da tarefa
          nomeTarefa: grupo.nome,
          diaVencimento: grupo.diaVencimento,
          isDiaUtil: grupo.isDiaUtil,
          mesSubsequente: grupo.mesSubsequente,
          tipoTarefa: grupo.tipo,
          dataVencReal: dataVencReal.toISOString(),
          diasRestantes,
          // Status desta tarefa específica
          entregue,
          dispensada,
          concluido,
          _bolinha: bolinha,
        });
      }
    }

    // Ordena por data de vencimento real (cronológico), depois alfabético
    linhas.sort((a, b) => {
      const diff = new Date(a.dataVencReal) - new Date(b.dataVencReal);
      if (diff !== 0) return diff;
      return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR');
    });

    // Aplica filtro de status se solicitado
    const filtrado = status === 'FINALIZADO'
      ? linhas.filter(l => l.concluido)
      : status === 'NAO_INICIADO'
      ? linhas.filter(l => !l.concluido && !l.entregue)
      : status === 'PARCIAL'
      ? linhas.filter(l => !l.concluido)
      : linhas;

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
