import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function KpiCard({ label, value, cor, destaque, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`font-display font-bold text-3xl ${cor}`}>{value ?? '—'}</p>
        {destaque && <p className="text-sm font-semibold text-faint mb-0.5">{destaque}</p>}
      </div>
      {sub && <p className="text-xs text-faint mt-1">{sub}</p>}
    </div>
  );
}

function GraficoBarras({ dados }) {
  if (!dados || dados.length === 0) return null;
  const maxVal = Math.max(...dados.map(d => d.total), 1);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Evolução — últimos 6 meses</span>
        <div className="flex items-center gap-3 text-[10px] text-faint">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block"/>Finalizadas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block"/>Em andamento</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-300 inline-block"/>Pendentes</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3 h-36">
          {dados.map((d, i) => {
            const [ano, mes] = d.competencia.split('-');
            const label = `${MESES_LABEL[parseInt(mes) - 1]}/${String(ano).slice(2)}`;
            const pctFin = d.total ? (d.finalizados / d.total) : 0;
            const pctPar = d.total ? (d.parciais / d.total) : 0;
            const pctPen = d.total ? (d.pendentes / d.total) : 0;
            const altura = d.total ? Math.max((d.total / maxVal) * 100, 8) : 4;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] text-faint">{d.finalizados > 0 ? `${Math.round(pctFin * 100)}%` : ''}</p>
                <div className="w-full rounded-md overflow-hidden flex flex-col-reverse" style={{ height: `${altura}%` }}>
                  <div className="bg-green-500 transition-all" style={{ height: `${pctFin * 100}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ height: `${pctPar * 100}%` }} />
                  <div className="bg-red-200 transition-all" style={{ height: `${pctPen * 100}%` }} />
                </div>
                <p className="text-[10px] text-faint text-center">{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { competencia, mes, ano } = useOutletContext();
  const { usuario, getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, [competencia, filtroResponsavel]);

  function carregar() {
    setLoading(true);
    const responsavelId = getResponsavelIdFiltro();
    const params = new URLSearchParams();
    if (responsavelId) params.append('responsavelId', responsavelId);
    api.get(`/dashboard/${competencia}?${params}`)
      .then(r => setDados(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const primeiroNome = usuario?.nome?.split(' ')[0] || '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) return <div className="flex items-center justify-center h-64 text-muted text-sm">Carregando dashboard...</div>;
  if (!dados) return null;

  const pct = dados.total ? Math.round((dados.FINALIZADO / dados.total) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">{saudacao}, {primeiroNome} 👋</h1>
        <p className="text-muted text-sm mt-1">{MESES[mes]} / {ano} — {(dados.NAO_INICIADO || 0) + (dados.PARCIAL || 0)} empresa(s) pendente(s)</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total de empresas" value={dados.total} cor="text-ink" />
        <KpiCard label="Finalizadas" value={dados.FINALIZADO || 0} cor="text-green-700" destaque={`${pct}%`} />
        <KpiCard label="Em andamento" value={dados.PARCIAL || 0} cor="text-amber-700" />
        <KpiCard label="Não iniciadas" value={dados.NAO_INICIADO || 0} cor="text-red-700" />
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Com funcionários" value={dados.comFuncionarios || 0} cor="text-blue-700" />
        <KpiCard label="Com pró-labore" value={dados.comProLabore || 0} cor="text-purple-700" />
        <KpiCard label="CCT desatualizada" value={dados.cctPendentes || 0} cor={dados.cctPendentes > 0 ? 'text-red-700' : 'text-green-700'} sub={dados.cctPendentes > 0 ? 'Requer atenção' : 'Tudo em dia'} />
        <KpiCard label="Reajuste pendente" value={dados.reajustePendente || 0} cor={dados.reajustePendente > 0 ? 'text-amber-700' : 'text-green-700'} sub={dados.reajustePendente > 0 ? 'Aguardando aplicação' : 'Todos aplicados'} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Progresso por responsável */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Progresso por Responsável</span>
            <span className="pill pill-gray">{MESES[mes]}</span>
          </div>
          <div className="p-5 space-y-4">
            {dados.porResponsavel?.map(r => {
              const p = r.total ? Math.round((r.finalizados / r.total) * 100) : 0;
              return (
                <div key={r.id}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink">{r.nome}</span>
                    <span className="text-xs text-faint">{r.finalizados}/{r.total} · {p}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p}%`, background: p === 100 ? '#3B6D11' : p > 0 ? '#185FA5' : '#A32D2D' }} />
                  </div>
                </div>
              );
            })}
            {!dados.porResponsavel?.length && (
              <p className="text-xs text-faint text-center py-4">Sem dados de responsáveis.</p>
            )}
          </div>
        </div>

        {/* Progresso geral */}
        <div className="card">
          <div className="card-header"><span className="card-title">Progresso geral</span></div>
          <div className="p-5 flex flex-col items-center justify-center gap-4 h-40">
            <p className="font-display font-bold text-5xl" style={{ color: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D' }}>
              {pct}%
            </p>
            <div className="progress-bar w-full">
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D' }} />
            </div>
            <p className="text-xs text-faint">{dados.FINALIZADO || 0} de {dados.total} empresas finalizadas</p>
          </div>
        </div>
      </div>

      {/* Gráfico de evolução */}
      {dados.evolucao?.length > 0 && (
        <GraficoBarras dados={dados.evolucao} />
      )}
    </div>
  );
}
