import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const STATUS_LABEL = { NAO_INICIADO:'Não iniciado', PARCIAL:'Em andamento', FINALIZADO:'Finalizado' };
const STATUS_PILL  = { NAO_INICIADO:'pill-red', PARCIAL:'pill-amber', FINALIZADO:'pill-green' };
const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };

const BOLINHA = {
  vermelho: { bg: 'bg-red-500',    title: 'Entrega em atraso' },
  laranja:  { bg: 'bg-orange-400', title: 'Próximo do vencimento (≤3 dias)' },
  azul:     { bg: 'bg-blue-400',   title: 'Dentro do prazo' },
};

function Bolinha({ tipo }) {
  if (!tipo) return null;
  const b = BOLINHA[tipo];
  return (
    <span
      title={b.title}
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${b.bg}`} />
  );
}

export default function Mensal() {
  const { competencia } = useOutletContext();
  const { getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroBolinha, setFiltroBolinha] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  const diaHoje = new Date().getDate();
  const JANELA_DIAS = 20;

  useEffect(() => {
    carregar();
  }, [competencia, filtroResponsavel]);

  function carregar() {
    setLoading(true);
    const responsavelId = getResponsavelIdFiltro();
    const params = new URLSearchParams();
    if (responsavelId) params.append('responsavelId', responsavelId);
    api.get(`/mensal/${competencia}?${params}`)
      .then(r => setEmpresas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // Empresas visíveis na janela de 20 dias:
  // Aparece se: tem tarefa pendente com vencimento <= (hoje + 20) OU tem tarefa em atraso
  function dentroDaJanela(emp) {
    if (!emp.participaTarefas) return false;
    if (emp._totalGrupos === 0) return false;
    if (emp.historico?.status === 'FINALIZADO') return false;
    if (emp._bolinha === 'vermelho') return true; // atraso sempre aparece
    if (emp._diaVencimentoMinimo === null) return false;
    return emp._diaVencimentoMinimo <= diaHoje + JANELA_DIAS;
  }

  const filtradas = empresas.filter(e => {
    const matchTipo =
      filtroTipo === 'TODAS' ||
      (filtroTipo === 'FUNCIONARIOS' && e.temFuncionarios) ||
      (filtroTipo === 'PROLABORE' && e.temProLabore && !e.temFuncionarios) ||
      (filtroTipo === 'SEM_MOVIMENTO' && e.semMovimento && !e.temFuncionarios && !e.temProLabore);
    const matchStatus = filtroStatus === 'TODOS' || e.historico?.status === filtroStatus;
    const matchBolinha = filtroBolinha === 'TODOS' || e._bolinha === filtroBolinha;
    const matchBusca = !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca);
    return matchTipo && matchStatus && matchBolinha && matchBusca;
  });

  const tiposFiltro = [
    { key: 'TODAS', label: 'Todas' },
    { key: 'FUNCIONARIOS', label: 'Com funcionários' },
    { key: 'PROLABORE', label: 'Pró-labore' },
    { key: 'SEM_MOVIMENTO', label: 'Sem movimento' },
  ];

  const statusFiltro = [
    { key: 'TODOS', label: 'Todos os status' },
    { key: 'NAO_INICIADO', label: 'Não iniciado' },
    { key: 'PARCIAL', label: 'Em andamento' },
    { key: 'FINALIZADO', label: 'Finalizado' },
  ];

  const bolinhaFiltro = [
    { key: 'TODOS', label: 'Todas urgências' },
    { key: 'vermelho', label: '🔴 Em atraso' },
    { key: 'laranja',  label: '🟠 Próximo vencimento' },
    { key: 'azul',     label: '🔵 No prazo' },
  ];

  // Contagens para os KPIs rápidos
  const totalJanela = empresas.filter(dentroDaJanela).length;
  const emAtraso = empresas.filter(e => e._bolinha === 'vermelho').length;
  const proximoVenc = empresas.filter(e => e._bolinha === 'laranja').length;

  return (
    <div>
      {/* KPIs rápidos da janela de 20 dias */}
      {(totalJanela > 0 || emAtraso > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'vermelho' ? 'TODOS' : 'vermelho')}>
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{emAtraso} em atraso</p>
              <p className="text-[10px] text-faint">entrega vencida</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'laranja' ? 'TODOS' : 'laranja')}>
            <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-700">{proximoVenc} próximo vencimento</p>
              <p className="text-[10px] text-faint">≤ 3 dias para entregar</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3 cursor-pointer hover:bg-surface2"
            onClick={() => setFiltroBolinha(filtroBolinha === 'azul' ? 'TODOS' : 'azul')}>
            <div className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700">{totalJanela} nos próximos 20 dias</p>
              <p className="text-[10px] text-faint">dentro da janela</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar empresa..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="select w-auto" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          {statusFiltro.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {tiposFiltro.map(f => (
            <button key={f.key} onClick={() => setFiltroTipo(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtroTipo===f.key?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {filtroBolinha !== 'TODOS' && (
          <button onClick={() => setFiltroBolinha('TODOS')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-surface2 text-muted border-border hover:border-border2 flex items-center gap-1.5">
            <Bolinha tipo={filtroBolinha} />
            {bolinhaFiltro.find(b => b.key === filtroBolinha)?.label}
            <span className="ml-1 text-faint">✕</span>
          </button>
        )}
        <span className="text-xs text-faint ml-auto">{filtradas.length} empresa(s)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Empresa', 'Tipo', 'Responsável', 'Nível', 'Status', 'Progresso'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => {
                const status = emp.historico?.status || 'NAO_INICIADO';
                const total = emp._totalGrupos || 0;
                const entregues = emp._entregues || 0;
                const pct = total ? Math.round((entregues / total) * 100) : 0;
                const naJanela = dentroDaJanela(emp);

                return (
                  <tr key={emp.id}
                    onClick={() => navigate(`/mensal/${emp.id}`, { state: { competencia } })}
                    className="border-b border-border last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                      <p className="text-xs text-faint font-mono">
                        {emp.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                      </p>
                      {emp.prazoEntrega && (
                        <p className="text-[10px] text-faint mt-0.5">Prazo: dia {emp.prazoEntrega}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {emp.temFuncionarios ? 'Com funcionários' : emp.temProLabore ? 'Pró-labore' : emp.semMovimento ? 'Sem movimento' : 'Outros'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{emp.responsavel?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[emp.nivel]}`}>
                        {emp.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill text-[10px] ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Bolinha de urgência */}
                        {status !== 'FINALIZADO' && emp._bolinha && (
                          <Bolinha tipo={emp._bolinha} />
                        )}
                        {status === 'FINALIZADO' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title="Concluído" />
                        )}
                        {total > 0 ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden min-w-[50px]">
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D'
                                }} />
                            </div>
                            <span className="text-xs text-faint w-7 text-right">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-faint">sem tarefas</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
