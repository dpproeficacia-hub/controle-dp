import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const hoje = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export default function Agenda() {
  const { usuario, isGestor } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('pendentes');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', dataInicio: '', dataLimite: '', empresaId: ''
  });

  useEffect(() => {
    carregarEventos();
    api.get('/empresas').then(r => setEmpresas(r.data)).catch(() => {});
    if (isGestor) {
      api.get('/agenda/usuarios').then(r => setUsuarios(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    carregarEventos();
  }, [usuarioFiltro, filtro]);

  async function carregarEventos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (usuarioFiltro) params.append('usuarioId', usuarioFiltro);
      if (filtro === 'concluidos') params.append('concluido', 'true');
      if (filtro === 'pendentes') params.append('concluido', 'false');
      const { data } = await api.get(`/agenda?${params.toString()}`);
      setEventos(data);
    } finally {
      setLoading(false);
    }
  }

  function abrirForm(evento = null) {
    if (evento) {
      setEditando(evento.id);
      setForm({
        titulo: evento.titulo,
        descricao: evento.descricao || '',
        dataInicio: evento.dataInicio?.slice(0, 10) || '',
        dataLimite: evento.dataLimite?.slice(0, 10) || '',
        empresaId: evento.empresaId || ''
      });
    } else {
      setEditando(null);
      setForm({ titulo: '', descricao: '', dataInicio: '', dataLimite: '', empresaId: '' });
    }
    setMostraForm(true);
    window.scrollTo(0, 0);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/agenda/${editando}`, form);
      } else {
        await api.post('/agenda', form);
      }
      setMostraForm(false);
      setEditando(null);
      carregarEventos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function concluir(id) {
    await api.patch(`/agenda/${id}/concluir`);
    carregarEventos();
  }

  async function reabrir(id) {
    await api.patch(`/agenda/${id}/reabrir`);
    carregarEventos();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este evento?')) return;
    await api.delete(`/agenda/${id}`);
    carregarEventos();
  }

  function statusEvento(ev) {
    if (ev.concluido) return 'concluido';
    const ini = new Date(ev.dataInicio); ini.setHours(0,0,0,0);
    const hj = hoje();
    if (ini > hj) return 'futuro';
    if (ev.dataLimite) {
      const lim = new Date(ev.dataLimite); lim.setHours(0,0,0,0);
      if (lim < hj) return 'atrasado';
    }
    return 'ativo';
  }

  const pendentes = eventos.filter(e => !e.concluido);
  const atrasados = pendentes.filter(e => statusEvento(e) === 'atrasado');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Agenda</h2>
          <p className="text-sm text-muted mt-0.5">Seus compromissos e tarefas pessoais</p>
        </div>
        <button onClick={() => abrirForm()} className="btn btn-primary">+ Novo evento</button>
      </div>

      {/* Formulário */}
      {mostraForm && (
        <form onSubmit={salvar} className="card p-5 mb-5 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">{editando ? 'Editar evento' : 'Novo evento'}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Título</label>
              <input className="input" required value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Rescisão Fulano — Empresa Siclano" />
            </div>
            <div>
              <label className="label">Data de início</label>
              <input className="input" type="date" required value={form.dataInicio}
                onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
            </div>
            <div>
              <label className="label">Data limite <span className="text-faint">(opcional)</span></label>
              <input className="input" type="date" value={form.dataLimite}
                onChange={e => setForm(f => ({ ...f, dataLimite: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Empresa <span className="text-faint">(opcional)</span></label>
              <select className="select" value={form.empresaId}
                onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
                <option value="">Sem empresa vinculada</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Descrição <span className="text-faint">(opcional)</span></label>
              <textarea className="input h-16 resize-none py-2 leading-relaxed" value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes do evento..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando
                ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                : editando ? 'Salvar alterações' : 'Criar evento'}
            </button>
            <button type="button" onClick={() => setMostraForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['pendentes', 'todos', 'concluidos'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${filtro === f ? 'bg-ink text-bg border-ink' : 'bg-surface text-muted border-border hover:border-border2'}`}>
            {f === 'pendentes' ? `Pendentes (${pendentes.length})` : f === 'concluidos' ? 'Concluídos' : 'Todos'}
          </button>
        ))}

        {isGestor && (
          <select className="select h-8 text-xs ml-auto max-w-[200px]"
            value={usuarioFiltro}
            onChange={e => setUsuarioFiltro(e.target.value)}>
            <option value="">Minha agenda</option>
            {usuarios.filter(u => u.id !== usuario?.id).map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Alerta de atrasados */}
      {atrasados.length > 0 && filtro !== 'concluidos' && !usuarioFiltro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-red-500 text-lg">🔴</span>
          <p className="text-sm text-red-700 font-medium">
            {atrasados.length} evento{atrasados.length > 1 ? 's' : ''} com prazo vencido
          </p>
        </div>
      )}

      {/* Lista de eventos */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : eventos.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-faint">
            {filtro === 'concluidos' ? 'Nenhum evento concluído.' : 'Nenhum evento pendente.'}
          </p>
          {filtro === 'pendentes' && !usuarioFiltro && (
            <button onClick={() => abrirForm()} className="btn btn-primary mt-3 mx-auto">+ Criar primeiro evento</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map(ev => {
            const status = statusEvento(ev);
            const podeEditar = ev.usuarioId === usuario?.id;

            return (
              <div key={ev.id} className={`card overflow-hidden ${ev.concluido ? 'opacity-60' : ''}`}>
                <div className={`px-5 py-4 flex items-start justify-between gap-4 ${
                  status === 'atrasado' ? 'bg-red-50' :
                  status === 'concluido' ? 'bg-green-50' :
                  status === 'futuro' ? 'bg-blue-50' : 'bg-surface'
                }`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                      status === 'atrasado' ? 'bg-red-500' :
                      status === 'concluido' ? 'bg-green-500' :
                      status === 'futuro' ? 'bg-blue-400' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${ev.concluido ? 'line-through text-faint' : 'text-ink'}`}>
                        {ev.titulo}
                      </p>
                      {ev.empresa && (
                        <p className="text-xs text-blue-600 mt-0.5">{ev.empresa.razaoSocial}</p>
                      )}
                      {ev.descricao && (
                        <p className="text-xs text-muted mt-1 leading-relaxed">{ev.descricao}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-faint">
                          Início: <span className="font-medium text-ink">{fmtData(ev.dataInicio)}</span>
                        </span>
                        {ev.dataLimite && (
                          <span className={`text-xs ${status === 'atrasado' ? 'text-red-600 font-semibold' : 'text-faint'}`}>
                            Prazo: <span className="font-medium">{fmtData(ev.dataLimite)}</span>
                            {status === 'atrasado' && ' ⚠️ Vencido'}
                          </span>
                        )}
                        {ev.dataConclusao && (
                          <span className="text-xs text-green-600">
                            Concluído em: {fmtData(ev.dataConclusao)}
                          </span>
                        )}
                        {isGestor && ev.usuario && (
                          <span className="text-xs text-faint">· {ev.usuario.nome}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!ev.concluido && podeEditar && (
                      <>
                        <button onClick={() => concluir(ev.id)}
                          className="text-xs text-green-600 font-medium hover:underline">
                          ✓ Concluir
                        </button>
                        <button onClick={() => abrirForm(ev)}
                          className="text-xs text-blue-600 hover:underline">
                          Editar
                        </button>
                      </>
                    )}
                    {ev.concluido && podeEditar && (
                      <button onClick={() => reabrir(ev.id)}
                        className="text-xs text-amber-600 hover:underline">
                        Reabrir
                      </button>
                    )}
                    {podeEditar && (
                      <button onClick={() => excluir(ev.id)}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
