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
  const [carregando, setCarregando] = useState(true);

  // Filtro de responsável — persiste entre páginas
  // 'meu' = só as minhas | 'todos' = todas | id = responsável específico
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
          localStorage.setItem('dp_usuario', JSON.stringify(r.data));
        })
        .catch(() => {
          localStorage.removeItem('dp_token');
          localStorage.removeItem('dp_usuario');
          setUsuario(null);
        })
        .finally(() => setCarregando(false));
    } else {
      localStorage.removeItem('dp_token');
      localStorage.removeItem('dp_usuario');
      setCarregando(false);
    }
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('dp_token', data.token);
    localStorage.setItem('dp_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }

  function logout() {
    localStorage.removeItem('dp_token');
    localStorage.removeItem('dp_usuario');
    setUsuario(null);
  }

  const isAdmin  = usuario?.nivel === 'ADMIN';
  const isGestor = usuario?.nivel === 'GESTOR' || isAdmin;

  // Retorna o responsavelId a passar para a API
  // Se OPERADOR: sempre o próprio ID (o backend já filtra, mas reforçamos)
  // Se GESTOR/ADMIN: depende do filtro escolhido
  function getResponsavelIdFiltro() {
    if (!isGestor) return usuario?.id || null;
    if (filtroResponsavel === 'meu') return usuario?.id || null;
    if (filtroResponsavel === 'todos') return null;
    return filtroResponsavel; // ID de outro responsável
  }

  return (
    <AuthContext.Provider value={{
      usuario, login, logout, carregando, isAdmin, isGestor,
      filtroResponsavel, setFiltroResponsavel, getResponsavelIdFiltro
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
