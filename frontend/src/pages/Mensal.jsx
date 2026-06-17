import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = {
  N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800',
  N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800'
};

const BOLINHA = {
  vermelho: { bg: 'bg-red-500',    title: 'Entrega em atraso' },
  laranja:  { bg: 'bg-orange-400', title: 'Próximo do vencimento (≤3 dias)' },
  azul:     { bg: 'bg-blue-400',   title: 'Dentro do prazo' },
};

function Bolinha({ tipo }) {
  if (!tipo) return null;
  const b = BOLINHA[tipo];
  return <span title={b.title} className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${b.bg}`} />;
}

const fmtData = d => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export default function Mensal() {
  const { competencia } = useOutletContext();
  const { getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroBolinha, setFiltroBolinha] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [competencia, filtroResponsavel]);

  function carregar() {
    setLoading(true);
    const responsavelId = getResponsavelIdFiltro();
    const params = new URLSearchParams();
    if (responsavelId) params.append('responsavelId', responsavelId);
    api.get(`/mensal/${competencia}?${params}`)
      .then(r => setLinhas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const filtradas = linhas.filter(l => {
    const matchTipo =
      filtroTipo === 'TODAS'         ? true :
      filtroTipo === 'FUNCIONARIOS'  ? l.temFuncionarios :
      filtroTipo === 'PROLABORE'     ? l.temProLabore :
      filtroTipo === 'SO_PROLABORE'  ? (l.temProLabore && !l.temFuncionarios) :
      filtroTipo === 'SEM_MOVIMENTO' ? l.semMovimento : true;

    const matchStatus =
      filtroStatus === 'TODOS'      ? true :
      filtroStatus === 'PENDENTES'  ? !l.concluido :
      filtroStatus === 'CONCLUIDOS' ? l.concluido : true;

    const matchBolinha = filtroBolinha === 'TODOS' || l._bolinha === filtroBolinha;

    const matchBusca = !busca ||
      l.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      l.nomeTarefa.toLowerCase().includes(busca.toLowerCase()) ||
      l.cnpj.includes(busca);

    return matchTipo && matchStatus && matchBolinha && matchBusca;
  });

  const tiposFiltro = [
    { key: 'TODAS',         label: 'Todas' },
    { key: 'FUNCIONARIOS',  label: 'Com funcionários' },
    { key: 'PROLABORE',     label: 'Pró-labore' },
    { key: 'SO_PROLABORE',  label: 'Só pró-labore' },
    { key: 'SEM_MOVIMENTO', label: 'Sem movimento' },
  ];

  const statusFiltro = [
    { key: 'TODOS',      label: 'Todos os status' },
    { key: 'PENDENTES',  label: 'Pendentes' },
    { key: 'CONCLUIDOS', label: 'Concluídos' },
  ];

  const bolinhaFiltro = [
    { key: 'TODOS',    label: 'Todas urgências' },
    { key: 'vermelho', label: '🔴 Em atraso' },
    { key: 'laranja',  label: '🟠 Próximo vencimento' },
    { key: 'azul',     label: '🔵 No prazo' },
  ];

  const emAtraso    = linhas.filter(l => !l.concluido && l._bolinha === 'vermelho').length;
  const proximoVenc = linhas.filter(l => !l.concluido && l._bolinha === 'laranja').length;
  const concluidas  = linhas.filter(l => l.concluido).length;

  return (
    <div>
      {/* KPIs */}
      {(emAtraso > 0 || proximoVenc > 0 || concluidas > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'vermelho' ? 'TODOS' : 'vermelho')}>
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{emAtraso} em atraso</p>
              <p className="text-[10px] text-faint">entrega vencida</p>
            </div>
          </div>
          <div
            className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'laranja' ? 'TODOS' : 'laranja')}>
            <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-700">{proximoVenc} próximo vencimento</p>
              <p className="text-[10px] text-faint">≤ 3 dias para entregar</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">{concluidas} concluídas</p>
              <p className="text-[10px] text-faint">de {linhas.length} no total</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar empresa ou tarefa..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="select w-auto" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          {statusFiltro.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {tiposFiltro.map(f => (
            <button key={f.key} onClick={() => setFiltroTipo(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtroTipo === f.key ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {filtroBolinha !== 'TODOS' && (
          <button onClick={() => setFiltroBolinha('TODOS')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-surface2 text-muted border-border flex items-center gap-1.5">
            <Bolinha tipo={filtroBolinha} />
            {bolinhaFiltro.find(b => b.key === filtroBolinha)?.label}
            <span className="ml-1 text-faint">✕</span>
          </button>
        )}
        <span className="text-xs text-faint ml-auto">{filtradas.length} entrega(s)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma entrega encontrada.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Empresa', 'Tarefa', 'Prazo', 'Responsável', 'Nível', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(l => (
                <tr key={l.id}
                  onClick={() => navigate(`/mensal/${l.empresaId}`, {
                    state: { competencia, grupoIdFoco: l.grupoId }
                  })}
                  className={`border-b border-border last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors ${l.concluido ? 'opacity-60' : ''}`}>

                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{l.razaoSocial}</p>
                    <p className="text-xs text-faint font-mono">
                      {l.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                    </p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {l.temFuncionarios && l.temProLabore  && <span className="text-[10px] text-blue-600">Func. + PL</span>}
                      {l.temFuncionarios && !l.temProLabore && <span className="text-[10px] text-blue-600">Funcionários</span>}
                      {!l.temFuncionarios && l.temProLabore && <span className="text-[10px] text-purple-600">Só pró-labore</span>}
                      {l.semMovimento && <span className="text-[10px] text-gray-500">Sem movimento</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{l.nomeTarefa}</p>
                    <p className="text-[10px] text-faint mt-0.5">
                      {l.isDiaUtil ? `${l.diaVencimento}º dia útil` : `Dia ${l.diaVencimento}`}
                      {l.mesSubsequente ? ' · mês seguinte' : ' · mesmo mês'}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!l.concluido && <Bolinha tipo={l._bolinha} />}
                      {l.concluido && <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />}
                      <div>
                        <p className={`text-sm font-semibold ${l.diasRestantes < 0 && !l.concluido ? 'text-red-700' : l.diasRestantes <= 3 && !l.concluido ? 'text-amber-700' : 'text-ink'}`}>
                          {fmtData(l.dataVencReal)}
                        </p>
                        {!l.concluido && (
                          <p className="text-[10px] text-faint">
                            {l.diasRestantes < 0
                              ? `${Math.abs(l.diasRestantes)} dia(s) atraso`
                              : l.diasRestantes === 0 ? 'Vence hoje'
                              : `${l.diasRestantes} dia(s)`}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted">{l.responsavel?.nome || '—'}</td>

                  <td className="px-4 py-3">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[l.nivel]}`}>
                      {l.nivel}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {l.concluido ? (
                      <span className="pill pill-green text-[10px]">
                        {l.dispensada ? 'Dispensada' : '✓ Entregue'}
                      </span>
                    ) : (
                      <span className={`pill text-[10px] ${l._bolinha === 'vermelho' ? 'pill-red' : l._bolinha === 'laranja' ? 'pill-amber' : 'pill-blue'}`}>
                        {l._bolinha === 'vermelho' ? 'Atrasado' : l._bolinha === 'laranja' ? 'Próximo' : 'No prazo'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
