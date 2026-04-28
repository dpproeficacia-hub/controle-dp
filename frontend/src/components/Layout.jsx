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
  const [identidade, setIdentidade] = useState({ nomeEscritorio:'DPSmart', corPrimaria:'#1C1B19', corSecundaria:'#185FA5', logo:'' });

  useEffect(() => {
    const saved = localStorage.getItem('dp_identidade');
    if (saved) setIdentidade(JSON.parse(saved));
    window.addEventListener('storage', () => {
      const s = localStorage.getItem('dp_identidade');
      if (s) setIdentidade(JSON.parse(s));
    });
  }, []);

  const competencia = `${ano}-${String(mes + 1).padStart(2, '0')}`;

  function mudarMes(d) {
    let nm = mes + d, na = ano;
    if (nm > 11) { nm = 0; na++; }
    if (nm < 0)  { nm = 11; na--; }
    setMes(nm); setAno(na);
  }

  const initials = usuario?.nome?.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-[220px] min-w-[220px] flex flex-col border-r border-border" style={{background: identidade.corPrimaria}}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {identidade.logo ? (
              <img src={identidade.logo} alt="logo" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5"/>
                </svg>
              </div>
            )}
            <div>
              <p className="font-display font-bold text-sm leading-tight text-white">{identidade.nomeEscritorio}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Depto. Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Principal</p>
          <NavItem to="/dashboard" icon={<GridIcon/>}>Dashboard</NavItem>
          <NavItem to="/mensal" icon={<CalIcon/>}>Controle Mensal</NavItem>
          <NavItem to="/empresas" icon={<BuildingIcon/>}>Empresas</NavItem>

          <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Controles</p>
          <NavItem to="/sindical" icon={<StarIcon/>}>Sindical / CCT</NavItem>
          {isGestor && <NavItem to="/responsaveis" icon={<UserIcon/>}>Responsáveis</NavItem>}

          {isAdmin && (
            <>
              <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Sistema</p>
              <NavItem to="/identidade" icon={<PaletteIcon/>}>Identidade Visual</NavItem>
            </>
          )}
        </nav>

        <div className="px-2 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nome}</p>
              <p className="text-[10px] text-white/50">{usuario?.nivel}</p>
            </div>
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-red-300 text-xs">Sair</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-border h-14 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => mudarMes(-1)} className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 transition-colors text-sm">‹</button>
            <span className="text-sm font-semibold text-ink min-w-[110px] text-center">{MESES[mes]} / {ano}</span>
            <button onClick={() => mudarMes(1)} className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:bg-surface2 transition-colors text-sm">›</button>
          </div>
          {isGestor && (
            <button onClick={() => navigate('/empresas/nova')}
              className="btn gap-1.5 text-white"
              style={{background: identidade.corPrimaria, borderColor: identidade.corPrimaria}}>
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

function NavItem({ to, icon, children }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all select-none ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
    }>
      <span className="w-4 h-4 flex-shrink-0 opacity-80">{icon}</span>
      {children}
    </NavLink>
  );
}

const GridIcon = () => <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
const CalIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" wid
