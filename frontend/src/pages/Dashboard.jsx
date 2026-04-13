import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory } from '../lib/api'
import useIsMobile from '../lib/useIsMobile'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

const STATUS_LABEL = { pending: 'Aguardando', processing: 'Analisando', completed: 'Concluido', failed: 'Erro' }
const STATUS_COLOR = { pending: '#B45309', processing: '#1D4ED8', completed: '#15803D', failed: '#B91C1C' }
const STATUS_BG    = { pending: '#FEF9C3', processing: '#EFF6FF', completed: '#F0FDF4', failed: '#FEF2F2' }

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Dashboard() {
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory().then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    nav('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '12px 16px' : '0 24px', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>LaudoJuros</Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <Link to="/upload" style={{ background: O, color: N, textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '9px 20px', borderRadius: 8, fontFamily: sans, flex: isMobile ? 1 : 'initial', textAlign: 'center' }}>
              + Nova analise
            </Link>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#7E9BB5', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: sans, flex: isMobile ? 1 : 'initial' }}>
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '36px 16px 48px' : '52px 24px' }}>
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontFamily: serif, fontSize: isMobile ? 28 : 34, fontWeight: 700, color: N, marginBottom: 6 }}>Minhas analises</h1>
          <p style={{ color: muted, fontSize: 15 }}>Historico de contratos enviados para analise</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: muted, fontSize: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            Carregando...
          </div>
        )}

        {loading === false && history.length === 0 && (
          <div style={{ background: white, border: '1px solid ' + border, borderRadius: 20, padding: isMobile ? '48px 20px' : '72px 32px', textAlign: 'center', boxShadow: '0 2px 16px rgba(13,33,55,0.05)' }}>
            <div style={{ width: 80, height: 80, background: bg, border: '1px solid ' + border, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>📄</div>
            <h2 style={{ fontFamily: serif, fontSize: 24, color: N, marginBottom: 10 }}>Nenhuma analise ainda</h2>
            <p style={{ color: muted, fontSize: 15, marginBottom: 32 }}>Envie seu primeiro contrato para comecar</p>
            <Link to="/upload" style={{ background: N, color: white, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 12, fontFamily: sans }}>
              Enviar contrato
            </Link>
          </div>
        )}

        {loading === false && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {history.map(item => (
              <div key={item.contract_id} style={{ background: white, border: '1px solid ' + border, borderRadius: 18, padding: isMobile ? '20px 18px' : '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: '0 2px 8px rgba(13,33,55,0.04)' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: muted, fontWeight: 500 }}>{item.loan_type_label}</span>
                    <span style={{ background: STATUS_BG[item.analysis_status] || '#F3F4F6', color: STATUS_COLOR[item.analysis_status] || muted, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {STATUS_LABEL[item.analysis_status] || item.analysis_status}
                    </span>
                    {item.paid && <span style={{ background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>PAGO</span>}
                  </div>
                  <p style={{ fontWeight: 700, color: N, fontSize: 15, marginBottom: 4 }}>{item.filename}</p>
                  <p style={{ color: '#94A3B8', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                {item.impact_brl > 0 && (
                  <div style={{ textAlign: isMobile ? 'left' : 'right', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 16px', width: isMobile ? '100%' : 'auto' }}>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Impacto estimado</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#B91C1C', fontFamily: serif }}>{fmt(item.impact_brl)}</p>
                  </div>
                )}

                <div style={{ width: isMobile ? '100%' : 'auto' }}>
                  {item.analysis_status === 'completed' && item.paid === false && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: N, color: white, border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans, width: isMobile ? '100%' : 'auto' }}>
                      Ver resultado
                    </button>
                  )}
                  {item.paid && item.analysis_id && (
                    <button onClick={() => nav('/laudo/' + item.analysis_id)} style={{ background: '#15803D', color: white, border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans, width: isMobile ? '100%' : 'auto' }}>
                      Ver laudo
                    </button>
                  )}
                  {(item.analysis_status === 'pending' || item.analysis_status === 'processing') && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: bg, color: muted, border: '1px solid ' + border, borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans, width: isMobile ? '100%' : 'auto' }}>
                      Acompanhar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
