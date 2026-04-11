import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UploadContract from './pages/UploadContract'
import AnalysisResult from './pages/AnalysisResult'
import Payment from './pages/Payment'
import Report from './pages/Report'
import Ranking from './pages/Ranking'
import Blog from './pages/Blog'
import Comparador from './pages/Comparador'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (token === null) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Publico - sem restricao */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/upload" element={<UploadContract />} />
        <Route path="/analise/:contractId" element={<AnalysisResult />} />
        <Route path="/pagamento/:analysisId" element={<Payment />} />
        <Route path="/laudo/:analysisId" element={<Report />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/comparador" element={<Comparador />} />

        {/* Privado - requer conta cadastrada */}
        <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
