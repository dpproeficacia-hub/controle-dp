import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export default function SinoNotificacoes() {
  const [total, setTotal] = useState(0);
  const [eventos, setEventos] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    buscarContagem();
    const interval = setInterval(buscarContagem, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  async function buscarContagem() {
    try {
      const { data } = await api.get('/agenda/notificacoes');
      setTotal(data.total);
    } catch {}
  }

  async function abrirPainel() {
    if (aberto) { setAberto(false); return; }
    setAberto(true);
    setLoading(true);
    try {
      const { data } = await api.get('/agenda?concluido=false');
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const ativos = data.filter(ev => {
        const ini = new Date(ev.dataInicio); ini.setHours(0,0,0,0);
        return ini <= hoje;
      });
      setEventos(ativos);
    } finally {
      setLoading(false);
    }
  }

  async function concluir(id, e) {
    e.stopPropagation();
    await api.patch(`/agenda/${id}/concluir`);
    setEventos(prev => prev.filter(ev => ev.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  }

  function statusEvento(ev) {
    if (!ev.dataLimite) return 'ativo';
    const lim = new Date(ev.dataLimite); lim.setHours(0,0,0,0);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return lim < hoje ? 'atrasado' : 'ativo';
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={abrirPainel}
        className="relative w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5v2.5L2 10h12l-1.5-1.5V6A4.5 4.5 0 0 0 8 1.5z"/>
          <path d="M6.5 13a1.5 1.5 0 0 0 3 0"/>
        </svg>
        {total > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-10 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface2">
            <span className="text-sm font-semibold text-ink">
              Agenda — {total} pendente{total !== 1 ? 's' : ''}
            </span>
            <button onClick={() => { setAberto(false); navigate('/agenda'); }}
              className="text-xs text-blue-600 hover:underline">
              Ver tudo
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-muted text-sm">Carregando...</div>
            ) : eventos.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-faint">Nenhum evento pendente</div>
            ) : (
              eventos.map(ev => {
                const status = statusEvento(ev);
                return (
                  <div key={ev.id}
                    className={`px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface2 cursor-pointer ${status === 'atrasado' ? 'bg-red-50' : ''}`}
                    onClick={() => { setAberto(false); navigate('/agenda'); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${status === 'atrasado' ? 'text-red-700' : 'text-ink'}`}>
                          {status === 'atrasado' && '⚠️ '}{ev.titulo}
                        </p>
                        {ev.empresa && (
                          <p className="text-[10px] text-blue-600 mt-0.5 truncate">{ev.empresa.razaoSocial}</p>
                        )}
                        <p className="text-[10px] text-faint mt-0.5">
                          {status === 'atrasado'
                            ? `Prazo venceu em ${fmtData(ev.dataLimite)}`
                            : `Desde ${fmtData(ev.dataInicio)}`}
                        </p>
                      </div>
                      <button onClick={e => concluir(ev.id, e)}
                        className="text-[10px] text-green-600 font-semibold hover:underline flex-shrink-0 mt-0.5">
                        ✓
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-surface2">
            <button onClick={() => { setAberto(false); navigate('/agenda'); }}
              className="text-xs text-blue-600 hover:underline w-full text-center">
              Abrir agenda completa →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
