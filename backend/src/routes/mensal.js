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

    const whereEmpresa = { ativa: true, saiuDoEscritorio: false };
    if (req.user.nivel === 'OPERADOR') whereEmpresa.responsavelId = req.user.id;
    else if (responsavelId) whereEmpresa.responsavelId = responsavelId;

    const empresas = await prisma.empresa.findMany({
      where: whereEmpresa,
      select: {
        id: true, razaoSocial: true, cnpj: true, tipoDocumento: true,
        enquadramento: true, anexoSimples: true, tipo: true, nivel: true,
        prazoEntrega: true, temFuncionarios: true, temProLabore: true,
        semMovimento: true, fatorR: true, enviaReinf: true, participaTarefas: true,
        responsavel: { select: { id: true, nome: true } },
        _count: { select: { gruposTarefa: { where: { ativo: true } } } },
        historicos: {
          where: { competencia },
          select: {
            id: true, status: true,
            entregasGrupo: { select: { entregue: true, dispensada: true } }
          }
        }
      },
      orderBy: [{ nivel: 'asc' }, { razaoSocial: 'asc' }]
    });

    const resultado = empresas.map(emp => {
      const historico = emp.historicos[0] || null;
      // Se não participa de tarefas, não conta grupos
      const totalGrupos = emp.participaTarefas ? emp._count.gruposTarefa : 0;
      const entregasGrupo = historico?.entregasGrupo || [];
      // Entregue OU dispensada conta como concluído
      const concluidos = entregasGrupo.filter(eg => eg.entregue || eg.dispensada).length;

      let statusCalc = 'NAO_INICIADO';
      if (totalGrupos > 0 && concluidos >= totalGrupos) statusCalc = 'FINALIZADO';
      else if (concluidos > 0) statusCalc = 'PARCIAL';

      return {
        ...emp,
        _count: undefined,
        historicos: undefined,
        historico: {
          id: historico?.id || null,
          competencia,
          status: statusCalc,
          entregasGrupo: [],
        },
        _totalGrupos: totalGrupos,
        _entregues: concluidos,
      };
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
    console.error('POST /:competencia/:empresaId erro:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
