const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtMoeda = v => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Relatório de envios do mês (PDF)
router.get('/envios/:competencia', async (req, res) => {
  try {
    const { competencia } = req.params;
    const [ano, mes] = competencia.split('-');
    const nomeMes = MESES[parseInt(mes) - 1];

    const historicos = await prisma.historicoMensal.findMany({
      where: { competencia, status: 'FINALIZADO' },
      include: {
        empresa: { select: { razaoSocial: true, cnpj: true, temFuncionarios: true, temProLabore: true, semMovimento: true } },
        responsavel: { select: { nome: true } }
      },
      orderBy: [{ empresa: { razaoSocial: 'asc' } }]
    });

    const identidade = { nomeEscritorio: 'DPSmart', corPrimaria: '#1C1B19' };

    const linhas = historicos.map(h => {
      const tipo = h.semMovimentoMes
        ? 'Sem movimento (mês)'
        : h.empresa.temFuncionarios ? 'Com funcionários'
        : h.empresa.temProLabore ? 'Pró-labore'
        : 'Sem movimento';

      return `
        <tr>
          <td>${h.empresa.razaoSocial}</td>
          <td class="cnpj">${fmtCNPJ(h.empresa.cnpj)}</td>
          <td><span class="pill ${h.empresa.temFuncionarios ? 'green' : h.empresa.temProLabore ? 'blue' : 'gray'}">${tipo}</span></td>
          <td>${fmtData(h.dataEntregaFolha)}</td>
          <td>${fmtData(h.dataEntregaObrig)}</td>
          <td>${h.responsavel?.nome || '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 32px; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #1C1B19; }
  .header h1 { font-size:18px; font-weight:700; }
  .header p { font-size:11px; color:#666; margin-top:3px; }
  .escritorio { font-size:13px; font-weight:700; color:#1C1B19; }
  .sub { font-size:10px; color:#888; }
  .stats { display:flex; gap:12px; margin-bottom:20px; }
  .stat { flex:1; background:#f5f5f5; border-radius:6px; padding:12px; text-align:center; }
  .stat strong { display:block; font-size:22px; font-weight:700; color:#1C1B19; }
  .stat span { font-size:10px; color:#666; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1C1B19; color:white; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; }
  td { padding:7px 10px; border-bottom:1px solid #eee; vertical-align:middle; }
  tr:nth-child(even) td { background:#fafafa; }
  .cnpj { font-family:monospace; font-size:10px; color:#666; }
  .pill { display:inline-block; padding:2px 7px; border-radius:99px; font-size:9px; font-weight:600; }
  .pill.green { background:#dcfce7; color:#166534; }
  .pill.blue { background:#dbeafe; color:#1e40af; }
  .pill.gray { background:#f3f4f6; color:#374151; }
  .footer { margin-top:24px; text-align:center; font-size:9px; color:#aaa; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="escritorio">${identidade.nomeEscritorio}</div>
      <div class="sub">Departamento Pessoal</div>
    </div>
    <div style="text-align:right">
      <h1>Relatório de Envios</h1>
      <p>${nomeMes} / ${ano} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><strong>${historicos.length}</strong><span>Empresas finalizadas</span></div>
    <div class="stat"><strong>${historicos.filter(h=>h.empresa.temFuncionarios).length}</strong><span>Com funcionários</span></div>
    <div class="stat"><strong>${historicos.filter(h=>h.empresa.temProLabore&&!h.empresa.temFuncionarios&&!h.semMovimentoMes).length}</strong><span>Pró-labore</span></div>
    <div class="stat"><strong>${historicos.filter(h=>h.empresa.semMovimento||h.semMovimentoMes).length}</strong><span>Sem movimento</span></div>
  </div>
  <table>
    <thead><tr><th>Empresa</th><th>CNPJ</th><th>Tipo</th><th>Entrega Folha</th><th>Entrega Obrig.</th><th>Responsável</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="footer">Relatório gerado automaticamente pelo sistema DPSmart • ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error('Relatório envios erro:', e);
    res.status(500).json({ error: e.message });
  }
});

// Relatório de impostos por período
router.get('/impostos', async (req, res) => {
  try {
    const { de, ate, empresaId } = req.query;

    const where = {};
    if (empresaId) where.empresaId = empresaId;
    if (de || ate) {
      where.competencia = {};
      if (de) where.competencia.gte = de;
      if (ate) where.competencia.lte = ate;
    }

    const historicos = await prisma.historicoMensal.findMany({
      where,
      include: { empresa: { select: { razaoSocial: true, cnpj: true } } },
      orderBy: [{ empresa: { razaoSocial: 'asc' } }, { competencia: 'asc' }]
    });

    // Agrupa por empresa
    const porEmpresa = {};
    for (const h of historicos) {
      if (!porEmpresa[h.empresaId]) {
        porEmpresa[h.empresaId] = {
          razaoSocial: h.empresa.razaoSocial,
          cnpj: h.empresa.cnpj,
          meses: [],
          totalInss: 0, totalFgts: 0, totalIr: 0
        };
      }
      const inss = parseFloat(h.valorInss) || 0;
      const fgts = parseFloat(h.valorFgts) || 0;
      const ir = parseFloat(h.valorIr) || 0;
      porEmpresa[h.empresaId].meses.push({ competencia: h.competencia, inss, fgts, ir, total: inss+fgts+ir });
      porEmpresa[h.empresaId].totalInss += inss;
      porEmpresa[h.empresaId].totalFgts += fgts;
      porEmpresa[h.empresaId].totalIr += ir;
    }

    const totalGeral = { inss: 0, fgts: 0, ir: 0 };
    Object.values(porEmpresa).forEach(e => {
      totalGeral.inss += e.totalInss;
      totalGeral.fgts += e.totalFgts;
      totalGeral.ir += e.totalIr;
    });

    const blocos = Object.values(porEmpresa).map(emp => {
      const linhasMeses = emp.meses.map(m => `
        <tr>
          <td style="padding-left:20px;color:#666">${m.competencia}</td>
          <td>${fmtMoeda(m.inss)}</td>
          <td>${fmtMoeda(m.fgts)}</td>
          <td>${fmtMoeda(m.ir)}</td>
          <td><strong>${fmtMoeda(m.total)}</strong></td>
        </tr>`).join('');
      return `
        <tr class="empresa-row">
          <td colspan="5">
            <strong>${emp.razaoSocial}</strong>
            <span style="font-family:monospace;font-size:10px;color:#888;margin-left:8px">${fmtCNPJ(emp.cnpj)}</span>
          </td>
        </tr>
        ${linhasMeses}
        <tr class="subtotal">
          <td style="padding-left:20px"><strong>Subtotal</strong></td>
          <td><strong>${fmtMoeda(emp.totalInss)}</strong></td>
          <td><strong>${fmtMoeda(emp.totalFgts)}</strong></td>
          <td><strong>${fmtMoeda(emp.totalIr)}</strong></td>
          <td><strong>${fmtMoeda(emp.totalInss+emp.totalFgts+emp.totalIr)}</strong></td>
        </tr>`;
    }).join('');

    const periodo = de && ate ? `${de} a ${ate}` : de ? `a partir de ${de}` : ate ? `até ${ate}` : 'Todo o período';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:11px; color:#222; padding:32px; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #1C1B19; }
  .header h1 { font-size:18px; font-weight:700; }
  .header p { font-size:11px; color:#666; margin-top:3px; }
  .escritorio { font-size:13px; font-weight:700; }
  .sub { font-size:10px; color:#888; }
  .totais { display:flex; gap:12px; margin-bottom:20px; }
  .total-box { flex:1; background:#f5f5f5; border-radius:6px; padding:12px; text-align:center; }
  .total-box strong { display:block; font-size:16px; font-weight:700; color:#1C1B19; }
  .total-box span { font-size:10px; color:#666; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1C1B19; color:white; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
  td { padding:6px 10px; border-bottom:1px solid #eee; }
  .empresa-row td { background:#f0f4f8; font-size:12px; padding:8px 10px; }
  .subtotal td { background:#e8f5e9; font-size:11px; }
  .total-geral td { background:#1C1B19; color:white; font-size:12px; font-weight:700; padding:10px; }
  .footer { margin-top:24px; text-align:center; font-size:9px; color:#aaa; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="escritorio">DPSmart</div>
      <div class="sub">Departamento Pessoal</div>
    </div>
    <div style="text-align:right">
      <h1>Relatório de Impostos</h1>
      <p>Período: ${periodo} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  </div>
  <div class="totais">
    <div class="total-box"><strong>${fmtMoeda(totalGeral.inss)}</strong><span>Total INSS</span></div>
    <div class="total-box"><strong>${fmtMoeda(totalGeral.fgts)}</strong><span>Total FGTS</span></div>
    <div class="total-box"><strong>${fmtMoeda(totalGeral.ir)}</strong><span>Total IR</span></div>
    <div class="total-box"><strong>${fmtMoeda(totalGeral.inss+totalGeral.fgts+totalGeral.ir)}</strong><span>Total Geral</span></div>
  </div>
  <table>
    <thead><tr><th>Empresa / Competência</th><th>INSS</th><th>FGTS</th><th>IR</th><th>Total</th></tr></thead>
    <tbody>
      ${blocos}
      <tr class="total-geral">
        <td>TOTAL GERAL</td>
        <td>${fmtMoeda(totalGeral.inss)}</td>
        <td>${fmtMoeda(totalGeral.fgts)}</td>
        <td>${fmtMoeda(totalGeral.ir)}</td>
        <td>${fmtMoeda(totalGeral.inss+totalGeral.fgts+totalGeral.ir)}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">Relatório gerado automaticamente pelo sistema DPSmart • ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error('Relatório impostos erro:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
