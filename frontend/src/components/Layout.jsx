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
