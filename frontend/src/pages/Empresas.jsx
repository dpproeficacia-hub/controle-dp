import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const { isGestor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/empresas').then(r => setEmpresas(r.data)).finally(() => setLoading(false));
  }, []);

  const filtradas = empresas.filter(e =>
    !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Buscar empresa ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />
        <span className="text-xs text-faint ml-1">{filtradas.length} empresa(s)</span>
        {isGestor && (
          <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary ml-auto">+ Cadastrar empresa</button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Empresa','Enquadramento','Tipo','Responsável','Nível','Prazo',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => (
                <tr key={emp.id} className="border-b border-border last:border-b-0 hover:bg-surface2 cursor-pointer"
                  onClick={() => navigate(`/mensal/${emp.id}`)}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                    <p className="text-xs text-faint font-mono">{fmtCNPJ(emp.cnpj)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pill pill-teal text-[11px]">{emp.enquadramento.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.tipo.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.responsavel?.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[emp.nivel]}`}>{emp.nivel}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.prazoEntrega ? `Dia ${emp.prazoEntrega}` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {isGestor && (
                      <button onClick={e => { e.stopPropagation(); navigate(`/empresas/${emp.id}/editar`); }}
                        className="text-xs text-blue-600 hover:underline">Editar</button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtradas.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-faint">Nenhuma empresa encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
