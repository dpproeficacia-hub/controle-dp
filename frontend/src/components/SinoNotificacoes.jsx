import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';

const ICONE_TIPO = {
  REAJUSTE_APLICADO: '💰',
  GERAL: '🔔',
};

export default function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Polling a cada 30 segundos para verificar novas notificações
  useEffect(() => {
    buscarNaoLidas();
    const interval = setInterval(buscarNaoLidas, 30000);
    return () => clearInterval(interval);
  }, []);

  async function buscarNaoLidas() {
    try {
      const { data } = await api.get('/notificacoes/nao-lidas');
      setNaoLidas(data.total);
    } catch {}
  }

  async function abrirSino() {
    setAberto(!aberto);
    if (!aberto) {
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
    <div className="relative" ref={ref}>
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
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface2">
            <span className="text-sm font-semibold text-ink">Notificações</span>
            {naoLidas > 0 && (
              <button onClick={lerTodas} className="text-xs text-blue-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
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
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-surface2 transition-colors ${!n.lida ? 'bg-blue-50' : ''}`}>
                  <div className="flex-shrink-0 text-lg mt-0.5">
                    {ICONE_TIPO[n.tipo] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold ${!n.lida ? 'text-ink' : 'text-muted'}`}>{n.titulo}</p>
                      <button onClick={e => excluir(e, n.id)}
                        className="text-faint hover:text-red-500 flex-shrink-0 text-[10px] mt-0.5">✕</button>
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.mensagem}</p>
                    <p className="text-[10px] text-faint mt-1">{fmtTempo(n.criadoEm)}</p>
                  </div>
                  {!n.lida && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
