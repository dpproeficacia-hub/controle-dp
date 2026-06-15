import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';

const ICONE_TIPO = {
  REAJUSTE_APLICADO: '💰',
  AVISO: '📢',
  GERAL: '🔔',
};

const COR_TIPO = {
  REAJUSTE_APLICADO: 'bg-amber-50',
  AVISO: 'bg-purple-50',
  GERAL: '',
};

export default function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostraAviso, setMostraAviso] = useState(false);
  const [formAviso, setFormAviso] = useState({ titulo: '', mensagem: '', destinatarios: 'todos' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false);
        setMostraAviso(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    buscarNaoLidas();
    const interval = setInterval(buscarNaoLidas, 30000);
    return () => clearInterval(interval);
  }, []);

  // Carrega usuários quando abre o modal de aviso
  useEffect(() => {
    if (mostraAviso && usuarios.length === 0) {
      api.get('/responsaveis').then(r => setUsuarios(r.data)).catch(() => {});
    }
  }, [mostraAviso]);

  async function buscarNaoLidas() {
    try {
      const { data } = await api.get('/notificacoes/nao-lidas');
      setNaoLidas(data.total);
    } catch {}
  }

  async function abrirSino() {
    const novoEstado = !aberto;
    setAberto(novoEstado);
    setMostraAviso(false);
    if (novoEstado) {
      setLoading(true);
      try {
        const { data } = await api.get('/notificacoes');
        setNotificacoes(data);
      } catch {}
      setLoading(false);
    }
  }

  async function lerTodas() {
    try {
      await api.patch('/notificacoes/ler-todas');
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setNaoLidas(0);
    } catch {}
  }

  async function lerUma(notif) {
    if (!notif.lida) {
      try {
        await api.patch(`/notificacoes/${notif.id}/ler`);
        setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
        setNaoLidas(prev => Math.max(0, prev - 1));
      } catch {}
    }
  }

  async function excluir(e, id) {
    e.stopPropagation();
    try {
      await api.delete(`/notificacoes/${id}`);
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    } catch {}
  }

  function toggleDestinatario(id) {
    setDestinatariosSelecionados(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    );
  }

  async function enviarAviso(e) {
    e.preventDefault();
    if (!formAviso.titulo.trim() || !formAviso.mensagem.trim()) return;

    // Monta destinatários
    let destinatarios;
    if (formAviso.destinatarios === 'todos') {
      destinatarios = 'todos';
    } else {
      if (destinatariosSelecionados.length === 0) {
        alert('Selecione pelo menos um destinatário.');
        return;
      }
      destinatarios = destinatariosSelecionados;
    }

    setEnviando(true);
    try {
      await api.post('/notificacoes/aviso', {
        titulo: formAviso.titulo,
        mensagem: formAviso.mensagem,
        destinatarios
      });
      setEnviado(true);
      setFormAviso({ titulo: '', mensagem: '', destinatarios: 'todos' });
      setDestinatariosSelecionados([]);
      setTimeout(() => { setEnviado(false); setMostraAviso(false); }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar aviso');
    } finally {
      setEnviando(false);
    }
  }

  function fmtTempo(data) {
    const diff = Date.now() - new Date(data).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `há ${d} dia${d > 1 ? 's' : ''}`;
    if (h > 0) return `há ${h}h`;
    if (min > 0) return `há ${min}min`;
    return 'agora';
  }

  return (
    <div className="flex items-center gap-2" ref={ref}>

      {/* Botão de enviar aviso */}
      <div className="relative">
        <button
          onClick={() => { setMostraAviso(!mostraAviso); setAberto(false); }}
          title="Enviar aviso para a equipe"
          className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 transition-colors text-sm">
          📢
        </button>

        {mostraAviso && (
          <div className="absolute right-0 top-10 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-purple-50">
              <span className="text-sm font-semibold text-purple-900">📢 Enviar aviso para a equipe</span>
              <button onClick={() => setMostraAviso(false)} className="text-faint hover:text-ink text-xs">✕</button>
            </div>

            {enviado ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-semibold text-green-700">Aviso enviado com sucesso!</p>
              </div>
            ) : (
              <form onSubmit={enviarAviso} className="p-4 space-y-3">
                <div>
                  <label className="label">Título</label>
                  <input className="input text-sm" required
                    value={formAviso.titulo}
                    onChange={e => setFormAviso(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Reunião amanhã às 9h" />
                </div>
                <div>
                  <label className="label">Mensagem</label>
                  <textarea className="input text-sm h-20 resize-none py-2" required
                    value={formAviso.mensagem}
                    onChange={e => setFormAviso(f => ({ ...f, mensagem: e.target.value }))}
                    placeholder="Descreva o aviso..." />
                </div>
                <div>
                  <label className="label">Enviar para</label>
                  <select className="select text-sm mb-2"
                    value={formAviso.destinatarios}
                    onChange={e => {
                      setFormAviso(f => ({ ...f, destinatarios: e.target.value }));
                      setDestinatariosSelecionados([]);
                    }}>
                    <option value="todos">Toda a equipe</option>
                    <option value="individual">Pessoa específica</option>
                  </select>

                  {/* Seleção individual */}
                  {formAviso.destinatarios === 'individual' && (
                    <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                      {usuarios.length === 0 ? (
                        <p className="text-xs text-faint p-3 text-center">Carregando usuários...</p>
                      ) : (
                        usuarios.map(u => (
                          <label key={u.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-surface2 cursor-pointer border-b border-border last:border-b-0">
                            <div
                              onClick={() => toggleDestinatario(u.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${destinatariosSelecionados.includes(u.id) ? 'bg-ink border-ink' : 'border-border2'}`}>
                              {destinatariosSelecionados.includes(u.id) && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-ink truncate">{u.nome}</p>
                              <p className="text-[10px] text-faint">{u.nivel}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {formAviso.destinatarios === 'individual' && destinatariosSelecionados.length > 0 && (
                    <p className="text-xs text-muted mt-1">{destinatariosSelecionados.length} pessoa(s) selecionada(s)</p>
                  )}
                </div>

                <button type="submit" disabled={enviando} className="btn btn-primary w-full justify-center text-sm">
                  {enviando
                    ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    : 'Enviar aviso'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Sino de notificações */}
      <div className="relative">
        <button onClick={abrirSino}
          className="relative w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a4.5 4.5 0 00-4.5 4.5v2L2 10v1h12v-1l-1.5-1.5v-2A4.5 4.5 0 008 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>

        {aberto && (
          <div className="absolute right-0 top-10 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface2">
              <span className="text-sm font-semibold text-ink">Notificações</span>
              {naoLidas > 0 && (
                <button onClick={lerTodas} className="text-xs text-blue-600 hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-20 text-faint text-xs">Carregando...</div>
              ) : notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-faint">
                  <span className="text-2xl mb-1">🔔</span>
                  <p className="text-xs">Nenhuma notificação</p>
                </div>
              ) : (
                notificacoes.map(n => (
                  <div key={n.id} onClick={() => lerUma(n)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-surface2 transition-colors ${!n.lida ? (COR_TIPO[n.tipo] || 'bg-blue-50') : ''}`}>
                    <div className="flex-shrink-0 text-lg mt-0.5">{ICONE_TIPO[n.tipo] || '🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold ${!n.lida ? 'text-ink' : 'text-muted'}`}>{n.titulo}</p>
                        <button onClick={e => excluir(e, n.id)}
                          className="text-faint hover:text-red-500 flex-shrink-0 text-[10px] mt-0.5">✕</button>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.mensagem}</p>
                      <p className="text-[10px] text-faint mt-1">{fmtTempo(n.criadoEm)}</p>
                    </div>
                    {!n.lida && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
