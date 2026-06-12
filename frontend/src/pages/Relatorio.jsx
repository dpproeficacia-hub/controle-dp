import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Relatorio() {
  const { competencia } = useOutletContext();
  const [abaAtiva, setAbaAtiva] = useState('status');
  const [impDe, setImpDe] = useState('');
  const [impAte, setImpAte] = useState('');
  const [gerandoStatus, setGerandoStatus] = useState(false);
  const [gerandoEnvios, setGerandoEnvios] = useState(false);
  const [gerandoImp, setGerandoImp] = useState(false);
  const [dadosStatus, setDadosStatus] = useState(null);

  const base = import.meta.env.VITE_API_URL || 'https://controle-dp-backend.onrender.com/api';

  async function buscarStatus() {
    setGerandoStatus(true);
    try {
      const { data } = await api.get(`/mensal/${competencia}`);
      setDadosStatus(data);
    } finally {
      setGerandoStatus(false);
    }
  }

  function exportarCSV() {
    if (!dadosStatus) return;
    const linhas = [
      ['Empresa', 'CNPJ', 'Responsável', 'Status', 'Progresso', 'Nível']
    ];
    dadosStatus.forEach(emp => {
      linhas.push([
        emp.razaoSocial,
        emp.cnpj,
        emp.responsavel?.nome || '—',
        emp.historico?.status || 'NAO_INICIADO',
        emp._totalGrupos ? `${emp._entregues}/${emp._totalGrupos}` : '—',
        emp.nivel
      ]);
    });
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `status-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function imprimirStatus() {
    if (!dadosStatus) return;
    const [ano, mes] = competencia.split('-');
    const nomeMes = MESES[parseInt(mes) - 1];
    const STATUS_LABEL = { NAO_INICIADO: 'Não iniciado', PARCIAL: 'Em andamento', FINALIZADO: 'Finalizado' };
    const STATUS_COR = { NAO_INICIADO: '#dc2626', PARCIAL: '#d97706', FINALIZADO: '#16a34a' };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Status ${nomeMes}/${ano}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .sub { color: #666; margin-bottom: 16px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f4f3ef; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
      td { padding: 6px 10px; border-bottom: 1px solid #eee; }
      .status { font-weight: bold; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <h1>Controle Mensal — ${nomeMes}/${ano}</h1>
    <p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} · ${dadosStatus.length} empresas</p>
    <table>
      <thead><tr>
        <th>Empresa</th><th>Responsável</th><th>Nível</th><th>Status</th><th>Progresso</th>
      </tr></thead>
      <tbody>
        ${dadosStatus.map(emp => `
          <tr>
            <td>${emp.razaoSocial}</td>
            <td>${emp.responsavel?.nome || '—'}</td>
            <td>${emp.nivel}</td>
            <td class="status" style="color:${STATUS_COR[emp.historico?.status || 'NAO_INICIADO']}">
              ${STATUS_LABEL[emp.historico?.status || 'NAO_INICIADO']}
            </td>
            <td>${emp._totalGrupos ? `${emp._entregues}/${emp._totalGrupos} (${Math.round((emp._entregues/emp._totalGrupos)*100)}%)` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <script>window.onload = () => window.print();</script>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  }

  async function gerarEnvios() {
    setGerandoEnvios(true);
    try {
      const token = localStorage.getItem('dp_token');
      const resp = await fetch(`${base}/relatorio/envios/${competencia}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const html = await resp.text();
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    } finally {
      setGerandoEnvios(false);
    }
  }

  async function gerarImpostos() {
    setGerandoImp(true);
    try {
      const token = localStorage.getItem('dp_token');
      const params = new URLSearchParams();
      if (impDe) params.append('de', impDe);
      if (impAte) params.append('ate', impAte);
      const resp = await fetch(`${base}/relatorio/impostos?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const html = await resp.text();
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    } finally {
      setGerandoImp(false);
    }
  }

  const [ano, mes] = competencia.split('-');
  const nomeMes = MESES[parseInt(mes) - 1];
  const STATUS_LABEL = { NAO_INICIADO: 'Não iniciado', PARCIAL: 'Em andamento', FINALIZADO: 'Finalizado' };
  const STATUS_PILL = { NAO_INICIADO: 'pill-red', PARCIAL: 'pill-amber', FINALIZADO: 'pill-green' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">Relatórios</h1>
        <p className="text-muted text-sm mt-1">Gere e exporte relatórios do seu escritório</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { key: 'status', label: '📊 Status mensal' },
          { key: 'envios', label: '📋 Envios' },
          { key: 'impostos', label: '💰 Impostos' },
        ].map(a => (
          <button key={a.key} onClick={() => setAbaAtiva(a.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${abaAtiva === a.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'status' && (
        <div className="space-y-4">
          <div className="card p-6 max-w-xl">
            <h2 className="font-semibold text-ink mb-1">Status Mensal Completo</h2>
            <p className="text-sm text-muted mb-4">Veja e exporte o status de todas as empresas da competência atual.</p>
            <div className="bg-surface2 rounded-lg p-4 mb-4">
              <p className="text-xs text-faint mb-1">Competência</p>
              <p className="font-display font-bold text-xl text-ink">{nomeMes} / {ano}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={buscarStatus} disabled={gerandoStatus} className="btn btn-primary flex-1 justify-center">
                {gerandoStatus
                  ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin mr-2" />Carregando...</>
                  : '📊 Carregar status'}
              </button>
              {dadosStatus && (
                <>
                  <button onClick={exportarCSV} className="btn btn-secondary" title="Exportar CSV">
                    📥 CSV
                  </button>
                  <button onClick={imprimirStatus} className="btn btn-secondary" title="Imprimir">
                    🖨 Imprimir
                  </button>
                </>
              )}
            </div>
          </div>

          {dadosStatus && (
            <div className="card overflow-hidden">
              <div className="card-header">
                <span className="card-title">{dadosStatus.length} empresas — {nomeMes}/{ano}</span>
                <div className="flex gap-2 text-xs text-faint">
                  <span className="pill pill-green">{dadosStatus.filter(e => e.historico?.status === 'FINALIZADO').length} finalizadas</span>
                  <span className="pill pill-amber">{dadosStatus.filter(e => e.historico?.status === 'PARCIAL').length} parciais</span>
                  <span className="pill pill-red">{dadosStatus.filter(e => !e.historico?.status || e.historico?.status === 'NAO_INICIADO').length} pendentes</span>
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-surface2 sticky top-0">
                    <tr>
                      {['Empresa', 'Responsável', 'Nível', 'Status', 'Progresso'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosStatus.map(emp => {
                      const status = emp.historico?.status || 'NAO_INICIADO';
                      const pct = emp._totalGrupos ? Math.round((emp._entregues / emp._totalGrupos) * 100) : null;
                      return (
                        <tr key={emp.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                            <p className="text-xs text-faint font-mono">{emp.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">{emp.responsavel?.nome || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`w-6 h-6 rounded inline-flex items-center justify-center text-xs font-bold ${emp.nivel === 'N1' ? 'bg-ink text-bg' : emp.nivel === 'N2' ? 'bg-red-100 text-red-800' : emp.nivel === 'N3' ? 'bg-amber-100 text-amber-800' : emp.nivel === 'N4' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{emp.nivel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`pill text-[10px] ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
                          </td>
                          <td className="px-4 py-3">
                            {pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct > 0 ? '#d97706' : '#dc2626' }} />
                                </div>
                                <span className="text-xs text-faint">{pct}%</span>
                              </div>
                            ) : <span className="text-xs text-faint">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'envios' && (
        <div className="card p-6 max-w-xl">
          <h2 className="font-semibold text-ink mb-1">Relatório de Envios</h2>
          <p className="text-sm text-muted mb-6">Lista todas as empresas finalizadas, com data de entrega e responsável.</p>
          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <p className="text-xs text-faint mb-1">Competência atual</p>
            <p className="font-display font-bold text-xl text-ink">{nomeMes} / {ano}</p>
          </div>
          <button onClick={gerarEnvios} disabled={gerandoEnvios} className="btn btn-primary w-full justify-center">
            {gerandoEnvios
              ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
              : '🖨 Gerar relatório de envios'}
          </button>
        </div>
      )}

      {abaAtiva === 'impostos' && (
        <div className="card p-6 max-w-xl">
          <h2 className="font-semibold text-ink mb-1">Relatório de Impostos</h2>
          <p className="text-sm text-muted mb-6">Totaliza INSS, FGTS e IR por empresa em um período.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">De</label>
              <input type="month" className="input" value={impDe} onChange={e => setImpDe(e.target.value)} />
            </div>
            <div>
              <label className="label">Até</label>
              <input type="month" className="input" value={impAte} onChange={e => setImpAte(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-faint mb-4">
            {!impDe && !impAte ? '⚠ Sem filtro: exibirá todo o histórico.' : `Período: ${impDe || 'início'} até ${impAte || 'hoje'}`}
          </p>
          <button onClick={gerarImpostos} disabled={gerandoImp} className="btn btn-primary w-full justify-center">
            {gerandoImp
              ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
              : '🖨 Gerar relatório de impostos'}
          </button>
        </div>
      )}
    </div>
  );
}
