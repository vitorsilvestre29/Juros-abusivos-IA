import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UploadContract from './pages/UploadContract'
import AnalysisResult from './pages/AnalysisResult'
import Payment from './pages/Payment'
import Report from './pages/Report'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (token === null) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Publico */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />

        {/* Privado */}
        <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/upload" element={<PrivateRoute><UploadContract /></PrivateRoute>} />
        <Route path="/analise/:contractId" element={<PrivateRoute><AnalysisResult /></PrivateRoute>} />
        <Route path="/pagamento/:analysisId" element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/laudo/:analysisId" element={<PrivateRoute><Report /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
