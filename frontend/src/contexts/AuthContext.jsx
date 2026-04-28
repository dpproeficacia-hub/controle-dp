import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const s = localStorage.getItem('dp_usuario');
    return s ? JSON.parse(s) : null;
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dp_token');
    if (token) {
      api.get('/auth/me')
        .then(r => { setUsuario(r.data); localStorage.setItem('dp_usuario', JSON.stringify(r.data)); })
        .catch(() => { localStorage.clear(); setUsuario(null); })
        .finally(() => setCarregando(false));
    } else {
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

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando, isAdmin, isGestor }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
