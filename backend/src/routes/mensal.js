const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Compara competências no formato "YYYY-MM" — retorna true se a (comp) já alcançou o início (inicio)
function competenciaAlcancada(competencia, inicioCompetenciaStr) {
  if (!inicioCompetenciaStr) return true;
  return competencia >= inicioCompetenciaStr; // comparação de string "YYYY-MM" funciona lexicograficamente
}

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
        prazoEntrega: true, cidade: true, estado: true, competenciaInicial: true,
        temFuncionarios: true, temProLabore: true,
        semMovimento: true, fatorR: true, enviaReinf: true, participaTarefas: true,
        responsavel: { select: { id: true, nome: true } },
        gruposTarefa: {
          where: { ativo: true },
          select: {
            id: true, nome: true, diaVencimento: true,
            isDiaUtil: true, mesSubsequente: true, tipo: true, inicioCobrancaEm: true
          }
        },
        historicos: {
          where: { competencia },
          select: {
            id: true, status: true,
            entregasGrupo: { select: { grupoId: true, entregue: true, dispensada: true, justificativa: true } }
          }
        }
      },
      orderBy: [{ razaoSocial: 'asc' }]
    });

    const feriadosMunicipais = await prisma.feriado.findMany({
      where: { escritorioId: req.user.escritorioId }
    });

    const { calcularDataVencimento } = require('../utils/diasUteis');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const linhas = [];

    for (const emp of empresas) {
      if (emp.gruposTarefa.length === 0) continue;

      const historico = emp.historicos[0] || null;
      const entregasGrupo = historico?.entregasGrupo || [];
      const entregaMap = Object.fromEntries(entregasGrupo.map(e => [e.grupoId, e]));

      for (const grupo of emp.gruposTarefa) {
        // Calcula a competência mínima exigida pra essa tarefa nessa empresa:
        // o mais restritivo entre o início de cobrança da tarefa e a competência inicial da empresa
        const inicioTarefaStr = grupo.inicioCobrancaEm
          ? `${grupo.inicioCobrancaEm.getUTCFullYear()}-${String(grupo.inicioCobrancaEm.getUTCMonth() + 1).padStart(2, '0')}`
          : null;
        const inicioEmpresaStr = emp.competenciaInicial || null;

        let competenciaMinima = null;
        if (inicioTarefaStr && inicioEmpresaStr) {
          competenciaMinima = inicioTarefaStr > inicioEmpresaStr ? inicioTarefaStr : inicioEmpresaStr;
        } else {
          competenciaMinima = inicioTarefaStr || inicioEmpresaStr || null;
        }

        // Se a competência pedida é anterior à mínima exigida, esta tarefa NÃO é cobrada nesse mês
        if (competenciaMinima && competencia < competenciaMinima) continue;

        const entrega = entregaMap[grupo.id];
        const entregue = entrega?.entregue || false;
        const dispensada = entrega?.dispensada || false;
        const concluido = entregue || dispensada;

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
          id: `${emp.id}_${grupo.id}`,
          empresaId: emp.id,
          grupoId: grupo.id,
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
          nomeTarefa: grupo.nome,
          diaVencimento: grupo.diaVencimento,
          isDiaUtil: grupo.isDiaUtil,
          mesSubsequente: grupo.mesSubsequente,
          tipoTarefa: grupo.tipo,
          dataVencReal: dataVencReal.toISOString(),
          diasRestantes,
          entregue,
          dispensada,
          justificativa: entrega?.justificativa || null,
          concluido,
          _bolinha: bolinha,
        });
      }
    }

    linhas.sort((a, b) => {
      const diff = new Date(a.dataVencReal) - new Date(b.dataVencReal);
      if (diff !== 0) return diff;
      return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR');
    });

    const filtrado = status === 'FINALIZADO'
      ? linhas.filter(l => l.concluido)
      : status === 'NAO_INICIADO' || status === 'PARCIAL'
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

// Ação em lote: concluir (marcar entregue) ou dispensar várias linhas (empresa+grupo) de uma vez
router.post('/lote/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { itens, acao, justificativa } = req.body;
    // itens: [{ empresaId, grupoId }]
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado.' });
    }
    if (!['entregar', 'dispensar'].includes(acao)) {
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    console.log('LOTE recebido:', JSON.stringify({ competencia, itens, acao, userEscritorioId: req.user.escritorioId }));

    const resultados = [];
    for (const item of itens) {
      const { empresaId, grupoId } = item;

      // Verificação explícita antes de tentar criar, para diagnosticar com precisão
      const empresaExiste = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresaExiste) {
        console.error('LOTE erro: empresaId não encontrado no banco no momento da escrita ->', empresaId);
        return res.status(404).json({
          error: `Empresa não encontrada (id: ${empresaId}). Pode ter sido excluída ou recriada — atualize a página e tente novamente.`,
          empresaIdRecebido: empresaId
        });
      }

      const grupoExiste = await prisma.grupoTarefa.findUnique({ where: { id: grupoId } });
      if (!grupoExiste) {
        console.error('LOTE erro: grupoId não encontrado no banco no momento da escrita ->', grupoId);
        return res.status(404).json({
          error: `Tarefa não encontrada (id: ${grupoId}). Atualize a página e tente novamente.`,
          grupoIdRecebido: grupoId
        });
      }

      let historico = await prisma.historicoMensal.findUnique({
        where: { empresaId_competencia: { empresaId, competencia } }
      });
      if (!historico) {
        historico = await prisma.historicoMensal.create({
          data: { empresaId, competencia, responsavelId: req.user.id }
        });
      }

      const dataAtual = new Date().toISOString().slice(0, 10);

      const entregaGrupo = await prisma.entregaGrupo.upsert({
        where: { grupoId_historicoId: { grupoId, historicoId: historico.id } },
        create: {
          grupoId, historicoId: historico.id,
          entregue: acao === 'entregar',
          dispensada: acao === 'dispensar',
          dataEntrega: acao === 'entregar' ? dataAtual : null,
          justificativa: acao === 'dispensar' ? (justificativa || null) : null,
        },
        update: {
          entregue: acao === 'entregar',
          dispensada: acao === 'dispensar',
          dataEntrega: acao === 'entregar' ? dataAtual : null,
          justificativa: acao === 'dispensar' ? (justificativa || null) : null,
        }
      });

      // Recalcula status do histórico
      const todasEntregas = await prisma.entregaGrupo.findMany({ where: { historicoId: historico.id } });
      const todosGrupos = await prisma.grupoTarefa.findMany({ where: { empresaId, ativo: true } });
      const concluidos = todasEntregas.filter(e => e.entregue || e.dispensada).length;
      let status = 'NAO_INICIADO';
      if (todosGrupos.length > 0 && concluidos >= todosGrupos.length) status = 'FINALIZADO';
      else if (concluidos > 0) status = 'PARCIAL';
      await prisma.historicoMensal.update({ where: { id: historico.id }, data: { status } });

      resultados.push(entregaGrupo);
    }

    res.json({ ok: true, total: resultados.length });
  } catch (e) {
    console.error('POST /lote/:competencia erro completo:', e);
    res.status(500).json({ error: e.message, code: e.code, meta: e.meta });
  }
});

module.exports = router;
