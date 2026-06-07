import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ESCOPO_OPTS = [
  { key: 'todas', label: 'Todas as empresas' },
  { key: 'uma', label: 'Uma empresa específica' },
  { key: 'selecionar', label: 'Empresas selecionadas' },
];

const formVazio = {
  nome: '', diaVencimento: '', tipo: 'RECORRENTE', inicioCobrancaEm: '',
  escopo: 'todas', empresaId: '', empresasIds: [], subtarefas: [],
};

export default function Tarefas() {
  const [grupos, setGrupos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 50;
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(formVazio);
  const [novaSub, setNovaSub] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const { isGestor } = useAuth();

  useEffect(() => {
    api.get('/empresas').then(r => setEmpresas(r.data));
  }, []);

  useEffect(() => {
    carregar(page, filtroBusca);
  }, [page, filtroBusca]);

  function carregar(p = 1, busca = '') {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (busca) params.append('busca', busca);
    api.get(`/grupos?${params}`)
      .then(r => {
        setGrupos(r.data.grupos);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }

  // Debounce da busca — só dispara 400ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroBusca(buscaInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  function cancelar() {
    setEditandoId(null);
    setForm(formVazio);
    setNovaSub('');
    setMostraForm(false);
  }

  function iniciarEdicao(g) {
    setEditandoId(g.id);
    setForm({
      nome: g.nome, diaVencimento: g.diaVencimento, tipo: g.tipo,
      inicioCobrancaEm: g.inicioCobrancaEm ? g.inicioCobrancaEm.slice(0, 10) : '',
      escopo: 'uma', empresaId: g.empresaId, empresasIds: [],
      subtarefas: (g.subtarefas || []).map(s => ({ nome: s.nome, temValor: s.temValor })),
    });
    setMostraForm(true);
    window.scrollTo(0, 0);
  }

  function adicionarSub() {
    if (!novaSub.trim()) return;
    setForm(f => ({ ...f, subtarefas: [...f.subtarefas, { nome: novaSub.trim(), temValor: false }] }));
    setNovaSub('');
  }

  function removerSub(idx) {
    setForm(f => ({ ...f, subtarefas: f.subtarefas.filter((_, i) => i !== idx) }));
  }

  function toggleEmpresa(id) {
    setForm(f => ({
      ...f,
      empresasIds: f.empresasIds.includes(id) ? f.empresasIds.filter(x => x !== id) : [...f.empresasIds, id]
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    let empresaIds;
    if (editandoId) {
      empresaIds = [form.empresaId];
    } else if (form.escopo === 'todas') {
      empresaIds = empresas.map(emp => emp.id);
    } else if (form.escopo === 'uma') {
      if (!form.empresaId) { alert('Selecione uma empresa.'); return; }
      empresaIds = [form.empresaId];
    } else {
      if (form.empresasIds.length === 0) { alert('Selecione pelo menos uma empresa.'); return; }
      empresaIds = form.empresasIds;
    }
    if (empresaIds.length === 0) { alert('Nenhuma empresa disponível.'); return; }

    setSalvando(true);
    try {
      const payload = {
        nome: form.nome, diaVencimento: Number(form.diaVencimento), tipo: form.tipo,
        inicioCobrancaEm: form.inicioCobrancaEm || null,
        subtarefas: form.subtarefas, empresaIds,
      };
      if (editandoId) {
        await api.put(`/grupos/${editandoId}`, payload);
      } else {
        await api.post('/grupos', payload);
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

  async function excluir(g) {
    if (!window.confirm(`Remover a tarefa "${g.nome}" de ${g.empresa?.razaoSocial}?`)) return;
    await api.delete(`/grupos/${g.id}`);
    carregar(page, filtroBusca);
  }

  const totalPages = Math.ceil(total / LIMIT);
  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Tarefas</h2>
          <p className="text-sm text-muted mt-0.5">Gerencie todas as tarefas por empresa</p>
        </div>
        {isGestor && (
          <button onClick={() => { cancelar(); setMostraForm(!mostraForm); }} className="btn btn-primary">
            {mostraForm && !editandoId ? 'Cancelar' : '+ Nova tarefa'}
          </button>
        )}
      </div>

      {mostraForm && isGestor && (
        <form onSubmit={salvar} className="card p-5 mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">{editandoId ? 'Editar tarefa' : 'Nova tarefa'}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome da tarefa</label>
                <input className="input" required value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: FGTS Digital, Folha de Pagamento..." />
              </div>
              <div>
                <label className="label">Dia de vencimento</label>
                <input className="input" type="number" min="1" max="31" required
                  value={form.diaVencimento}
                  onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))}
                  placeholder="Ex: 7" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="select" value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="RECORRENTE">Recorrente (todo mês)</option>
                  <option value="PONTUAL">Pontual (uma vez)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">
                  Início de cobrança
                  <span className="text-faint font-normal ml-1">(a partir de quando a tarefa será exigida)</span>
                </label>
                <input className="input" type="date" value={form.inicioCobrancaEm}
                  onChange={e => setForm(f => ({ ...f, inicioCobrancaEm: e.target.value }))} />
                <p className="text-xs text-faint mt-1">Deixe em branco para cobrar desde o cadastro.</p>
              </div>
            </div>

            {!editandoId && (
              <div>
                <label className="label mb-2">Aplicar para</label>
                <div className="flex gap-2 flex-wrap">
                  {ESCOPO_OPTS.map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => setForm(f => ({ ...f, escopo: opt.key, empresaId: '', empresasIds: [] }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.escopo === opt.key ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.escopo === 'uma' && (
                  <div className="mt-3">
                    <select className="select" required value={form.empresaId}
                      onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
                      <option value="">Selecionar empresa...</option>
                      {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>)}
                    </select>
                  </div>
                )}
                {form.escopo === 'selecionar' && (
                  <div className="mt-3">
                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                      {empresas.map(emp => (
                        <label key={emp.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                          <div onClick={() => toggleEmpresa(emp.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${form.empresasIds.includes(emp.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                            {form.empresasIds.includes(emp.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-ink">{emp.razaoSocial}</span>
                        </label>
                      ))}
                    </div>
                    {form.empresasIds.length > 0 && (
                      <p className="text-xs text-muted mt-1">{form.empresasIds.length} empresa(s) selecionada(s)</p>
                    )}
                  </div>
                )}
                {form.escopo === 'todas' && empresas.length > 0 && (
                  <p className="text-xs text-muted mt-2">A tarefa será criada para as <strong>{empresas.length}</strong> empresas.</p>
                )}
              </div>
            )}

            <div>
              <label className="label mb-2">Subtarefas <span className="text-faint font-normal">(opcional)</span></label>
              {form.subtarefas.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.subtarefas.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface2 rounded-lg border border-border">
                      <span className="text-sm flex-1">{s.nome}</span>
                      <button type="button" onClick={() => removerSub(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className="input flex-1" value={novaSub}
                  onChange={e => setNovaSub(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarSub(); } }}
                  placeholder="Nome da subtarefa..." />
                <button type="button" onClick={adicionarSub} className="btn btn-secondary">+ Add</button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : editandoId ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
            <button type="button" onClick={cancelar} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mb-4 flex items-center gap-3">
        <input className="input max-w-xs" placeholder="Buscar por tarefa ou empresa..."
          value={buscaInput} onChange={e => setBuscaInput(e.target.value)} />
        <span className="text-xs text-faint">{total} tarefa(s)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Nenhuma tarefa encontrada.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface2">
                <tr>
                  {['Tarefa', 'Empresa', 'Vencimento', 'Tipo', 'Início cobrança', 'Subtarefas', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => (
                  <tr key={g.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{g.nome}</td>
                    <td className="px-4 py-3 text-sm text-muted max-w-[180px] truncate" title={g.empresa?.razaoSocial}>{g.empresa?.razaoSocial || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted">Dia {g.diaVencimento}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${g.tipo === 'RECORRENTE' ? 'pill-blue' : 'pill-amber'} text-[10px]`}>
                        {g.tipo === 'RECORRENTE' ? 'Recorrente' : 'Pontual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{fmtData(g.inicioCobrancaEm) || <span className="text-faint">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {g.subtarefas?.length > 0
                        ? <span className="pill pill-gray text-[10px]">{g.subtarefas.length} sub</span>
                        : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isGestor && (
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => iniciarEdicao(g)} className="text-xs text-blue-600 hover:underline">Editar</button>
                          <button onClick={() => excluir(g)} className="text-xs text-red-500 hover:underline">Remover</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-faint">
                Mostrando {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn btn-secondary text-xs disabled:opacity-40">← Anterior</button>
                <span className="text-xs text-muted px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn btn-secondary text-xs disabled:opacity-40">Próxima →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
