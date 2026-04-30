import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Layout() {
  const { usuario, logout, isAdmin, isGestor } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [id, setId] = useState({ nomeEscritorio:'DPSmart', corPrimaria:'#1C1B19', corSecundaria:'#185FA5', logo:'' });

  useEffect(() => {
    const load = () => {
      const s = localStorage.getItem('dp_identidade');
      if (s) setId(JSON.parse(s));
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const competencia = `${ano}-${String(mes+1).padStart(2,'0')}`;

  function mudarMes(d) {
    let nm = mes+d, na = ano;
    if (nm > 11) { nm=0; na++; }
    if (nm < 0)  { nm=11; na--; }
    setMes(nm); setAno(na);
  }

  const initials = usuario?.nome?.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-[220px] min-w-[220px] flex flex-col border-r border-white/10"
        style={{background: id.corPrimaria}}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {id.logo ? (
              <img src={id.logo} alt="logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" style={{background:'rgba(255,255,255,0.15)',padding:'2px'}} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(255,255,255,0.2)'}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5"/>
                </svg>
              </div>
            )}
            <div>
              <p className="font-display font-bold text-sm leading-tight text-white">{id.nomeEscritorio}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{color:'rgba(255,255,255,0.5)'}}>Depto. Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>Principal</p>
          <NI to="/dashboard">Dashboard</NI>
          <NI to="/mensal">Controle Mensal</NI>
          <NI to="/empresas">Empresas</NI>
          <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>Controles</p>
          <NI to="/sindical">Sindical / CCT</NI>
          {isGestor && <NI to="/responsaveis">Responsáveis</NI>}
          {isGestor && <NI to="/tarefas">Tarefas Extras</NI>}
          <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>Relatórios</p>
          <NI to="/relatorio">Relatórios</NI>
          {isAdmin && (
            <>
              <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>Sistema</p>
              <NI to="/identidade">Identidade Visual</NI>
            </>
          )}
        </nav>

        <div className="px-2 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer group transition-colors"
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
              style={{background:'rgba(255,255,255,0.2)'}}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nome}</p>
              <p className="text-[10px]" style={{color:'rgba(255,255,255,0.5)'}}>{usuario?.nivel}</p>
            </div>
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              style={{color:'rgba(255,100,100,0.8)'}}>Sair</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-border h-14 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-surface2 border border-border rounded-lg px-3 py-1.5">
            <button onClick={() => mudarMes(-1)}
              className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink transition-colors font-bold">
              ‹
            </button>
            <span className="text-sm font-semibold text-ink min-w-[120px] text-center">
              {MESES[mes]} {ano}
            </span>
            <button onClick={() => mudarMes(1)}
              className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink transition-colors font-bold">
              ›
            </button>
          </div>
          <div className="flex-1" />
          {isGestor && (
            <button onClick={() => navigate('/empresas/nova')} className="btn gap-1.5 text-white border-0"
              style={{background: id.corPrimaria}}>
              <span className="text-base leading-none">+</span> Nova Empresa
            </button>
          )}
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
    } style={({ isActive }) => ({ background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent', color: isActive ? 'white' : 'rgba(255,255,255,0.7)' })}>
      {children}
    </NavLink>
  );
}
