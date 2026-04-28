import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Dashboard() {
  const { competencia, mes, ano } = useOutletContext();
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/${competencia}`)
      .then(r => setDados(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [competencia]);

  const primeiroNome = usuario?.nome?.split(' ')[0] || '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  if (loading) return <div className="flex items-center justify-center h-64 text-muted text-sm">Carregando dashboard...</div>;
  if (!dados) return null;

  const pct = dados.total ? Math.round((dados.FINALIZADO / dados.total) * 100) : 0;

  return (
    <div>
      {/* Saudação */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">{saudacao}, {primeiroNome} 👋</h1>
        <p className="text-muted text-sm mt-1">{MESES[mes]} / {ano} — {dados.NAO_INICIADO + dados.PARCIAL} empresa(s) pendente(s)</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total" value={dados.total} cor="bg-ink text-bg" />
        <KpiCard label="Finalizadas" value={dados.FINALIZADO || 0} cor="text-green-700" destaque={`${pct}%`} />
        <KpiCard label="Em andamento" value={dados.PARCIAL || 0} cor="text-amber-700" />
        <KpiCard label="Não iniciadas" value={dados.NAO_INICIADO || 0} cor="text-red-700" />
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
                    <span className="text-xs text-muted">{r.finalizados}/{r.total} · <strong>{p}%</strong></span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${p}%`,
                      background: p >= 80 ? '#3B6D11' : p >= 40 ? '#854F0B' : '#A32D2D'
                    }} />
                  </div>
                </div>
              );
            })}
            {!dados.porResponsavel?.length && <p className="text-sm text-faint">Nenhum dado</p>}
          </div>
        </div>

        {/* Tipos + Alertas */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header"><span className="card-title">Composição da carteira</span></div>
            <div className="p-4 grid grid-cols-3 gap-3">
              <StatMini label="Com funcionários" value={dados.comFuncionarios} color="green" />
              <StatMini label="Pró-labore" value={dados.comProLabore} color="blue" />
              <StatMini label="Sem movimento" value={dados.semMovimento} color="gray" />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Alertas CCT / Sindical</span>
              {dados.cctPendentes > 0 && <span className="pill pill-red">{dados.cctPendentes} pendente(s)</span>}
            </div>
            <div className="p-4 space-y-2">
              <AlertRow label="CCT desatualizada" value={dados.cctPendentes} tipo="red" />
              <AlertRow label="Reajuste não aplicado" value={dados.reajustePendente} tipo="amber" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progresso geral */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="card-title">Progresso geral — {MESES[mes]} {ano}</span>
          <span className="font-display font-bold text-xl text-ink">{pct}%</span>
        </div>
        <div className="progress-bar h-3">
          <div className="progress-fill h-3" style={{
            width: `${pct}%`,
            background: pct >= 80 ? '#3B6D11' : pct >= 40 ? '#854F0B' : '#A32D2D'
          }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-faint">
          <span>{dados.FINALIZADO || 0} finalizadas</span>
          <span>{dados.total} total</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, cor, destaque }) {
  const isInvertido = cor === 'bg-ink text-bg';
  return (
    <div className={`card p-4 ${isInvertido ? 'bg-ink' : ''}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isInvertido ? 'text-zinc-400' : 'text-faint'}`}>{label}</p>
      <p className={`font-display font-bold text-3xl leading-none ${isInvertido ? 'text-bg' : cor}`}>{value}</p>
      {destaque && <p className={`text-xs mt-1.5 ${isInvertido ? 'text-zinc-500' : 'text-faint'}`}>{destaque} concluídas</p>}
    </div>
  );
}

function StatMini({ label, value, color }) {
  const cores = { green:'text-green-700 bg-green-50', blue:'text-blue-700 bg-blue-50', gray:'text-zinc-600 bg-zinc-50' };
  return (
    <div className={`rounded-lg p-3 ${cores[color]}`}>
      <p className="font-display font-bold text-2xl leading-none">{value}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

function AlertRow({ label, value, tipo }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted">{label}</span>
      <span className={`pill ${tipo === 'red' ? 'pill-red' : 'pill-amber'}`}>{value}</span>
    </div>
  );
}
