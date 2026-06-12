const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const { responsavelId } = req.query;
    const anoAtual = new Date().getFullYear();

    // CORRIGIDO: sempre filtra pelo escritório do usuário logado
    const whereBase = { ativa: true, saiuDoEscritorio: false, escritorioId: req.user.escritorioId };
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
      // Filtra históricos apenas das empresas do escritório
      prisma.historicoMensal.findMany({
        where: {
          competencia,
          empresa: { escritorioId: req.user.escritorioId }
        }
      }),
      // Filtra sindicatos do escritório
      prisma.controleSindical.findMany({
        where: { empresa: { escritorioId: req.user.escritorioId } }
      }),
      prisma.usuario.findMany({
        where: { ativo: true, escritorioId: req.user.escritorioId },
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

    // Evolução dos últimos 6 meses para o gráfico
    const ultimosMeses = [];
    const [anoComp, mesComp] = competencia.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      let m = mesComp - i;
      let a = anoComp;
      if (m <= 0) { m += 12; a -= 1; }
      ultimosMeses.push(`${a}-${String(m).padStart(2, '0')}`);
    }

    const evolucao = await Promise.all(
      ultimosMeses.map(async (comp) => {
        const hists = await prisma.historicoMensal.findMany({
          where: { competencia: comp, empresa: { escritorioId: req.user.escritorioId, ...whereBase } },
          select: { status: true }
        });
        const total = empresas.length;
        const finalizados = hists.filter(h => h.status === 'FINALIZADO').length;
        const parciais = hists.filter(h => h.status === 'PARCIAL').length;
        return { competencia: comp, total, finalizados, parciais, pendentes: total - finalizados - parciais };
      })
    );

    res.json({
      competencia, ...stats,
      cctPendentes, reajustePendente,
      porResponsavel: porResponsavelNomeado,
      evolucao,
    });
  } catch (e) {
    console.error('Dashboard erro:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
