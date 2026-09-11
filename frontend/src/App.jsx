import { Navigate, Outlet, useLocation } from 'react-router-dom'
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
import NotFound from './pages/NotFound'
import { initMetaPixel, trackPageView } from './lib/metaPixel'

function PrivateRoute({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
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

function Layout() {
  return (
    <>
      <PixelTracker />
      <Outlet />
    </>
  )
}

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      // Publico - sem restricao
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'cadastro', element: <Register /> },
      { path: 'upload', element: <UploadContract /> },
      { path: 'analise/:contractId', element: <AnalysisResult /> },
      { path: 'pagamento/:analysisId', element: <Payment /> },
      { path: 'laudo/:analysisId', element: <Report /> },
      { path: 'ranking', element: <Ranking /> },
      { path: 'blog', element: <Blog /> },
      { path: 'comparador', element: <Comparador /> },
      { path: 'privacidade', element: <Privacidade /> },

      // Privado - requer conta cadastrada
      { path: 'app', element: <PrivateRoute><Dashboard /></PrivateRoute> },

      { path: '*', element: <NotFound /> },
    ],
  },
]
