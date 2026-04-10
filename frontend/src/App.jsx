import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UploadContract from './pages/UploadContract'
import AnalysisResult from './pages/AnalysisResult'
import Payment from './pages/Payment'
import Report from './pages/Report'

function SessionRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/" replace />
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  const userRaw = localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : null
  if (!token) return <Navigate to="/login" replace />
  if (user?.is_guest) return <Navigate to="/upload" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />

        {/* Privado */}
        <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/upload" element={<SessionRoute><UploadContract /></SessionRoute>} />
        <Route path="/analise/:contractId" element={<SessionRoute><AnalysisResult /></SessionRoute>} />
        <Route path="/pagamento/:analysisId" element={<SessionRoute><Payment /></SessionRoute>} />
        <Route path="/laudo/:analysisId" element={<SessionRoute><Report /></SessionRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
