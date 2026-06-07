const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/:competencia', async (req, res) => {
  const { competencia } = req.params;
  const { responsavelId } = req.query;
  const anoAtual = new Date().getFullYear();

  const whereBase = { ativa: true, saiuDoEscritorio: false };
  if (req.user.nivel === 'OPERADOR') {
    whereBase.responsavelId = req.user.id;
  } else if (responsavelId) {
    whereBase.responsavelId = responsavelId;
  }

  const [empresas, historicos, sindicais, responsaveis] = await Promise.all([
    prisma.empresa.findMany({
      where: whereBase,
      select: {
        id: true, nivel: true, temFuncionarios: true,
        temProLabore: true, semMovimento: true, responsavelId: true
      }
    }),
    prisma.historicoMensal.findMany({ where: { competencia } }),
    prisma.controleSindical.findMany(),
    prisma.usuario.findMany({
      where: { ativo: true, nivel: { in: ['OPERADOR', 'GESTOR'] } },
      select: { id: true, nome: true }
    })
  ]);

  const historicoMap = Object.fromEntries(historicos.map(h => [h.empresaId, h]));

  const stats = empresas.reduce((acc, emp) => {
    const h = historicoMap[emp.id];
    const status = h?.status || 'NAO_INICIADO';
    acc.total++;
    acc[status] = (acc[status] || 0) + 1;
    if (emp.temFuncionarios) acc.comFuncionarios++;
    if (emp.temProLabore) acc.comProLabore++;
    if (emp.semMovimento) acc.semMovimento++;
    if (!acc.porNivel[emp.nivel]) acc.porNivel[emp.nivel] = { total: 0, finalizados: 0 };
    acc.porNivel[emp.nivel].total++;
    if (status === 'FINALIZADO') acc.porNivel[emp.nivel].finalizados++;
    if (!acc.porResponsavel[emp.responsavelId]) acc.porResponsavel[emp.responsavelId] = { total: 0, finalizados: 0 };
    acc.porResponsavel[emp.responsavelId].total++;
    if (status === 'FINALIZADO') acc.porResponsavel[emp.responsavelId].finalizados++;
    return acc;
  }, {
    total: 0, NAO_INICIADO: 0, PARCIAL: 0, FINALIZADO: 0,
    comFuncionarios: 0, comProLabore: 0, semMovimento: 0,
    porNivel: {}, porResponsavel: {}
  });

  const cctPendentes = sindicais.filter(s => s.ultimaCct < anoAtual).length;
  const reajustePendente = sindicais.filter(s => !s.reajusteAplicado).length;

  const porResponsavelNomeado = responsaveis.map(r => ({
    id: r.id, nome: r.nome,
    ...(stats.porResponsavel[r.id] || { total: 0, finalizados: 0 })
  })).filter(r => r.total > 0);

  res.json({
    competencia, ...stats,
    cctPendentes, reajustePendente,
    porResponsavel: porResponsavelNomeado,
  });
});

module.exports = router;
