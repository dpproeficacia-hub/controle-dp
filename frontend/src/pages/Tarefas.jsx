import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const FILTROS_TIPO = [
  { key: 'todas',          label: 'Todas' },
  { key: 'funcionarios',   label: 'Com funcionários' },
  { key: 'proLabore',      label: 'Pró-labore' },
  { key: 'soProLabore',    label: 'Só pró-labore' },
  { key: 'semMovimento',   label: 'Sem movimento' },
  { key: 'reinf',          label: 'Envia REINF' },
];

const ESCOPO_OPTS = [
  { key: 'todas',      label: 'Todas as empresas' },
  { key: 'uma',        label: 'Uma empresa específica' },
  { key: 'selecionar', label: 'Empresas selecionadas' },
];

const MESES = [
  { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
  { v: '04', l: 'Abril' },   { v: '05', l: 'Maio' },      { v: '06', l: 'Junho' },
  { v: '07', l: 'Julho' },   { v: '08', l: 'Agosto' },    { v: '09', l: 'Setembro' },
  { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' },  { v: '12', l: 'Dezembro' },
];

const anoAtual = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => anoAtual - 1 + i);

const formVazio = {
  nome: '', diaVencimento: '', tipo: 'RECORRENTE',
  inicioMes: '', inicioAno: '', isDiaUtil: false,
  escopo: 'todas', empresaId: '', empresasIds: [], subtarefas: [],
  _novaSubTemValor: false,
};

const Checkbox = ({ checked, onClick, indeterminate }) => (
  <div onClick={onClick}
    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${checked || indeterminate ? 'bg-ink border-ink' : 'border-border2 hover:border-muted'}`}>
    {checked && (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    {indeterminate && !checked && <div className="w-2 h-0.5 bg-white rounded" />}
  </div>
);

export default function Tarefas() {
  const [grupos, setGrupos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 50;
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(formVazio);
  const [editandoGrupo, setEditandoGrupo] = useState(null); // grupo agrupado sendo editado
  const [salvando, setSalvando] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);
  const [buscaInput, setBuscaInput] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTipoEmpresa, setFiltroTipoEmpresa] = useState('todas');
  const [buscaEmpresaForm, setBuscaEmpresaForm] = useState('');
  const [selecionadas, setSelecionadas] = useState([]);
  const [excluindoLote, setExcluindoLote] = useState(false);
  const [expandido, setExpandido] = useState({}); // quais grupos estão com empresas expandidas
  const { isGestor } = useAuth();

  useEffect(() => { api.get('/empresas').then(r => setTodasEmpresas(r.data)); }, []);
  useEffect(() => { carregar(page, filtroBusca); }, [page, filtroBusca]);
  useEffect(() => {
    const timer = setTimeout(() => { setFiltroBusca(buscaInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  function carregar(p = 1, busca = '') {
    setLoading(true);
    setSelecionadas([]);
    const params = new URLSearchParams({ page: p, limit: LIMIT, agrupado: 'true' });
    if (busca) params.append('busca', busca);
    api.get(`/grupos?${params}`)
      .then(r => { setGrupos(r.data.grupos); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }

  const empresasFiltradas = todasEmpresas.filter(emp => {
    const matchBusca = !buscaEmpresaForm || emp.razaoSocial.toLowerCase().includes(buscaEmpresaForm.toLowerCase());
    const matchTipo =
      filtroTipoEmpresa === 'todas'        ? true :
      filtroTipoEmpresa === 'funcionarios' ? emp.temFuncionarios :
      filtroTipoEmpresa === 'proLabore'    ? emp.temProLabore :
      filtroTipoEmpresa === 'soProLabore'  ? (emp.temProLabore && !emp.temFuncionarios) :
      filtroTipoEmpresa === 'semMovimento' ? emp.semMovimento :
      filtroTipoEmpresa === 'reinf'        ? emp.enviaReinf : true;
    return matchBusca && matchTipo;
  });

  function cancelar() {
    setEditandoGrupo(null);
    setForm(formVazio);
    setMostraForm(false);
    setFiltroTipoEmpresa('todas');
    setBuscaEmpresaForm('');
  }

  function iniciarEdicao(grupo) {
    setEditandoGrupo(grupo);
    let inicioMes = '', inicioAno = '';
    if (grupo.inicioCobrancaEm) {
      const d = new Date(grupo.inicioCobrancaEm);
      inicioMes = String(d.getUTCMonth() + 1).padStart(2, '0');
      inicioAno = String(d.getUTCFullYear());
    }
    setForm({
      ...formVazio,
      nome: grupo.nome,
      diaVencimento: grupo.diaVencimento,
      tipo: grupo.tipo,
      isDiaUtil: grupo.isDiaUtil || false,
      inicioMes, inicioAno,
      subtarefas: (grupo.subtarefas || []).map(s => ({ nome: s.nome, temValor: s.temValor })),
    });
    setMostraForm(true);
    window.scrollTo(0, 0);
  }

  function toggleEmpresa(id) {
    setForm(f => ({
      ...f,
      empresasIds: f.empresasIds.includes(id) ? f.empresasIds.filter(x => x !== id) : [...f.empresasIds, id]
    }));
  }

  function toggleTodasFiltradas() {
    const ids = empresasFiltradas.map(e => e.id);
    const todasMarcadas = ids.every(id => form.empresasIds.includes(id));
    if (todasMarcadas) setForm(f => ({ ...f, empresasIds: f.empresasIds.filter(id => !ids.includes(id)) }));
    else setForm(f => ({ ...f, empresasIds: [...new Set([...f.empresasIds, ...ids])] }));
  }

  function toggleSelecao(chave) {
    setSelecionadas(s => s.includes(chave) ? s.filter(x => x !== chave) : [...s, chave]);
  }

  function toggleTodas() {
    const chaves = grupos.map(g => g.nome + '||' + g.diaVencimento);
    if (selecionadas.length === chaves.length) setSelecionadas([]);
    else setSelecionadas(chaves);
  }

  async function excluirEmLote() {
    const gruposSelecionados = grupos.filter(g => selecionadas.includes(g.nome + '||' + g.diaVencimento));
    const totalEmpresas = gruposSelecionados.reduce((acc, g) => acc + g.empresas.length, 0);
    const nomes = gruposSelecionados.map(g => `${g.nome} (${g.empresas.length} empresa${g.empresas.length !== 1 ? 's' : ''})`);
    if (!window.confirm(`REMOVER ${gruposSelecionados.length} tarefa(s) de ${totalEmpresas} empresa(s)?\n\n${nomes.join('\n')}\n\nEsta ação não pode ser desfeita.`)) return;
    setExcluindoLote(true);
    try {
      const todosIds = gruposSelecionados.flatMap(g => g.ids);
      await api.delete('/grupos/lote', { data: { ids: todosIds } });
      carregar(1, filtroBusca);
      setPage(1);
    } catch {
      alert('Erro ao excluir tarefas.');
    } finally {
      setExcluindoLote(false);
    }
  }

  async function excluirGrupo(grupo) {
    if (!window.confirm(`REMOVER "${grupo.nome}" de ${grupo.empresas.length} empresa(s)?\n\nEsta ação não pode ser desfeita.`)) return;
    await api.delete('/grupos/lote', { data: { ids: grupo.ids } });
    carregar(page, filtroBusca);
  }

  async function salvar(e) {
    e.preventDefault();
    let inicioCobrancaEm = null;
    if (form.inicioMes && form.inicioAno) inicioCobrancaEm = `${form.inicioAno}-${form.inicioMes}-01`;

    setSalvando(true);
    try {
      if (editandoGrupo) {
        // Edita todas as cópias de uma vez
        await api.put('/grupos/lote', {
          ids: editandoGrupo.ids,
          nome: form.nome,
          diaVencimento: Number(form.diaVencimento),
          isDiaUtil: form.isDiaUtil || false,
          tipo: form.tipo,
          inicioCobrancaEm,
          subtarefas: form.subtarefas,
        });
      } else {
        // Cria nova tarefa
        let empresaIds;
        if (form.escopo === 'todas') empresaIds = todasEmpresas.map(e => e.id);
        else if (form.escopo === 'uma') {
          if (!form.empresaId) { alert('Selecione uma empresa.'); setSalvando(false); return; }
          empresaIds = [form.empresaId];
        } else {
          if (form.empresasIds.length === 0) { alert('Selecione pelo menos uma empresa.'); setSalvando(false); return; }
          empresaIds = form.empresasIds;
        }
        await api.post('/grupos', {
          nome: form.nome, diaVencimento: Number(form.diaVencimento),
          isDiaUtil: form.isDiaUtil || false, tipo: form.tipo,
          inicioCobrancaEm, subtarefas: form.subtarefas, empresaIds,
        });
      }
      cancelar();
      carregar(1, filtroBusca);
      setPage(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar tarefa');
    } finally {
      setSalvando(false);
    }
  }

  function fmtInicio(inicioCobrancaEm) {
    if (!inicioCobrancaEm) return null;
    const d = new Date(inicioCobrancaEm);
    return `${MESES[d.getUTCMonth()].l}/${d.getUTCFullYear()}`;
  }

  const totalPages = Math.ceil(total / LIMIT);
  const todasFiltradasSelecionadas = empresasFiltradas.length > 0 && empresasFiltradas.every(e => form.empresasIds.includes(e.id));
  const todasSelecionadas = grupos.length > 0 && selecionadas.length === grupos.length;
  const algumasSelecionadas = selecionadas.length > 0 && selecionadas.length < grupos.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Tarefas</h2>
          <p className="text-sm text-muted mt-0.5">Cada tarefa pode estar vinculada a várias empresas</p>
        </div>
        {isGestor && (
          <button onClick={() => { cancelar(); setMostraForm(!mostraForm); }} className="btn btn-primary">
            {mostraForm && !editandoGrupo ? 'Cancelar' : '+ Nova tarefa'}
          </button>
        )}
      </div>

      {mostraForm && isGestor && (
        <form onSubmit={salvar} className="card p-5 mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">
            {editandoGrupo
              ? `Editar "${editandoGrupo.nome}" — ${editandoGrupo.empresas.length} empresa(s)`
              : 'Nova tarefa'}
          </p>
          {editandoGrupo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4 text-xs text-blue-700">
              ℹ️ Editando para todas as {editandoGrupo.empresas.length} empresas vinculadas de uma vez.
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome da tarefa</label>
                <input className="input" required value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Folha de Pagamento, FGTS Digital..." />
              </div>

              <div className="col-span-2">
                <label className="label">{form.isDiaUtil ? 'Nº dia útil de vencimento' : 'Dia de vencimento'}</label>
                <div className="flex gap-2 items-center">
                  <input className="input flex-1" type="number" min="1" max="31" required
                    value={form.diaVencimento}
                    onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))}
                    placeholder={form.isDiaUtil ? 'Ex: 5 (5º dia útil)' : 'Ex: 7'} />
                  <div onClick={() => setForm(f => ({ ...f, isDiaUtil: !f.isDiaUtil }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all flex-shrink-0 text-xs font-semibold ${form.isDiaUtil ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface text-muted border-border hover:border-border2'}`}>
                    {form.isDiaUtil ? '✓ Dia útil' : 'Dia útil?'}
                  </div>
                </div>
                <p className="text-xs text-faint mt-1">
                  {form.isDiaUtil ? `Calculará o ${form.diaVencimento || 'N'}º dia útil (Seg–Sáb), considerando feriados da cidade da empresa` : 'Dia fixo do mês'}
                </p>
              </div>

              <div>
                <label className="label">Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="RECORRENTE">Recorrente (todo mês)</option>
                  <option value="PONTUAL">Pontual (uma vez)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="label">
                  Início de cobrança
                  <span className="text-faint font-normal ml-1">(opcional)</span>
                </label>
                <div className="flex gap-2">
                  <select className="select flex-1" value={form.inicioMes} onChange={e => setForm(f => ({ ...f, inicioMes: e.target.value }))}>
                    <option value="">Mês</option>
                    {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                  <select className="select w-32" value={form.inicioAno} onChange={e => setForm(f => ({ ...f, inicioAno: e.target.value }))}>
                    <option value="">Ano</option>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {(form.inicioMes || form.inicioAno) && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, inicioMes: '', inicioAno: '' }))} className="btn btn-secondary text-xs px-3 flex-shrink-0">Limpar</button>
                  )}
                </div>
              </div>
            </div>

            {/* Escopo — só na criação */}
            {!editandoGrupo && (
              <div>
                <label className="label mb-2">Aplicar para</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {ESCOPO_OPTS.map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => { setForm(f => ({ ...f, escopo: opt.key, empresaId: '', empresasIds: [] })); setFiltroTipoEmpresa('todas'); setBuscaEmpresaForm(''); }}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.escopo === opt.key ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {(form.escopo === 'uma' || form.escopo === 'selecionar') && (
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {FILTROS_TIPO.map(f => (
                      <button key={f.key} type="button" onClick={() => setFiltroTipoEmpresa(f.key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${filtroTipoEmpresa === f.key ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {form.escopo === 'uma' && (
                  <div>
                    <select className="select" required value={form.empresaId} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
                      <option value="">Selecionar empresa...</option>
                      {empresasFiltradas.map(emp => <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>)}
                    </select>
                    <p className="text-xs text-faint mt-1">{empresasFiltradas.length} empresa(s) no filtro</p>
                  </div>
                )}

                {form.escopo === 'selecionar' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <input className="input flex-1 text-xs h-8 mr-2" placeholder="Buscar empresa..."
                        value={buscaEmpresaForm} onChange={e => setBuscaEmpresaForm(e.target.value)} />
                      <button type="button" onClick={toggleTodasFiltradas} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                        {todasFiltradasSelecionadas ? 'Desmarcar' : 'Selecionar todas'}
                      </button>
                    </div>
                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                      {empresasFiltradas.map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                          <div onClick={() => toggleEmpresa(emp.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${form.empresasIds.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                            {form.empresasIds.includes(emp.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            )}
                          </div>
                          <p className="text-sm text-ink truncate flex-1">{emp.razaoSocial}</p>
                          {form.empresasIds.includes(emp.id) && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                        </label>
                      ))}
                    </div>
                    {form.empresasIds.length > 0 && <p className="text-xs text-muted mt-1">{form.empresasIds.length} empresa(s) selecionada(s)</p>}
                  </div>
                )}

                {form.escopo === 'todas' && (
                  <p className="text-xs text-muted mt-1">A tarefa será criada para as <strong>{todasEmpresas.length}</strong> empresas.</p>
                )}
              </div>
            )}

            {/* Subtarefas */}
            <div>
              <label className="label mb-2">
                Subtarefas
                <span className="text-faint font-normal ml-1 text-xs">— marque "tem valor" para INSS, FGTS, IR etc.</span>
              </label>
              {form.subtarefas.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.subtarefas.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface2 rounded-lg border border-border">
                      <span className="text-sm flex-1">{s.nome}</span>
                      {s.temValor && <span className="pill pill-blue text-[10px]">💰 tem valor</span>}
                      <button type="button" onClick={() => setForm(f => ({ ...f, subtarefas: f.subtarefas.filter((_, idx) => idx !== i) }))} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className="input flex-1" value={form._novaSub || ''}
                  onChange={e => setForm(f => ({ ...f, _novaSub: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!form._novaSub?.trim()) return;
                      setForm(f => ({ ...f, subtarefas: [...f.subtarefas, { nome: f._novaSub.trim(), temValor: f._novaSubTemValor || false }], _novaSub: '', _novaSubTemValor: false }));
                    }
                  }}
                  placeholder="Nome da subtarefa (ex: INSS, FGTS, Holerith...)" />
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none flex-shrink-0 px-2 py-1 rounded border border-border hover:bg-surface2 transition-colors">
                  <input type="checkbox" checked={form._novaSubTemValor || false}
                    onChange={e => setForm(f => ({ ...f, _novaSubTemValor: e.target.checked }))} className="accent-ink" />
                  💰 tem valor
                </label>
                <button type="button"
                  onClick={() => {
                    if (!form._novaSub?.trim()) return;
                    setForm(f => ({ ...f, subtarefas: [...f.subtarefas, { nome: f._novaSub.trim(), temValor: f._novaSubTemValor || false }], _novaSub: '', _novaSubTemValor: false }));
                  }}
                  className="btn btn-secondary">+ Add</button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : editandoGrupo ? `Salvar em ${editandoGrupo.empresas.length} empresa(s)` : 'Criar tarefa'}
            </button>
            <button type="button" onClick={cancelar} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {/* Barra de busca */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar por nome da tarefa..."
          value={buscaInput} onChange={e => setBuscaInput(e.target.value)} />
        <span className="text-xs text-faint">{total} tarefa(s) única(s)</span>

        {isGestor && selecionadas.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg ml-auto">
            <span className="text-xs font-semibold text-red-700">{selecionadas.length} selecionada(s)</span>
            <button onClick={excluirEmLote} disabled={excluindoLote}
              className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-300 px-2 py-0.5 rounded hover:bg-red-100 transition-colors">
              {excluindoLote ? 'Removendo...' : '🗑 Remover selecionadas'}
            </button>
            <button onClick={() => setSelecionadas([])} className="text-xs text-muted hover:text-ink">✕</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma tarefa cadastrada.</p>
          <p className="text-faint text-xs mt-1">Clique em "+ Nova tarefa" para começar.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface2">
                <tr>
                  {isGestor && <th className="px-4 py-2.5 border-b border-border w-8"><Checkbox checked={todasSelecionadas} indeterminate={algumasSelecionadas} onClick={toggleTodas} /></th>}
                  {['Tarefa', 'Vencimento', 'Tipo', 'Início cobrança', 'Subtarefas', 'Empresas', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(grupo => {
                  const chave = grupo.nome + '||' + grupo.diaVencimento;
                  const isSelecionado = selecionadas.includes(chave);
                  const isExpandido = expandido[chave];

                  return (
                    <>
                      <tr key={chave} className={`border-b border-border hover:bg-surface2 transition-colors ${isSelecionado ? 'bg-red-50' : ''}`}>
                        {isGestor && (
                          <td className="px-4 py-3 w-8">
                            <Checkbox checked={isSelecionado} onClick={() => toggleSelecao(chave)} />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-ink">{grupo.nome}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-muted">
                            {grupo.isDiaUtil ? `${grupo.diaVencimento}º dia útil` : `Dia ${grupo.diaVencimento}`}
                          </p>
                          {grupo.isDiaUtil && <p className="text-[10px] text-blue-600">Seg–Sáb</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`pill text-[10px] ${grupo.tipo === 'RECORRENTE' ? 'pill-blue' : 'pill-amber'}`}>
                            {grupo.tipo === 'RECORRENTE' ? 'Recorrente' : 'Pontual'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {fmtInicio(grupo.inicioCobrancaEm) || <span className="text-faint">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {grupo.subtarefas?.length > 0
                            ? <span className="pill pill-gray text-[10px]">{grupo.subtarefas.length} sub</span>
                            : <span className="text-faint">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandido(prev => ({ ...prev, [chave]: !prev[chave] }))}
                            className={`pill text-[10px] cursor-pointer transition-colors ${isExpandido ? 'pill-blue' : 'pill-gray hover:pill-blue'}`}>
                            {grupo.empresas.length} empresa{grupo.empresas.length !== 1 ? 's' : ''} {isExpandido ? '▲' : '▼'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {isGestor && (
                            <div className="flex items-center gap-3 justify-end">
                              <button onClick={() => iniciarEdicao(grupo)} className="text-xs text-blue-600 hover:underline">Editar</button>
                              <button onClick={() => excluirGrupo(grupo)} className="text-xs text-red-500 hover:underline">Remover</button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Linha expandida com empresas vinculadas */}
                      {isExpandido && (
                        <tr key={chave + '_expand'} className="border-b border-border bg-blue-50/50">
                          <td colSpan={isGestor ? 8 : 7} className="px-6 py-3">
                            <p className="text-xs font-semibold text-muted mb-2">Empresas vinculadas a esta tarefa:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {grupo.empresas.map(emp => (
                                <span key={emp.id} className="pill pill-gray text-[10px]">
                                  {emp.razaoSocial}
                                  {emp.cidade && <span className="text-faint ml-1">· {emp.cidade}</span>}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-faint">
                Mostrando {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary text-xs disabled:opacity-40">← Anterior</button>
                <span className="text-xs text-muted px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary text-xs disabled:opacity-40">Próxima →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
