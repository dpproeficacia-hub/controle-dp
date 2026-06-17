import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmtCNPJ = c => c?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
const fmtMoeda = v => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : null;

export default function EmpresaDetalhe() {
  const { empresaId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isGestor } = useAuth();
  const competencia = state?.competencia || new Date().toISOString().slice(0, 7);

  const [empresa, setEmpresa] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [entregas, setEntregas] = useState({});
  const [valores, setValores] = useState({});
  const [datas, setDatas] = useState({});
  const [salvando, setSalvando] = useState({});
  const [salvo, setSalvo] = useState({});
  const [mostraForm, setMostraForm] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ nome: '', diaVencimento: '', tipo: 'RECORRENTE', subtarefas: [] });
  const [novaSubtarefa, setNovaSubtarefa] = useState({ nome: '', temValor: false });
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [criando, setCriando] = useState(false);
  const [filtro, setFiltro] = useState('pendentes');

  useEffect(() => {
    carregarDados();
    if (isGestor) api.get('/empresas').then(r => setTodasEmpresas(r.data));
  }, [empresaId, competencia]);

  async function carregarDados() {
    const [e, g, en] = await Promise.all([
      api.get(`/empresas/${empresaId}`),
      api.get(`/grupos/${empresaId}?competencia=${competencia}`), // passa competência para calcular datas
      api.get(`/grupos/${empresaId}/entregas/${competencia}`)
    ]);
    setEmpresa(e.data);
    setGrupos(g.data);
    const entregaMap = {};
    en.data.forEach(eg => { entregaMap[eg.grupoId] = eg; });
    setEntregas(entregaMap);
  }

  function isGrupoConcluido(grupoId) {
    const eg = entregas[grupoId];
    return eg?.entregue || eg?.dispensada || false;
  }
  function isGrupoDispensado(grupoId) { return entregas[grupoId]?.dispensada || false; }
  function isGrupoEntregue(grupoId) { return entregas[grupoId]?.entregue || false; }

  function isSubtarefaOk(grupoId, subtarefaId) {
    const eg = entregas[grupoId];
    if (!eg) return false;
    return eg.subtarefas?.find(s => s.subtarefaId === subtarefaId)?.ok || false;
  }

  function getValorSubtarefa(grupoId, subtarefaId) {
    const key = `${grupoId}_${subtarefaId}`;
    if (valores[key] !== undefined) return valores[key];
    const eg = entregas[grupoId];
    if (!eg) return '';
    const s = eg.subtarefas?.find(s => s.subtarefaId === subtarefaId);
    return s?.valor ? fmtMoeda(s.valor) : '';
  }

  function getDataEntrega(grupoId) {
    if (datas[grupoId] !== undefined) return datas[grupoId];
    const eg = entregas[grupoId];
    if (!eg?.dataEntrega) return '';
    return eg.dataEntrega.slice(0, 10);
  }

  // Calcula dias restantes até o vencimento real
  function diasRestantesVenc(grupo) {
    if (!grupo.dataVencimentoReal) return null;
    const venc = new Date(grupo.dataVencimentoReal);
    venc.setHours(0,0,0,0);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return Math.floor((venc - hoje) / 86400000);
  }

  function toggleSubtarefa(grupoId, subtarefaId) {
    setEntregas(prev => {
      const eg = prev[grupoId] || { grupoId, entregue: false, dispensada: false, subtarefas: [] };
      const subs = eg.subtarefas || [];
      const idx = subs.findIndex(s => s.subtarefaId === subtarefaId);
      const novas = idx >= 0
        ? subs.map(s => s.subtarefaId === subtarefaId ? { ...s, ok: !s.ok } : s)
        : [...subs, { subtarefaId, ok: true }];
      return { ...prev, [grupoId]: { ...eg, subtarefas: novas } };
    });
  }

  function setValorSubtarefa(grupoId, subtarefaId, valor) {
    setValores(prev => ({ ...prev, [`${grupoId}_${subtarefaId}`]: valor }));
  }

  function marcarGrupoEntregue(grupoId, entregue) {
    const hoje = new Date().toISOString().slice(0, 10);
    setEntregas(prev => ({
      ...prev,
      [grupoId]: { ...(prev[grupoId] || { grupoId, subtarefas: [] }), entregue, dispensada: false, dataEntrega: entregue ? hoje : null }
    }));
    if (entregue) setDatas(prev => ({ ...prev, [grupoId]: hoje }));
  }

  async function salvarGrupo(grupo) {
    setSalvando(prev => ({ ...prev, [grupo.id]: true }));
    try {
      const eg = entregas[grupo.id] || { entregue: false, dispensada: false, subtarefas: [] };
      const subtarefasPayload = (grupo.subtarefas || []).map(s => {
        const key = `${grupo.id}_${s.id}`;
        const valStr = valores[key] || '';
        const valNum = parseFloat(valStr.replace(/[^\d,]/g, '').replace(',', '.')) || null;
        return { subtarefaId: s.id, ok: isSubtarefaOk(grupo.id, s.id), valor: valNum };
      });
      await api.post(`/grupos/${grupo.id}/entregar/${competencia}/${empresaId}`, {
        entregue: eg.entregue || false,
        dispensada: eg.dispensada || false,
        dataEntrega: datas[grupo.id] || eg.dataEntrega || null,
        subtarefas: subtarefasPayload
      });
      await carregarDados();
      setDatas(prev => { const n = { ...prev }; delete n[grupo.id]; return n; });
      setSalvo(prev => ({ ...prev, [grupo.id]: true }));
      setTimeout(() => setSalvo(prev => ({ ...prev, [grupo.id]: false })), 2000);
    } catch { alert('Erro ao salvar. Tente novamente.'); }
    finally { setSalvando(prev => ({ ...prev, [grupo.id]: false })); }
  }

  async function dispensarGrupo(grupo) {
    if (!window.confirm(`Dispensar "${grupo.nome}" neste mês?`)) return;
    setSalvando(prev => ({ ...prev, [grupo.id]: true }));
    try {
      await api.post(`/grupos/${grupo.id}/entregar/${competencia}/${empresaId}`, {
        entregue: false, dispensada: true, dataEntrega: null, subtarefas: []
      });
      await carregarDados();
    } catch { alert('Erro ao dispensar tarefa.'); }
    finally { setSalvando(prev => ({ ...prev, [grupo.id]: false })); }
  }

  async function desfazerEntrega(grupo) {
    setSalvando(prev => ({ ...prev, [grupo.id]: true }));
    try {
      await api.post(`/grupos/${grupo.id}/entregar/${competencia}/${empresaId}`, {
        entregue: false, dispensada: false, dataEntrega: null, subtarefas: []
      });
      await carregarDados();
      setDatas(prev => { const n = { ...prev }; delete n[grupo.id]; return n; });
    } catch { alert('Erro ao desfazer entrega.'); }
    finally { setSalvando(prev => ({ ...prev, [grupo.id]: false })); }
  }

  async function desfazerDispensa(grupo) {
    setSalvando(prev => ({ ...prev, [grupo.id]: true }));
    try {
      await api.post(`/grupos/${grupo.id}/entregar/${competencia}/${empresaId}`, {
        entregue: false, dispensada: false, dataEntrega: null, subtarefas: []
      });
      await carregarDados();
    } catch { alert('Erro ao desfazer dispensa.'); }
    finally { setSalvando(prev => ({ ...prev, [grupo.id]: false })); }
  }

  async function excluirGrupo(grupoId) {
    if (!window.confirm('Remover este grupo de tarefas?')) return;
    await api.delete(`/grupos/${grupoId}`);
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
  }

  function adicionarSubtarefaForm() {
    if (!novaSubtarefa.nome.trim()) return;
    setNovoGrupo(prev => ({ ...prev, subtarefas: [...prev.subtarefas, { ...novaSubtarefa, id: Date.now() }] }));
    setNovaSubtarefa({ nome: '', temValor: false });
  }

  function removerSubtarefaForm(id) {
    setNovoGrupo(prev => ({ ...prev, subtarefas: prev.subtarefas.filter(s => s.id !== id) }));
  }

  async function criarGrupo(e) {
    e.preventDefault();
    if (!novoGrupo.nome.trim() || !novoGrupo.diaVencimento) return;
    setCriando(true);
    try {
      const ids = empresasSelecionadas.length > 0 ? empresasSelecionadas : [empresaId];
      await api.post('/grupos', {
        nome: novoGrupo.nome, diaVencimento: novoGrupo.diaVencimento,
        tipo: novoGrupo.tipo, subtarefas: novoGrupo.subtarefas, empresaIds: ids
      });
      setNovoGrupo({ nome: '', diaVencimento: '', tipo: 'RECORRENTE', subtarefas: [] });
      setEmpresasSelecionadas([]);
      setMostraForm(false);
      await carregarDados();
    } catch { alert('Erro ao criar grupo.'); }
    finally { setCriando(false); }
  }

  if (!empresa) return <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>;

  // Ordena grupos por data de vencimento real (já vem ordenado do backend, mas garantimos aqui)
  const gruposOrdenados = [...grupos].sort((a, b) => {
    if (!a.dataVencimentoReal && !b.dataVencimentoReal) return 0;
    if (!a.dataVencimentoReal) return 1;
    if (!b.dataVencimentoReal) return -1;
    return new Date(a.dataVencimentoReal) - new Date(b.dataVencimentoReal);
  });

  const gruposFiltrados = filtro === 'pendentes'
    ? gruposOrdenados.filter(g => !isGrupoConcluido(g.id))
    : filtro === 'concluidos'
    ? gruposOrdenados.filter(g => isGrupoConcluido(g.id))
    : gruposOrdenados;

  const totalGrupos = grupos.length;
  const concluidos = grupos.filter(g => isGrupoConcluido(g.id)).length;
  const dispensados = grupos.filter(g => isGrupoDispensado(g.id)).length;
  const pct = totalGrupos ? Math.round((concluidos / totalGrupos) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-faint mb-5">
        <button onClick={() => navigate('/mensal')} className="text-blue-600 hover:underline">Controle Mensal</button>
        <span>›</span>
        <span className="text-ink font-medium">{empresa.razaoSocial}</span>
      </div>

      {/* Cabeçalho */}
      <div className="card p-5 mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center font-display font-bold text-lg text-bg flex-shrink-0">
            {empresa.razaoSocial.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-ink">{empresa.razaoSocial}</h2>
            <p className="text-xs text-faint mt-0.5">{fmtCNPJ(empresa.cnpj)} · {empresa.enquadramento.replace(/_/g, ' ')} · {empresa.tipo}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {empresa.temFuncionarios && <span className="pill pill-green">Com funcionários</span>}
              {empresa.temProLabore && <span className="pill pill-blue">Pró-labore</span>}
              {empresa.semMovimento && <span className="pill pill-gray">Sem movimento</span>}
              {empresa.enviaReinf && <span className="pill pill-purple">REINF</span>}
              {empresa.fatorR && <span className="pill pill-teal">Fator R</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${empresa.nivel==='N1'?'bg-ink text-bg':empresa.nivel==='N2'?'bg-red-100 text-red-800':empresa.nivel==='N3'?'bg-amber-100 text-amber-800':empresa.nivel==='N4'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{empresa.nivel}</div>
          <button onClick={() => navigate(`/empresas/${empresa.id}/editar`)} className="btn btn-secondary text-xs">Editar cadastro</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[
              ['pendentes', `Pendentes (${totalGrupos - concluidos})`],
              ['concluidos', `Concluídas (${concluidos})`],
              ['todas', `Todas (${totalGrupos})`]
            ].map(([f, label]) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filtro===f?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
                {label}
              </button>
            ))}
            {isGestor && (
              <button onClick={() => setMostraForm(!mostraForm)} className="btn btn-primary text-xs ml-auto">
                {mostraForm ? 'Cancelar' : '+ Nova tarefa'}
              </button>
            )}
          </div>

          {mostraForm && isGestor && (
            <form onSubmit={criarGrupo} className="card p-5 mb-4">
              <p className="text-sm font-semibold text-ink mb-4">Novo grupo de tarefas</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-1">
                  <label className="label">Nome do grupo</label>
                  <input className="input" required value={novoGrupo.nome}
                    onChange={e => setNovoGrupo(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Folha de Pagamento" />
                </div>
                <div>
                  <label className="label">Dia de vencimento</label>
                  <input className="input" type="number" min="1" max="31" required
                    value={novoGrupo.diaVencimento}
                    onChange={e => setNovoGrupo(p => ({ ...p, diaVencimento: e.target.value }))}
                    placeholder="Ex: 5" />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="select" value={novoGrupo.tipo}
                    onChange={e => setNovoGrupo(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="RECORRENTE">Recorrente (todo mês)</option>
                    <option value="PONTUAL">Pontual (só este mês)</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="label mb-2">
                  Subtarefas
                  <span className="text-faint font-normal ml-1 text-xs">— marque "tem valor" para INSS, FGTS, IR</span>
                </label>
                <div className="space-y-2 mb-3">
                  {novoGrupo.subtarefas.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-surface2 rounded-lg border border-border">
                      <span className="text-sm flex-1">{s.nome}</span>
                      {s.temValor && <span className="pill pill-blue text-[10px]">💰 tem valor</span>}
                      <button type="button" onClick={() => removerSubtarefaForm(s.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input className="input flex-1 h-8 text-xs" value={novaSubtarefa.nome}
                    onChange={e => setNovaSubtarefa(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome da subtarefa (ex: INSS, FGTS, Holerith...)"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarSubtarefaForm())} />
                  <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none flex-shrink-0 px-2 py-1 rounded border border-border hover:bg-surface2 transition-colors">
                    <input type="checkbox" checked={novaSubtarefa.temValor}
                      onChange={e => setNovaSubtarefa(p => ({ ...p, temValor: e.target.checked }))} className="accent-ink" />
                    💰 tem valor
                  </label>
                  <button type="button" onClick={adicionarSubtarefaForm} className="btn btn-secondary text-xs h-8 px-3 flex-shrink-0">+ Add</button>
                </div>
              </div>
              <div className="mb-4">
                <label className="label mb-2">Aplicar para</label>
                <div className="bg-surface2 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink mb-2 cursor-pointer">
                    <input type="checkbox"
                      checked={empresasSelecionadas.length === todasEmpresas.length}
                      onChange={e => setEmpresasSelecionadas(e.target.checked ? todasEmpresas.map(emp => emp.id) : [])}
                      className="accent-ink" />
                    Selecionar todas as empresas
                  </label>
                  <div className="border-t border-border pt-2 space-y-1.5">
                    {todasEmpresas.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-ink">
                        <input type="checkbox"
                          checked={empresasSelecionadas.includes(emp.id)}
                          onChange={e => setEmpresasSelecionadas(prev => e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id))}
                          className="accent-ink" />
                        {emp.razaoSocial}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-faint mt-1">
                  {empresasSelecionadas.length === 0 ? 'Nenhuma selecionada — apenas esta empresa' : `${empresasSelecionadas.length} empresa(s) selecionada(s)`}
                </p>
              </div>
              <button type="submit" disabled={criando} className="btn btn-primary">
                {criando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Criar grupo de tarefas'}
              </button>
            </form>
          )}

          {gruposFiltrados.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-sm text-faint">
                {filtro === 'pendentes' ? 'Todas as tarefas foram concluídas! 🎉' : filtro === 'concluidos' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa cadastrada.'}
              </p>
              {filtro === 'todas' && isGestor && (
                <button onClick={() => setMostraForm(true)} className="btn btn-primary mt-3 mx-auto">+ Criar primeira tarefa</button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {gruposFiltrados.map(grupo => {
              const concluido = isGrupoConcluido(grupo.id);
              const dispensado = isGrupoDispensado(grupo.id);
              const entregue = isGrupoEntregue(grupo.id);
              const diasVenc = diasRestantesVenc(grupo);
              const atrasado = !concluido && diasVenc !== null && diasVenc < 0;
              const dataVencStr = grupo.dataVencimentoReal ? fmtData(grupo.dataVencimentoReal) : null;
              const dataEntregaAtual = getDataEntrega(grupo.id);

              return (
                <div key={grupo.id} className={`card overflow-hidden ${concluido ? 'opacity-80' : ''}`}>
                  <div className={`card-header ${dispensado ? 'bg-gray-50' : atrasado ? 'bg-red-50' : entregue ? 'bg-green-50' : 'bg-surface2'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Prazo de entrega na frente */}
                      {dataVencStr && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                          dispensado ? 'bg-gray-100 text-gray-500' :
                          atrasado   ? 'bg-red-100 text-red-700' :
                          entregue   ? 'bg-green-100 text-green-700' :
                          diasVenc !== null && diasVenc <= 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-white border border-border text-muted'
                        }`}>
                          {grupo.isDiaUtil ? `${grupo.diaVencimento}º d.u.` : `Dia ${grupo.diaVencimento}`}
                          {grupo.mesSubsequente && ' +1m'}
                          <span className="ml-1.5 font-normal opacity-70">→ {dataVencStr}</span>
                        </div>
                      )}
                      <span className={`card-title ${dispensado ? 'line-through text-faint' : entregue ? 'line-through text-faint' : atrasado ? 'text-red-700' : ''}`}>
                        {grupo.nome}
                      </span>
                      <span className={`pill text-[10px] ${grupo.tipo === 'RECORRENTE' ? 'pill-blue' : 'pill-amber'}`}>
                        {grupo.tipo === 'RECORRENTE' ? 'Recorrente' : 'Pontual'}
                      </span>
                      {atrasado && <span className="pill pill-red text-[10px]">Atrasado</span>}
                      {dispensado && <span className="pill pill-gray text-[10px]">Dispensada</span>}
                      {!atrasado && !concluido && diasVenc !== null && diasVenc <= 3 && diasVenc >= 0 && (
                        <span className="pill pill-amber text-[10px]">⚠ {diasVenc === 0 ? 'Vence hoje' : `${diasVenc} dia${diasVenc !== 1 ? 's' : ''}`}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {entregue && !dispensado && <span className="pill pill-green text-[10px]">✓ Entregue</span>}
                      {!concluido && (
                        <>
                          <button onClick={() => marcarGrupoEntregue(grupo.id, true)}
                            className="text-xs text-green-600 font-medium hover:underline">Marcar entregue</button>
                          <span className="text-faint text-xs">·</span>
                          <button onClick={() => dispensarGrupo(grupo)}
                            className="text-xs text-gray-500 font-medium hover:text-gray-700 hover:underline">Dispensar</button>
                        </>
                      )}
                      {isGestor && (
                        <button onClick={() => excluirGrupo(grupo.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">✕</button>
                      )}
                    </div>
                  </div>

                  {/* Subtarefas */}
                  {grupo.subtarefas?.length > 0 && !dispensado && (
                    <div>
                      {grupo.subtarefas.map(sub => (
                        <div key={sub.id} onClick={() => !entregue && toggleSubtarefa(grupo.id, sub.id)}
                          className={`check-item ${isSubtarefaOk(grupo.id, sub.id) ? 'done' : ''} ${entregue ? 'cursor-default' : ''}`}>
                          <div className={`check-box ${isSubtarefaOk(grupo.id, sub.id) ? 'done' : ''}`}>
                            {isSubtarefaOk(grupo.id, sub.id) && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#F4F3EF" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                          <span className="check-label flex-1 text-sm font-medium">{sub.nome}</span>
                          {sub.temValor && (
                            <input onClick={e => e.stopPropagation()}
                              className="input w-32 text-xs h-8"
                              placeholder="R$ 0,00"
                              disabled={entregue}
                              value={getValorSubtarefa(grupo.id, sub.id)}
                              onChange={e => setValorSubtarefa(grupo.id, sub.id, e.target.value)} />
                          )}
                          <span className={`pill ml-2 ${isSubtarefaOk(grupo.id, sub.id) ? 'pill-green' : 'pill-gray'}`}>
                            {isSubtarefaOk(grupo.id, sub.id) ? 'OK' : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data de entrega */}
                  {!dispensado && (
                    <div className="px-5 py-3 border-t border-border bg-surface2/50">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[220px]">
                          <label className="label mb-1">
                            Data de entrega <span className="text-faint font-normal">(opcional)</span>
                          </label>
                          <input type="date" className="input text-xs h-8"
                            value={dataEntregaAtual}
                            disabled={entregue && !isGestor}
                            onChange={e => setDatas(prev => ({ ...prev, [grupo.id]: e.target.value }))} />
                        </div>
                        {entregue && entregas[grupo.id]?.dataEntrega && (
                          <p className="text-xs text-green-700 mt-4">
                            ✓ Entregue em {fmtData(entregas[grupo.id].dataEntrega)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rodapé */}
                  <div className="px-5 py-3 bg-surface2 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {entregue && !dispensado && (
                        <button onClick={() => desfazerEntrega(grupo)} className="text-xs text-amber-600 hover:underline">Desfazer entrega</button>
                      )}
                      {dispensado && (
                        <button onClick={() => desfazerDispensa(grupo)} className="text-xs text-amber-600 hover:underline">Desfazer dispensa</button>
                      )}
                    </div>
                    {!dispensado && (
                      <button onClick={() => salvarGrupo(grupo)} disabled={salvando[grupo.id]}
                        className="btn btn-primary text-xs h-8 px-4">
                        {salvando[grupo.id]
                          ? <span className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                          : salvo[grupo.id] ? '✓ Salvo!' : 'Salvar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {empresa.observacoes && (
            <div className="card p-4 mt-4">
              <p className="label mb-2">Observações</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 leading-relaxed">
                {empresa.observacoes}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="card p-4 text-center">
            <p className="font-display font-bold text-4xl" style={{ color: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D' }}>
              {pct}%
            </p>
            <p className="text-xs text-faint mt-1">{pct === 100 ? 'Tudo concluído! 🎉' : pct > 0 ? 'Em andamento' : 'Não iniciado'}</p>
            <div className="progress-bar mt-3">
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#3B6D11' : pct > 0 ? '#854F0B' : '#A32D2D' }} />
            </div>
            <p className="text-xs text-faint mt-2">{concluidos}/{totalGrupos} concluídas</p>
            {dispensados > 0 && <p className="text-xs text-gray-400 mt-0.5">{dispensados} dispensada{dispensados !== 1 ? 's' : ''}</p>}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Configuração da empresa</span></div>
            <div className="p-4 space-y-2">
              {[
                ['Funcionários', empresa.temFuncionarios],
                ['Pró-labore', empresa.temProLabore],
                ['Sem movimento', empresa.semMovimento],
                ['REINF', empresa.enviaReinf],
                ['Fator R', empresa.fatorR],
                ['Controle de tarefas', empresa.participaTarefas],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-faint">{l}</span>
                  <span className={`pill text-[10px] ${v ? 'pill-green' : 'pill-gray'}`}>{v ? 'Sim' : 'Não'}</span>
                </div>
              ))}
            </div>
          </div>

          {empresa.sindical && (
            <div className="card">
              <div className="card-header"><span className="card-title">Controle Sindical</span></div>
              <div className="p-4 space-y-2">
                {empresa.sindical.sindicato && (
                  <div className="flex justify-between text-xs">
                    <span className="text-faint">Sindicato</span>
                    <span className="font-medium text-right max-w-[150px]">{empresa.sindical.sindicato}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-faint">Última CCT</span>
                  <span className="font-medium">{empresa.sindical.ultimaCct}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-faint">Status CCT</span>
                  <span className={`pill text-[10px] ${empresa.sindical.ultimaCct >= new Date().getFullYear() ? 'pill-green' : 'pill-red'}`}>
                    {empresa.sindical.ultimaCct >= new Date().getFullYear() ? 'Atualizada' : 'Desatualizada'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
