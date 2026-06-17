import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NIVEL_BG = { N1:'bg-ink text-bg', N2:'bg-red-100 text-red-800', N3:'bg-amber-100 text-amber-800', N4:'bg-blue-100 text-blue-800', N5:'bg-green-100 text-green-800' };
const LABEL_ENQ = { SIMPLES_NACIONAL:'Simples', LUCRO_PRESUMIDO:'L. Presumido', LUCRO_REAL:'L. Real', MEI:'MEI', CEI:'CEI', DOMESTICA:'Doméstica', PRODUTOR_RURAL:'Prod. Rural', PESSOA_FISICA:'P. Física', ENTIDADES:'Entidades' };
const LABEL_ANEXO = { ANEXO_I:'Anx. I', ANEXO_II:'Anx. II', ANEXO_III:'Anx. III', ANEXO_IV:'Anx. IV', ANEXO_V:'Anx. V' };
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const fmtDoc = (cnpj, tipo) => {
  if (!cnpj) return '—';
  const n = cnpj.replace(/\D/g, '');
  if (tipo === 'CPF') return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (tipo === 'CEI' || tipo === 'CNO') return n.replace(/(\d{2})(\d{3})(\d{5})(\d{2})/, '$1.$2.$3/$4');
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const CAMPOS_LOTE = [
  { key: 'temFuncionarios',  label: 'Tem funcionários?',        tipo: 'toggle' },
  { key: 'temProLabore',     label: 'Tem pró-labore?',          tipo: 'toggle' },
  { key: 'enviaReinf',       label: 'Envia REINF?',             tipo: 'toggle' },
  { key: 'semMovimento',     label: 'Sem movimento?',           tipo: 'toggle' },
  { key: 'fatorR',           label: 'Fator R?',                 tipo: 'toggle' },
  { key: 'participaTarefas', label: 'Participa de tarefas?',    tipo: 'toggle' },
  { key: 'nivel',            label: 'Nível de complexidade',    tipo: 'select',
    opcoes: [{ v:'N1', l:'N1 — Mais complexo' }, { v:'N2', l:'N2' }, { v:'N3', l:'N3 — Intermediário' }, { v:'N4', l:'N4' }, { v:'N5', l:'N5 — Menos complexo' }] },
  { key: 'tipo',             label: 'Tipo da empresa',          tipo: 'select',
    opcoes: ['COMERCIO','INDUSTRIA','SERVICOS','ADVOCACIA','CLINICA','HOLDING','CONSTRUCAO_CIVIL','RURAL','DOMESTICO','TRANSPORTES','OUTROS'].map(v => ({ v, l: v.replace(/_/g,' ') })) },
  { key: 'enquadramento',    label: 'Enquadramento tributário', tipo: 'select',
    opcoes: [{ v:'SIMPLES_NACIONAL', l:'Simples Nacional' }, { v:'LUCRO_PRESUMIDO', l:'Lucro Presumido' }, { v:'LUCRO_REAL', l:'Lucro Real' }, { v:'MEI', l:'MEI' }, { v:'CEI', l:'CEI' }, { v:'DOMESTICA', l:'Doméstica' }, { v:'PRODUTOR_RURAL', l:'Produtor Rural' }, { v:'PESSOA_FISICA', l:'Pessoa Física' }, { v:'ENTIDADES', l:'Entidades' }] },
  { key: 'responsavelId',    label: 'Responsável',              tipo: 'responsavel' },
  { key: 'cidade',           label: 'Cidade',                   tipo: 'texto', placeholder: 'Ex: Divinópolis' },
  { key: 'estado',           label: 'Estado (UF)',              tipo: 'uf' },
];

const Checkbox = ({ checked, onClick }) => (
  <div
    onClick={onClick}
    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${checked ? 'bg-ink border-ink' : 'border-border2 hover:border-muted'}`}>
    {checked && (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
  </div>
);

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [incluirSaiu, setIncluirSaiu] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [excluindoLote, setExcluindoLote] = useState(false);
  const [mostraEdicaoLote, setMostraEdicaoLote] = useState(false);
  const [camposLote, setCamposLote] = useState({});
  const [camposAtivos, setCamposAtivos] = useState({});
  const [salvandoLote, setSalvandoLote] = useState(false);
  const { isGestor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [incluirSaiu]);
  useEffect(() => {
    // Lista de responsáveis é necessária para todos (campo de edição em lote ficou aberto a todos)
    api.get('/responsaveis').then(r => setResponsaveis(r.data)).catch(() => {});
  }, []);

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
    const nomes = empresas.filter(e => selecionadas.includes(e.id)).map(e => e.razaoSocial);
    if (!window.confirm(`EXCLUIR ${selecionadas.length} empresa(s)?\n\n${nomes.slice(0,5).join('\n')}${nomes.length > 5 ? `\n...e mais ${nomes.length - 5}` : ''}\n\nEsta ação não pode ser desfeita.`)) return;
    setExcluindoLote(true);
    try {
      await api.post('/empresas/excluir-lote', { ids: selecionadas });
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir');
    } finally {
      setExcluindoLote(false);
    }
  }

  async function salvarEdicaoLote() {
    const campos = {};
    for (const [key, ativo] of Object.entries(camposAtivos)) {
      if (ativo && camposLote[key] !== undefined) campos[key] = camposLote[key];
    }
    if (Object.keys(campos).length === 0) { alert('Selecione pelo menos um campo para editar.'); return; }
    if (!window.confirm(`Editar ${Object.keys(campos).length} campo(s) em ${selecionadas.length} empresa(s)?`)) return;
    setSalvandoLote(true);
    try {
      await api.post('/empresas/editar-lote', { ids: selecionadas, campos });
      setMostraEdicaoLote(false);
      setCamposLote({});
      setCamposAtivos({});
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao editar');
    } finally {
      setSalvandoLote(false);
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
            {incluirSaiu ? 'Ocultando: saíram' : 'Ver que saíram'}
          </button>
        )}

        <span className="text-xs text-faint ml-1">{filtradas.length} empresa(s)</span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Edição em lote — disponível para todos os níveis. Excluir continua restrito */}
          {selecionadas.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-semibold text-blue-700">{selecionadas.length} selecionada(s)</span>
              <button onClick={() => setMostraEdicaoLote(!mostraEdicaoLote)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors">
                ✏️ Editar em lote
              </button>
              {isGestor && (
                <button onClick={excluirEmLote} disabled={excluindoLote}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-300 px-2 py-0.5 rounded hover:bg-red-100 transition-colors">
                  {excluindoLote ? 'Excluindo...' : '🗑 Excluir'}
                </button>
              )}
              <button onClick={() => setSelecionadas([])} className="text-xs text-muted hover:text-ink">✕</button>
            </div>
          )}
          {/* Cadastrar empresa e importar — todos os níveis */}
          <button onClick={() => navigate('/importacao')} className="btn btn-secondary">↑ Importar</button>
          <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary">+ Cadastrar empresa</button>
        </div>
      </div>

      {/* Painel de edição em lote — disponível para todos */}
      {mostraEdicaoLote && selecionadas.length > 0 && (
        <div className="card p-5 mb-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-ink">Editar em lote — {selecionadas.length} empresa(s)</p>
              <p className="text-xs text-faint mt-0.5">Marque os campos que deseja alterar e defina o novo valor</p>
            </div>
            <button onClick={() => { setMostraEdicaoLote(false); setCamposLote({}); setCamposAtivos({}); }}
              className="text-xs text-muted hover:text-ink">✕ Fechar</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {CAMPOS_LOTE.map(campo => (
              <div key={campo.key}
                className={`p-3 rounded-lg border transition-all ${camposAtivos[campo.key] ? 'border-blue-300 bg-blue-50' : 'border-border bg-surface2'}`}>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox"
                    checked={camposAtivos[campo.key] || false}
                    onChange={e => setCamposAtivos(prev => ({ ...prev, [campo.key]: e.target.checked }))}
                    className="accent-ink" />
                  <span className="text-xs font-semibold text-ink">{campo.label}</span>
                </label>
                {camposAtivos[campo.key] && (
                  <div className="mt-1">
                    {campo.tipo === 'toggle' && (
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => setCamposLote(p => ({ ...p, [campo.key]: true }))}
                          className={`flex-1 py-1 rounded text-xs font-semibold border transition-all ${camposLote[campo.key] === true ? 'bg-green-600 text-white border-green-600' : 'bg-surface text-muted border-border'}`}>
                          Sim
                        </button>
                        <button type="button"
                          onClick={() => setCamposLote(p => ({ ...p, [campo.key]: false }))}
                          className={`flex-1 py-1 rounded text-xs font-semibold border transition-all ${camposLote[campo.key] === false ? 'bg-red-600 text-white border-red-600' : 'bg-surface text-muted border-border'}`}>
                          Não
                        </button>
                      </div>
                    )}
                    {campo.tipo === 'select' && (
                      <select className="select text-xs h-8"
                        value={camposLote[campo.key] || ''}
                        onChange={e => setCamposLote(p => ({ ...p, [campo.key]: e.target.value }))}>
                        <option value="">Selecionar...</option>
                        {campo.opcoes.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    )}
                    {campo.tipo === 'responsavel' && (
                      <select className="select text-xs h-8"
                        value={camposLote[campo.key] || ''}
                        onChange={e => setCamposLote(p => ({ ...p, [campo.key]: e.target.value || null }))}>
                        <option value="">Sem responsável</option>
                        {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                      </select>
                    )}
                    {campo.tipo === 'texto' && (
                      <input className="input text-xs h-8"
                        placeholder={campo.placeholder || ''}
                        value={camposLote[campo.key] || ''}
                        onChange={e => setCamposLote(p => ({ ...p, [campo.key]: e.target.value }))} />
                    )}
                    {campo.tipo === 'uf' && (
                      <select className="select text-xs h-8"
                        value={camposLote[campo.key] || ''}
                        onChange={e => setCamposLote(p => ({ ...p, [campo.key]: e.target.value }))}>
                        <option value="">Selecionar UF...</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={salvarEdicaoLote} disabled={salvandoLote} className="btn btn-primary">
              {salvandoLote
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : `Aplicar em ${selecionadas.length} empresa(s)`}
            </button>
            <button onClick={() => { setMostraEdicaoLote(false); setCamposLote({}); setCamposAtivos({}); }}
              className="btn btn-secondary">Cancelar</button>
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
                {/* Checkbox de seleção em lote disponível para todos */}
                <th className="px-4 py-2.5 border-b border-border w-8">
                  <Checkbox
                    checked={todasSelecionadas || algumasSelecionadas}
                    onClick={toggleTodas} />
                </th>
                {['Empresa', 'Enquadramento', 'Tipo', 'Responsável', 'Nível', 'Prazo', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => (
                <tr
                  key={emp.id}
                  onClick={() => navigate(`/empresas/${emp.id}/editar`, { state: { listaIds: filtradas.map(e => e.id) } })}
                  className={`border-b border-border last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors ${emp.saiuDoEscritorio ? 'opacity-50' : ''} ${selecionadas.includes(emp.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3 w-8" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selecionadas.includes(emp.id)}
                      onClick={e => toggleSelecao(e, emp.id)} />
                  </td>
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
                      {emp.cidade && emp.estado && (
                        <p className="text-[10px] text-faint">📍 {emp.cidade} - {emp.estado}</p>
                      )}
                      {emp.matriz && <p className="text-[11px] text-blue-600 font-medium">↳ Filial de {emp.matriz.razaoSocial}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="pill pill-teal text-[11px]">{LABEL_ENQ[emp.enquadramento] || emp.enquadramento}</span>
                      {emp.anexoSimples && <span className="pill pill-gray text-[10px]">{LABEL_ANEXO[emp.anexoSimples]}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{emp.tipo?.replace(/_/g, ' ')}</td>
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
                          {emp.saiuDoEscritorio ? 'Reativar' : 'Saiu'}
                        </button>
                      )}
                      {isGestor && (
                        <button onClick={e => excluir(e, emp)} className="text-xs text-red-500 hover:underline font-medium">
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtradas.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-faint">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
