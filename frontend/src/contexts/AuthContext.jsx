import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [escritorio, setEscritorio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroResponsavel, setFiltroResponsavelState] = useState(
    () => localStorage.getItem('dp_filtro_responsavel') || 'meu'
  );

  useEffect(() => { verificarAuth(); }, []);

  async function verificarAuth() {
    const token = localStorage.getItem('dp_token');
    if (!token) { setCarregando(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUsuario(data.usuario);
      setEscritorio(data.escritorio);
      await carregarConfigEscritorio();
    } catch {
      localStorage.removeItem('dp_token');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarConfigEscritorio() {
    try {
      const { data } = await api.get('/escritorio/config');
      // Salva no localStorage para uso offline imediato
      localStorage.setItem('dp_identidade', JSON.stringify({
        nomeEscritorio: data.nome,
        corPrimaria: data.corPrimaria || '#1C1B19',
        logo: data.logo || '',
        whatsapp: data.whatsapp || '',
        email: data.emailContato || '',
      }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('dp_token', data.token);
    setUsuario(data.usuario);
    setEscritorio(data.escritorio);
    await carregarConfigEscritorio();
  }

  async function cadastrar(nomeEscritorio, nome, email, senha) {
    const { data } = await api.post('/auth/cadastro', { nomeEscritorio, nome, email, senha });
    localStorage.setItem('dp_token', data.token);
    setUsuario(data.usuario);
    setEscritorio(data.escritorio);
  }

  function logout() {
    localStorage.removeItem('dp_token');
    localStorage.removeItem('dp_identidade');
    localStorage.removeItem('dp_filtro_responsavel');
    setUsuario(null);
    setEscritorio(null);
  }

  function setFiltroResponsavel(valor) {
    setFiltroResponsavelState(valor);
    localStorage.setItem('dp_filtro_responsavel', valor);
  }

  function getResponsavelIdFiltro() {
    if (!usuario) return null;
    if (filtroResponsavel === 'meu') return usuario.id;
    if (filtroResponsavel === 'todos') return null;
    return filtroResponsavel;
  }

  const isAdmin  = usuario?.nivel === 'ADMIN';
  const isGestor = usuario?.nivel === 'GESTOR' || usuario?.nivel === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      usuario, escritorio, carregando,
      login, cadastrar, logout,
      isAdmin, isGestor,
      filtroResponsavel, setFiltroResponsavel, getResponsavelIdFiltro,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
