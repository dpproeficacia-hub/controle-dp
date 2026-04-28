import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Mensal from './pages/Mensal';
import EmpresaDetalhe from './pages/EmpresaDetalhe';
import Empresas from './pages/Empresas';
import EmpresaForm from './pages/EmpresaForm';
import Sindical from './pages/Sindical';
import Responsaveis from './pages/Responsaveis';
import Identidade from './pages/Identidade';

function Protegido({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    </div>
  );
  return usuario ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protegido><Layout /></Protegido>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="mensal" element={<Mensal />} />
            <Route path="mensal/:empresaId" element={<EmpresaDetalhe />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="empresas/nova" element={<EmpresaForm />} />
            <Route path="empresas/:id/editar" element={<EmpresaForm />} />
            <Route path="sindical" element={<Sindical />} />
            <Route path="responsaveis" element={<Responsaveis />} />
            <Route path="identidade" element={<Identidade />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
