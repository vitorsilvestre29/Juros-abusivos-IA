import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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
import Privacidade from './pages/Privacidade'
import { initMetaPixel, trackPageView } from './lib/metaPixel'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (token === null) return <Navigate to="/login" replace />
  return children
}

function PixelTracker() {
  const location = useLocation()

  useEffect(() => {
    initMetaPixel()
  }, [])

  useEffect(() => {
    trackPageView()
  }, [location.pathname, location.search, location.hash])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <PixelTracker />
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
        <Route path="/privacidade" element={<Privacidade />} />

        {/* Privado - requer conta cadastrada */}
        <Route path="/app" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
