import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Plans from './pages/Plans'
import Dashboard from './pages/Dashboard'
import ChatCase from './pages/ChatCase'
import AdminPanel from './pages/AdminPanel'
import ClientPortal from './pages/ClientPortal'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Landing />} />
        <Route path="/planos" element={<Plans />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cliente/:advogadoId" element={<ClientPortal />} />

        {/* Privado */}
        <Route path="/app" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        {/* Compatibilidade */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />

        <Route path="/caso/:caseId" element={
          <PrivateRoute><ChatCase /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute><AdminPanel /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
