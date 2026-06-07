import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const STATUS_LABEL = { NAO_INICIADO:'Não iniciado', PARCIAL:'Em andamento', FINALIZADO:'Finalizado' };
const STATUS_PILL  = { NAO_INICIADO:'pill-red', PARCIAL:'pill-amber', FINALIZADO:'pill-green' };
const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };

export default function Mensal() {
  const { competencia } = useOutletContext();
  const { getResponsavelIdFiltro, filtroResponsavel } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

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

  const filtradas = empresas.filter(e => {
    const matchTipo =
      filtroTipo === 'TODAS' ||
      (filtroTipo === 'FUNCIONARIOS' && e.temFuncionarios) ||
      (filtroTipo === 'PROLABORE' && e.temProLabore && !e.temFuncionarios) ||
      (filtroTipo === 'SEM_MOVIMENTO' && e.semMovimento && !e.temFuncionarios && !e.temProLabore);
    const matchStatus = filtroStatus === 'TODOS' || e.historico?.status === filtroStatus;
    const matchBusca = !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca);
    return matchTipo && matchStatus && matchBusca;
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

  return (
    <div>
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

                return (
                  <tr key={emp.id}
                    onClick={() => navigate(`/mensal/${emp.id}`, { state: { competencia } })}
                    className="border-b border-border last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                      <p className="text-xs text-faint font-mono">{emp.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {emp.temFuncionarios ? 'Com funcionários' : emp.temProLabore ? 'Pró-labore' : emp.semMovimento ? 'Sem movimento' : 'Outros'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{emp.responsavel?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[emp.nivel]}`}>{emp.nivel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill text-[10px] ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden min-w-[60px]">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D' }} />
                          </div>
                          <span className="text-xs text-faint w-8 text-right">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
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
