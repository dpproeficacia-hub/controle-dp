import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const s = localStorage.getItem('dp_usuario');
      return s && s !== 'undefined' ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [escritorio, setEscritorio] = useState(() => {
    try {
      const s = localStorage.getItem('dp_escritorio');
      return s && s !== 'undefined' ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [carregando, setCarregando] = useState(true);
  const [filtroResponsavel, setFiltroResponsavelState] = useState(() => {
    return localStorage.getItem('dp_filtro_responsavel') || 'meu';
  });

  function setFiltroResponsavel(valor) {
    setFiltroResponsavelState(valor);
    localStorage.setItem('dp_filtro_responsavel', valor);
  }

  useEffect(() => {
    const token = localStorage.getItem('dp_token');
    if (token && token !== 'undefined') {
      api.get('/auth/me')
        .then(r => {
          setUsuario(r.data);
          setEscritorio(r.data.escritorio);
          localStorage.setItem('dp_usuario', JSON.stringify(r.data));
          localStorage.setItem('dp_escritorio', JSON.stringify(r.data.escritorio));
        })
        .catch(() => {
          localStorage.removeItem('dp_token');
          localStorage.removeItem('dp_usuario');
          localStorage.removeItem('dp_escritorio');
          setUsuario(null);
          setEscritorio(null);
        })
        .finally(() => setCarregando(false));
    } else {
      localStorage.removeItem('dp_token');
      localStorage.removeItem('dp_usuario');
      localStorage.removeItem('dp_escritorio');
      setCarregando(false);
    }
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('dp_token', data.token);
    localStorage.setItem('dp_usuario', JSON.stringify(data.usuario));
    localStorage.setItem('dp_escritorio', JSON.stringify(data.escritorio));
    setUsuario(data.usuario);
    setEscritorio(data.escritorio);
    return data.usuario;
  }

  async function cadastrar(nomeEscritorio, nome, email, senha) {
    const { data } = await api.post('/auth/cadastro', { nomeEscritorio, nome, email, senha });
    localStorage.setItem('dp_token', data.token);
    localStorage.setItem('dp_usuario', JSON.stringify(data.usuario));
    localStorage.setItem('dp_escritorio', JSON.stringify(data.escritorio));
    setUsuario(data.usuario);
    setEscritorio(data.escritorio);
    return data.usuario;
  }

  function logout() {
    localStorage.removeItem('dp_token');
    localStorage.removeItem('dp_usuario');
    localStorage.removeItem('dp_escritorio');
    localStorage.removeItem('dp_filtro_responsavel');
    setUsuario(null);
    setEscritorio(null);
  }

  function getResponsavelIdFiltro() {
    if (!isGestor) return usuario?.id || null;
    if (filtroResponsavel === 'meu') return usuario?.id || null;
    if (filtroResponsavel === 'todos') return null;
    return filtroResponsavel;
  }

  const isAdmin  = usuario?.nivel === 'ADMIN';
  const isGestor = usuario?.nivel === 'GESTOR' || isAdmin;

  return (
    <AuthContext.Provider value={{
      usuario, escritorio, login, cadastrar, logout, carregando,
      isAdmin, isGestor, filtroResponsavel, setFiltroResponsavel, getResponsavelIdFiltro
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
