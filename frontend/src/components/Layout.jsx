import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SinoNotificacoes from './SinoNotificacoes';
import api from '../lib/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CodexLogo = () => (
  <svg width="16" height="16" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 32 L31 60 L50 88" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M70 32 L89 60 L70 88" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".82"/>
    <line x1="60" y1="30" x2="60" y2="90" stroke="#B4B8FF" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

export default function Layout() {
  const { usuario, escritorio, logout, isAdmin, isGestor, filtroResponsavel, setFiltroResponsavel } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [cfg, setCfg] = useState({ corPrimaria: '#1C1B19', logo: '', nomeEscritorio: '' });
  const [responsaveis, setResponsaveis] = useState([]);

  useEffect(() => {
    const s = localStorage.getItem('dp_identidade');
    if (s) { try { setCfg(JSON.parse(s)); } catch {} }
    api.get('/escritorio/config').then(({ data }) => {
      const novo = {
        corPrimaria: data.corPrimaria || '#1C1B19',
        logo: data.logo || '',
        nomeEscritorio: data.nome || 'DPSmart',
      };
      setCfg(novo);
      localStorage.setItem('dp_identidade', JSON.stringify(novo));
    }).catch(() => {});
    const handler = () => {
      const s = localStorage.getItem('dp_identidade');
      if (s) { try { setCfg(JSON.parse(s)); } catch {} }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    if (isGestor) api.get('/responsaveis').then(r => setResponsaveis(r.data)).catch(() => {});
  }, [isGestor]);

  const competencia = `${ano}-${String(mes + 1).padStart(2, '0')}`;

  function mudarMes(d) {
    let nm = mes + d, na = ano;
    if (nm > 11) { nm = 0; na++; }
    if (nm < 0)  { nm = 11; na--; }
    setMes(nm); setAno(na);
  }

  const initials = usuario?.nome?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const nomeEscritorio = cfg.nomeEscritorio || escritorio?.nome || 'DPSmart';

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-[220px] min-w-[220px] flex flex-col border-r border-white/10"
        style={{ background: cfg.corPrimaria }}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {cfg.logo ? (
              <img src={cfg.logo} alt="logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', padding: '2px' }} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5"/>
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-sm leading-tight text-white truncate">{nomeEscritorio}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Depto. Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Principal</p>
          <NI to="/dashboard">Dashboard</NI>
          <NI to="/mensal">Controle Mensal</NI>
          <NI to="/empresas">Empresas</NI>

          <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Controles</p>
          <NI to="/sindical">Sindical / CCT</NI>
          <NI to="/tarefas">Tarefas</NI>
          <NI to="/agenda">Agenda</NI>
          <NI to="/relatorio">Relatórios</NI>
          {isGestor && <NI to="/responsaveis">Responsáveis</NI>}

          {isAdmin && (
            <>
              <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Sistema</p>
              <NI to="/feriados">Feriados</NI>
              <NI to="/identidade">Identidade Visual</NI>
              <NI to="/importacao">Importar Empresas</NI>
            </>
          )}
        </nav>

        <div className="px-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div onClick={() => navigate('/perfil')}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer group transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nome}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{usuario?.nivel}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); logout(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              style={{ color: 'rgba(255,100,100,0.8)' }}>Sair</button>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <CodexLogo />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>DESENVOLVIDO POR</p>
            <p className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>Códex</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-border h-14 flex items-center px-6 gap-3 flex-shrink-0">
          <div className="flex-1" />
          {isGestor && (
            <div className="relative">
              <select
                value={filtroResponsavel}
                onChange={e => setFiltroResponsavel(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-surface2 text-xs font-semibold text-ink cursor-pointer hover:border-border2 transition-colors focus:outline-none focus:ring-1 focus:ring-ink">
                <option value="meu">👤 Minhas empresas</option>
                <option value="todos">🌐 Todas as empresas</option>
                {responsaveis.filter(r => r.id !== usuario?.id).map(r => (
                  <option key={r.id} value={r.id}>👤 {r.nome}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint text-[10px]">▼</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => mudarMes(-1)} className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 text-sm">‹</button>
            <div className="text-center min-w-[160px] relative">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-faint pointer-events-none">Competência</p>
              <p className="text-sm font-semibold text-ink cursor-pointer pointer-events-none">{MESES[mes]} / {ano}</p>
              <input
                type="month"
                value={`${ano}-${String(mes + 1).padStart(2, '0')}`}
                onChange={e => {
                  const [novoAno, novoMes] = e.target.value.split('-').map(Number);
                  if (novoAno && novoMes) { setAno(novoAno); setMes(novoMes - 1); }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Escolher competência no calendário"
              />
            </div>
            <button onClick={() => mudarMes(1)} className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 text-sm">›</button>
          </div>
          <SinoNotificacoes />
          {/* Nova Empresa — disponível para todos os níveis */}
          <button onClick={() => navigate('/empresas/nova')} className="btn gap-1.5 text-white border-0"
            style={{ background: cfg.corPrimaria }}>
            <span className="text-base leading-none">+</span> Nova Empresa
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ competencia, mes, ano }} />
        </main>
      </div>
    </div>
  );
}

function NI({ to, children }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all select-none ${isActive ? 'text-white' : 'hover:text-white'}`
    } style={({ isActive }) => ({
      background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
      color: isActive ? 'white' : 'rgba(255,255,255,0.7)'
    })}>
      {children}
    </NavLink>
  );
}
