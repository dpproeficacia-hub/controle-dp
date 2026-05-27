import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = { N1: 'bg-ink text-bg', N2: 'bg-red-100 text-red-800', N3: 'bg-amber-100 text-amber-800', N4: 'bg-blue-100 text-blue-800', N5: 'bg-green-100 text-green-800' };
const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [incluirSaiu, setIncluirSaiu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selecionadas, setSelecionadas] = useState([]);
  const [excluindoLote, setExcluindoLote] = useState(false);
  const fileRef = useRef();
  const { isGestor, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [incluirSaiu]);

  function carregar() {
    setLoading(true);
    setSelecionadas([]);
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
    if (!window.confirm(`EXCLUIR "${emp.razaoSocial}"? Esta ação não pode ser desfeita.`)) return;
    await api.delete(`/empresas/${emp.id}`);
    carregar();
  }

  async function excluirEmLote() {
    if (selecionadas.length === 0) return;
    const nomes = empresas.filter(e => selecionadas.includes(e.id)).map(e => e.razaoSocial);
    const confirmMsg = `EXCLUIR ${selecionadas.length} empresa(s)?\n\n${nomes.slice(0, 5).join('\n')}${nomes.length > 5 ? `\n...e mais ${nomes.length - 5}` : ''}\n\nEsta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMsg)) return;
    setExcluindoLote(true);
    try {
      await api.post('/empresas/excluir-lote', { ids: selecionadas });
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir empresas');
    } finally {
      setExcluindoLote(false);
    }
  }

  function toggleSelecao(id) {
    setSelecionadas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleTodas() {
    if (selecionadas.length === filtradas.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(filtradas.map(e => e.id));
    }
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

  const todasSelecionadas = filtradas.length > 0 && selecionadas.length === filtradas.length;
  const algumasSelecionadas = selecionadas.length > 0 && selecionadas.length < filtradas.length;

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

        <div className="flex items-center gap-2 ml-auto">
          {isGestor && selecionadas.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs font-semibold text-red-700">{selecionadas.length} selecionada(s)</span>
              <button onClick={excluirEmLote} disabled={excluindoLote}
                className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-300 px-2 py-0.5 rounded hover:bg-red-100 transition-colors">
                {excluindoLote ? 'Excluindo...' : 'Excluir selecionadas'}
              </button>
              <button onClick={() => setSelecionadas([])} className="text-xs text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          {isGestor && (
            <>
              <button onClick={() => { setShowUpload(!showUpload); setUploadResult(null); }} className="btn btn-secondary">
                ↑ Importar lista
              </button>
              <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary">
                + Cadastrar empresa
              </button>
            </>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="card p-5 mb-4 border-2 border-dashed border-border2">
          <h3 className="font-semibold text-sm text-ink mb-1">Importar empresas em lote</h3>
          <p className="text-xs text-faint mb-3">
            Envie um arquivo <strong>.xlsx</strong> ou <strong>.txt</strong> com as colunas <strong>Razão Social</strong> e <strong>CNPJ</strong>.<br />
            No TXT, separe por ponto-e-vírgula: <code className="bg-surface2 px-1 rounded">RAZAO SOCIAL;00.000.000/0001-00</code><br />
            No Excel, use colunas com cabeçalho <code className="bg-surface2 px-1 rounded">Razão Social</code> e <code className="bg-surface2 px-1 rounded">CNPJ</code>.
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
            {uploadResult?.error && <span className="text-xs text-red-600">{uploadResult.error}</span>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {isGestor && (
                  <th className="px-4 py-2.5 border-b border-border w-8">
                    <div onClick={toggleTodas}
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${todasSelecionadas ? 'bg-ink border-ink' : algumasSelecionadas ? 'bg-ink/30 border-ink/50' : 'border-border2 hover:border-muted'}`}>
                      {(todasSelecionadas || algumasSelecionadas) && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
                {['Empresa', 'Enquadramento', 'Tipo', 'Responsável', 'Nível', 'Prazo', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => (
                <tr key={emp.id} className={`border-b border-border last:border-b-0 hover:bg-surface2 ${emp.saiuDoEscritorio ? 'opacity-50' : ''} ${selecionadas.includes(emp.id) ? 'bg-red-50' : ''}`}>
                  {isGestor && (
                    <td className="px-4 py-3 w-8">
                      <div onClick={() => toggleSelecao(emp.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${selecionadas.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2 hover:border-muted'}`}>
                        {selecionadas.includes(emp.id) && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">{emp.razaoSocial}</p>
                        {emp.saiuDoEscritorio && (
                          <span className="pill pill-amber text-[10px]">Saiu</span>
                        )}
                        {emp.temFilial && emp.filiaisVinculadas?.length > 0 && (
                          <span className="pill pill-blue text-[10px]">
                            Matriz · {emp.filiaisVinculadas.length} filial(is)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-faint font-mono">{fmtCNPJ(emp.cnpj)}</p>
                      {/* Badge de filial — aparece quando a empresa tem matriz vinculada */}
                      {emp.matriz && (
                        <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                          ↳ Filial de {emp.matriz.razaoSocial}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pill pill-teal text-[11px]">{emp.enquadramento.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.tipo.replace(/_/g, ' ')}</td>
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
                      {isGestor && (
                        <button onClick={() => excluir(emp)} className="text-xs text-red-500 hover:underline font-medium">Excluir</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtradas.length && (
                <tr><td colSpan={isGestor ? 8 : 7} className="px-4 py-10 text-center text-sm text-faint">Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
