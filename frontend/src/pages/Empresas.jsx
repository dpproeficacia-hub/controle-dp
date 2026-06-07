import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = { N1: 'bg-ink text-bg', N2: 'bg-red-100 text-red-800', N3: 'bg-amber-100 text-amber-800', N4: 'bg-blue-100 text-blue-800', N5: 'bg-green-100 text-green-800' };

const LABEL_ENQ = {
  SIMPLES_NACIONAL: 'Simples', LUCRO_PRESUMIDO: 'L. Presumido', LUCRO_REAL: 'L. Real',
  MEI: 'MEI', CEI: 'CEI', DOMESTICA: 'Doméstica', PRODUTOR_RURAL: 'Prod. Rural',
  PESSOA_FISICA: 'Pessoa Física', ENTIDADES: 'Entidades',
};

const LABEL_ANEXO = {
  ANEXO_I: 'Anx. I', ANEXO_II: 'Anx. II', ANEXO_III: 'Anx. III',
  ANEXO_IV: 'Anx. IV', ANEXO_V: 'Anx. V',
};

const fmtDoc = (cnpj, tipo) => {
  if (!cnpj) return '—';
  const n = cnpj.replace(/\D/g, '');
  if (tipo === 'CPF')  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (tipo === 'CEI' || tipo === 'CNO') return n.replace(/(\d{2})(\d{3})(\d{5})(\d{2})/, '$1.$2.$3/$4');
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [incluirSaiu, setIncluirSaiu] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [excluindoLote, setExcluindoLote] = useState(false);
  const { isGestor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [incluirSaiu]);

  function carregar() {
    setLoading(true);
    setSelecionadas([]);
    api.get(`/empresas?incluirSaiu=${incluirSaiu}`)
      .then(r => setEmpresas(r.data))
      .finally(() => setLoading(false));
  }

  async function marcarSaiu(e, emp) {
    e.stopPropagation();
    const novo = !emp.saiuDoEscritorio;
    if (!window.confirm(novo ? `Marcar "${emp.razaoSocial}" como saiu do escritório?` : `Reativar "${emp.razaoSocial}"?`)) return;
    await api.patch(`/empresas/${emp.id}/saiu`, { saiuDoEscritorio: novo });
    carregar();
  }

  async function excluir(e, emp) {
    e.stopPropagation();
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

  function toggleSelecao(e, id) {
    e.stopPropagation();
    setSelecionadas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleTodas(e) {
    e.stopPropagation();
    if (selecionadas.length === filtradas.length) setSelecionadas([]);
    else setSelecionadas(filtradas.map(e => e.id));
  }

  function abrirEmpresa(emp) {
    // Passa a lista filtrada para navegação entre empresas
    navigate(`/empresas/${emp.id}/editar`, {
      state: { listaIds: filtradas.map(e => e.id) }
    });
  }

  const filtradas = empresas.filter(e =>
    !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca)
  );

  const todasSelecionadas = filtradas.length > 0 && selecionadas.length === filtradas.length;
  const algumasSelecionadas = selecionadas.length > 0 && selecionadas.length < filtradas.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar por nome ou documento..."
          value={busca} onChange={e => setBusca(e.target.value)} />

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
              <button onClick={() => navigate('/importacao')} className="btn btn-secondary">
                ↑ Importar lista
              </button>
              <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary">
                + Cadastrar empresa
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {isGestor && (
                  <th className="px-4 py-2.5 border-b border-border w-8" onClick={toggleTodas}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${todasSelecionadas ? 'bg-ink border-ink' : algumasSelecionadas ? 'bg-ink/30 border-ink/50' : 'border-border2 hover:border-muted'}`}>
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
                <tr
                  key={emp.id}
                  onClick={() => abrirEmpresa(emp)}
                  className={`border-b border-border last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors ${emp.saiuDoEscritorio ? 'opacity-50' : ''} ${selecionadas.includes(emp.id) ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                  {isGestor && (
                    <td className="px-4 py-3 w-8" onClick={e => e.stopPropagation()}>
                      <div onClick={e => toggleSelecao(e, emp.id)}
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
                        {emp.saiuDoEscritorio && <span className="pill pill-amber text-[10px]">Saiu</span>}
                        {emp.temFilial && emp.filiaisVinculadas?.length > 0 && (
                          <span className="pill pill-blue text-[10px]">Matriz · {emp.filiaisVinculadas.length} filial(is)</span>
                        )}
                      </div>
                      <p className="text-xs text-faint font-mono">{fmtDoc(emp.cnpj, emp.tipoDocumento)} · {emp.tipoDocumento || 'CNPJ'}</p>
                      {emp.matriz && (
                        <p className="text-[11px] text-blue-600 font-medium">↳ Filial de {emp.matriz.razaoSocial}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="pill pill-teal text-[11px]">{LABEL_ENQ[emp.enquadramento] || emp.enquadramento}</span>
                      {emp.anexoSimples && (
                        <span className="pill pill-gray text-[10px]">{LABEL_ANEXO[emp.anexoSimples]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.tipo.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.responsavel?.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold ${NIVEL_BG[emp.nivel]}`}>{emp.nivel}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.prazoEntrega ? `Dia ${emp.prazoEntrega}` : '—'}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 justify-end">
                      {isGestor && (
                        <button onClick={e => marcarSaiu(e, emp)}
                          className={`text-xs font-medium hover:underline ${emp.saiuDoEscritorio ? 'text-green-600' : 'text-amber-600'}`}>
                          {emp.saiuDoEscritorio ? 'Reativar' : 'Saiu do escritório'}
                        </button>
                      )}
                      {isGestor && (
                        <button onClick={e => excluir(e, emp)} className="text-xs text-red-500 hover:underline font-medium">Excluir</button>
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
