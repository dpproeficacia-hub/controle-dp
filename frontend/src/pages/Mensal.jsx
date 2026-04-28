import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../lib/api';

const STATUS_LABEL = { NAO_INICIADO:'Não iniciado', PARCIAL:'Em andamento', FINALIZADO:'Finalizado' };
const STATUS_PILL  = { NAO_INICIADO:'pill-red', PARCIAL:'pill-amber', FINALIZADO:'pill-green' };
const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };

export default function Mensal() {
  const { competencia } = useOutletContext();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODAS');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get(`/mensal/${competencia}`)
      .then(r => setEmpresas(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [competencia]);

  const filtradas = empresas.filter(e => {
    const matchFiltro = filtro === 'TODAS' || e.historico?.status === filtro;
    const matchBusca = !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca);
    return matchFiltro && matchBusca;
  });

  function calcPct(e) {
    const h = e.historico;
    if (!h) return 0;
    let campos = [];
    if (e.temFuncionarios) campos = ['folhaOk','inssOk','fgtsOk','irOk'];
    else if (e.temProLabore) campos = ['proLaboreOk','inssOk','fgtsOk'];
    else if (e.semMovimento) campos = ['semMovimentoOk'];
    const total = campos.length;
    const feitos = campos.filter(c => h[c]).length;
    return total ? Math.round((feitos/total)*100) : 0;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder="Buscar empresa ou CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        {['TODAS','NAO_INICIADO','PARCIAL','FINALIZADO'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filtro === f ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
            {f === 'TODAS' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
        <span className="ml-auto text-xs text-faint">{filtradas.length} empresa(s)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Empresa','Tipo','Responsável','Nível','Progresso','Status',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => {
                const pct = calcPct(emp);
                const status = emp.historico?.status || 'NAO_INICIADO';
                return (
                  <tr key={emp.id} onClick={() => navigate(`/mensal/${emp.id}`, { state: { competencia } })}
                    className="cursor-pointer hover:bg-surface2 transition-colors border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                      <p className="text-xs text-faint font-mono">{emp.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${emp.temFuncionarios ? 'pill-green' : emp.temProLabore ? 'pill-blue' : 'pill-gray'}`}>
                        {emp.temFuncionarios ? 'Funcionários' : emp.temProLabore ? 'Pró-labore' : 'Sem movimento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{emp.responsavel?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[emp.nivel]}`}>{emp.nivel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-20">
                          <div className="progress-fill" style={{ width:`${pct}%`, background: pct===100?'#3B6D11':pct>0?'#854F0B':'#A32D2D' }} />
                        </div>
                        <span className="text-xs text-faint">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-blue-600 font-medium">
                        {status === 'FINALIZADO' ? 'Ver hist →' : 'Abrir →'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtradas.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-faint">Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
