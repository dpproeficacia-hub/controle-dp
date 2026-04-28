import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Layout() {
  const { usuario, logout, isAdmin, isGestor } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

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
      <aside className="w-[220px] min-w-[220px] bg-surface border-r border-border flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#F4F3EF">
                <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold text-sm text-ink leading-tight">DPSmart</p>
              <p className="text-[10px] text-faint font-medium uppercase tracking-wider">Depto. Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-faint">Principal</p>
          <NavItem to="/dashboard" icon={<GridIcon/>}>Dashboard</NavItem>
          <NavItem to="/mensal" icon={<CalIcon/>}>Controle Mensal</NavItem>
          <NavItem to="/empresas" icon={<BuildingIcon/>}>Empresas</NavItem>

          <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-faint">Controles</p>
          <NavItem to="/sindical" icon={<StarIcon/>}>Sindical / CCT</NavItem>
          {isGestor && <NavItem to="/responsaveis" icon={<UserIcon/>}>Responsáveis</NavItem>}

          {isAdmin && (
            <>
              <p className="px-2 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-faint">Sistema</p>
              <NavItem to="/identidade" icon={<PaletteIcon/>}>Identidade Visual</NavItem>
            </>
          )}
        </nav>

        <div className="px-2 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface2 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-[11px] font-semibold text-purple-700 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{usuario?.nome}</p>
              <p className="text-[10px] text-faint">{usuario?.nivel}</p>
            </div>
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity text-faint hover:text-red-500 text-xs">Sair</button>
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
            <button onClick={() => navigate('/empresas/nova')} className="btn btn-primary gap-1.5">
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
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span className="w-4 h-4 flex-shrink-0 opacity-70">{icon}</span>
      {children}
    </NavLink>
  );
}

const GridIcon = () => <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
const CalIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="11" rx="2"/><path d="M5 1v4M11 1v4M1 7h14"/></svg>;
const BuildingIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 8h2M9 8h2M5 11h2"/></svg>;
const StarIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 10l-3.7 2.5 1.4-4.3L2 5.5h4.5z"/></svg>;
const UserIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>;
const PaletteIcon = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="8" cy="5" r="1" fill="currentColor"/><circle cx="11" cy="7" r="1" fill="currentColor"/><path d="M8 14c1.5 0 2.5-1 2.5-2s-1-1.5-2.5-1.5"/></svg>;
