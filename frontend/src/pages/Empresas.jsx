import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [incluirSaiu, setIncluirSaiu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef();
  const { isGestor, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [incluirSaiu]);

  function carregar() {
    setLoading(true);
    api.get(`/empresas?incluirSaiu=${incluirSaiu}`)
      .then(r => setEmpresas(r.data))
      .finally(() => setLoading(false));
  }

  async function marcarSaiu(emp) {
    const novo = !emp.saiuDoEscritorio;
    const msg = novo
      ? `Marcar "${emp.razaoSocial}" como saiu do escritório?`
      : `Reativar "${emp.razaoSocial}"?`;
    if (!window.confirm(msg)) return;
    await api.patch(`/empresas/${emp.id}/saiu`, { saiuDoEscritorio: novo });
    carregar();
  }

  async function excluir(emp) {
    if (!window.confirm(`EXCLUIR permanentemente "${emp.razaoSocial}"? Esta ação não pode ser desfeita.`)) return;
    await api.delete(`/empresas/${emp.id}`);
    carregar();
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const { data } = await api.post('/empresas/upload-lote', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(data);
      carregar();
    } catch (e) {
      setUploadResult({ error: 'Erro ao processar arquivo. Verifique o formato.' });
    } finally {
      setUploadLoading(false);
      fileRef.current.value = '';
    }
  }

  const filtradas = empresas.filter(e =>
    !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar empresa ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />

        {isGestor && (
          <button onClick={() => setIncluirSaiu(!incluirSaiu)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${incluirSaiu ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-surface text-muted border-border hover:border-border2'}`}>
            {incluirSaiu ? 'Ocultando: saíram do escritório' : 'Ver empresas que saíram'}
          </button>
        )}

        <span className="text-xs text-faint ml-1">{filtradas.length} empresa(s)</span>

        {isGestor && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => { setShowUpload(!showUpload); setUploadResult(null); }}
              className="btn btn-secondary">
              ↑ Importar lista
            </button>
            <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary">
              + Cadastrar empresa
            </button>
          </div>
        )}
      </div>

      {/* Painel de upload */}
      {showUpload && (
        <div className="card p-5 mb-4 border-2 border-dashed border-border2">
          <h3 className="font-semibold text-sm text-ink mb-1">Importar empresas em lote</h3>
          <p className="text-xs text-faint mb-3">
            Envie um arquivo <strong>.xlsx</strong> ou <strong>.txt</strong> com as colunas <strong>Razão Social</strong> e <strong>CNPJ</strong>.<br />
            No TXT, separe por ponto-e-vírgula: <code className="bg-surface2 px-1 rounded">RAZAO SOCIAL;00.000.000/0001-00</code><br />
            No Excel, use colunas com cabeçalho <code className="bg-surface2 px-1 rounded">Razão Social</code> e <code className="bg-surface2 px-1 rounded">CNPJ</code>.<br />
            Campos não preenchidos ficam como padrão — o operador pode editar depois.
          </p>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".txt,.csv,.xlsx,.xls"
              onChange={handleUpload} className="hidden" id="upload-lote" />
            <label htmlFor="upload-lote"
              className={`btn btn-primary cursor-pointer ${uploadLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadLoading ? 'Processando...' : 'Selecionar arquivo'}
            </label>
            {uploadResult && !uploadResult.error && (
              <div className="text-xs text-faint flex gap-4">
                <span className="text-green-700 font-semibold">✓ {uploadResult.criadas} criadas</span>
                {uploadResult.duplicadas > 0 && <span className="text-amber-700">{uploadResult.duplicadas} duplicadas (ignoradas)</span>}
                {uploadResult.erros?.length > 0 && <span className="text-red-600">{uploadResult.erros.length} com erro</span>}
              </div>
            )}
            {uploadResult?.error && (
              <span className="text-xs text-red-600">{uploadResult.error}</span>
            )}
          </div>
          {uploadResult?.erros?.length > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Erros encontrados:</p>
              {uploadResult.erros.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

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
                <tr key={emp.id} className={`border-b border-border last:border-b-0 hover:bg-surface2 ${emp.saiuDoEscritorio ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                        <p className="text-xs text-faint font-mono">{fmtCNPJ(emp.cnpj)}</p>
                      </div>
                      {emp.saiuDoEscritorio && <span className="pill pill-amber text-[10px]">Saiu</span>}
                    </div>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {isGestor && (
                        <button onClick={() => navigate(`/empresas/${emp.id}/editar`)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      )}
                      {isGestor && (
                        <button onClick={() => marcarSaiu(emp)}
                          className={`text-xs font-medium hover:underline ${emp.saiuDoEscritorio ? 'text-green-600' : 'text-amber-600'}`}>
                          {emp.saiuDoEscritorio ? 'Reativar' : 'Saiu do escritório'}
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => excluir(emp)} className="text-xs text-red-500 hover:underline font-medium">Excluir</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
