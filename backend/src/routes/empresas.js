const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Listar controle mensal por competência
router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { status, responsavelId } = req.query;

    const whereEmpresa = { ativa: true };
    if (req.user.nivel === 'OPERADOR') {
      whereEmpresa.responsavelId = req.user.id;
      whereEmpresa.saiuDoEscritorio = false;
    } else {
      whereEmpresa.saiuDoEscritorio = false;
      if (responsavelId) whereEmpresa.responsavelId = responsavelId;
    }

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      include: {
        responsavel: { select: { id: true, nome: true } },
        filiais: true,
        gruposTarefa: {
          where: { ativo: true },
          include: { subtarefas: { where: { ativa: true } } }
        },
        historicos: {
          where: { competencia },
          include: {
            entregasGrupo: {
              include: { subtarefas: true }
            }
          }
        }
      },
      orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
    });

    const resultado = empresas.map(emp => {
      const historico = emp.historicos[0] || null;
      const entregasGrupo = historico?.entregasGrupo || [];

      const totalGrupos = emp.gruposTarefa.length;
      const entregues = entregasGrupo.filter(eg => eg.entregue).length;

      let statusCalc = 'NAO_INICIADO';
      if (totalGrupos > 0 && entregues >= totalGrupos) statusCalc = 'FINALIZADO';
      else if (entregues > 0) statusCalc = 'PARCIAL';

      return {
        ...emp,
        historicos: undefined,
        historico: {
          id: historico?.id || null,
          competencia,
          status: statusCalc,
          entregasGrupo,
        },
        _totalGrupos: totalGrupos,
        _entregues: entregues,
      };
    });

    const filtrado = status
      ? resultado.filter(e => e.historico.status === status)
      : resultado;

    res.json(filtrado);
  } catch (e) {
    console.error('GET /:competencia erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Buscar histórico de uma empresa para uma competência
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
      return res.json({
        id: null, empresaId, competencia, status: 'NAO_INICIADO',
        entregasGrupo: [], filiais: []
      });
    }

    res.json(historico);
  } catch (e) {
    console.error('GET /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Salvar/atualizar histórico
router.post('/:competencia/:empresaId', async (req, res) => {
  try {
    const { competencia, empresaId } = req.params;

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        gruposTarefa: {
          where: { ativo: true },
          include: { subtarefas: { where: { ativa: true } } }
        }
      }
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

    // Criar ou buscar histórico
    let historico = await prisma.historicoMensal.findUnique({
      where: { empresaId_competencia: { empresaId, competencia } }
    });

    if (!historico) {
      historico = await prisma.historicoMensal.create({
        data: { empresaId, competencia, responsavelId: req.user.id }
      });
    }

    // Calcular status baseado nas entregas dos grupos
    const totalGrupos = empresa.gruposTarefa.length;
    const entregasExistentes = await prisma.entregaGrupo.count({
      where: { historicoId: historico.id, entregue: true }
    });

    let statusCalc = 'NAO_INICIADO';
    if (totalGrupos > 0 && entregasExistentes >= totalGrupos) statusCalc = 'FINALIZADO';
    else if (entregasExistentes > 0) statusCalc = 'PARCIAL';

    const historicoAtualizado = await prisma.historicoMensal.update({
      where: { id: historico.id },
      data: { status: statusCalc, responsavelId: req.user.id },
      include: {
        filiais: true,
        entregasGrupo: { include: { subtarefas: true } }
      }
    });

    res.json(historicoAtualizado);
  } catch (e) {
    console.error('POST /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Histórico completo de uma empresa (todos os meses)
router.get('/historico/:empresaId', async (req, res) => {
  try {
    const historicos = await prisma.historicoMensal.findMany({
      where: { empresaId: req.params.empresaId },
      include: {
        filiais: { include: { filial: true } },
        responsavel: { select: { nome: true } },
        entregasGrupo: { include: { subtarefas: true, grupo: true } }
      },
      orderBy: { competencia: 'desc' }
    });
    res.json(historicos);
  } catch (e) {
    console.error('GET /historico/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
