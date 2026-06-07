import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function KpiCard({ label, value, cor, destaque }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`font-display font-bold text-3xl ${cor}`}>{value ?? '—'}</p>
        {destaque && <p className="text-sm font-semibold text-faint mb-0.5">{destaque}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { competencia, mes, ano } = useOutletContext();
  const { usuario, getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, [competencia, filtroResponsavel]);

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
        <p className="text-muted text-sm mt-1">{MESES[mes]} / {ano} — {dados.NAO_INICIADO + dados.PARCIAL} empresa(s) pendente(s)</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total" value={dados.total} cor="bg-ink text-bg" />
        <KpiCard label="Finalizadas" value={dados.FINALIZADO || 0} cor="text-green-700" destaque={`${pct}%`} />
        <KpiCard label="Em andamento" value={dados.PARCIAL || 0} cor="text-amber-700" />
        <KpiCard label="Não iniciadas" value={dados.NAO_INICIADO || 0} cor="text-red-700" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
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

        <div className="card">
          <div className="card-header">
            <span className="card-title">Progresso geral</span>
          </div>
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
    </div>
  );
}
