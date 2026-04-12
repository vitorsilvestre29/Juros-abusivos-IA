import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory } from '../lib/api'

const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', bg: '#F7F5F0',
  cream: '#FAF8F3', border: '#E8E2D9', red: '#C0392B',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

const STATUS_LABEL = { pending: 'Aguardando', processing: 'Analisando', completed: 'Concluido', failed: 'Erro' }

function StatusBadge({ status }) {
  const styles = {
    pending:    { bg: 'rgba(217,119,6,0.12)',  color: '#FBB040', border: 'rgba(217,119,6,0.3)'  },
    processing: { bg: 'rgba(29,78,216,0.12)',  color: '#60A5FA', border: 'rgba(29,78,216,0.3)'  },
    completed:  { bg: 'rgba(21,128,61,0.12)',  color: '#4CAF50', border: 'rgba(21,128,61,0.3)'  },
    failed:     { bg: 'rgba(192,57,43,0.12)',  color: '#E57373', border: 'rgba(192,57,43,0.3)'  },
  }
  const s = styles[status] || { bg: 'rgba(156,163,175,0.12)', color: G.mutedDark, border: 'rgba(156,163,175,0.3)' }
  return (
    <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: sans }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Dashboard() {
  const nav = useNavigate()
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
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      <nav style={{ background: G.dark, borderBottom: '1px solid ' + G.goldBorder, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
            Juros Abusivos IA
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/upload" style={{ background: G.gold, color: G.dark, textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, fontFamily: sans }}>
              + Nova analise
            </Link>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: G.mutedDark, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: sans }}>
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '52px 24px' }}>

        <div style={{ marginBottom: 44 }}>
          <p style={{ color: G.gold, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Painel</p>
          <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 700, color: G.text, marginBottom: 6, letterSpacing: '-1px' }}>Minhas analises</h1>
          <p style={{ color: G.muted, fontSize: 15 }}>Historico de contratos enviados para analise</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid ' + G.gold, borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: G.muted, fontSize: 15 }}>Carregando...</p>
          </div>
        )}

        {loading === false && history.length === 0 && (
          <div style={{ background: G.white, border: '1px solid ' + G.border, borderRadius: 20, padding: '72px 32px', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 80, height: 80, background: G.cream, border: '1px solid ' + G.border, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>📄</div>
            <h2 style={{ fontFamily: serif, fontSize: 26, color: G.text, marginBottom: 10 }}>Nenhuma analise ainda</h2>
            <p style={{ color: G.muted, fontSize: 15, marginBottom: 32 }}>Envie seu primeiro contrato para comecar</p>
            <Link to="/upload" style={{ background: G.dark, color: G.white, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 12, fontFamily: sans }}>
              Enviar contrato
            </Link>
          </div>
        )}

        {loading === false && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(item => (
              <div key={item.contract_id} style={{ background: G.white, border: '1px solid ' + G.border, borderRadius: 16, padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: G.muted, fontWeight: 500 }}>{item.loan_type_label}</span>
                    <StatusBadge status={item.analysis_status} />
                    {item.paid && (
                      <span style={{ background: 'rgba(21,128,61,0.12)', color: '#4CAF50', border: '1px solid rgba(21,128,61,0.3)', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: 1.2, textTransform: 'uppercase' }}>PAGO</span>
                    )}
                  </div>
                  <p style={{ fontWeight: 700, color: G.text, fontSize: 15, marginBottom: 4, fontFamily: sans }}>{item.filename}</p>
                  <p style={{ color: G.mutedDark, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                {item.impact_brl > 0 && (
                  <div style={{ textAlign: 'right', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 12, padding: '10px 16px' }}>
                    <p style={{ fontSize: 10, color: G.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Impacto estimado</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: G.red, fontFamily: serif }}>{fmt(item.impact_brl)}</p>
                  </div>
                )}

                <div>
                  {item.analysis_status === 'completed' && item.paid === false && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: G.dark, color: G.white, border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>
                      Ver resultado
                    </button>
                  )}
                  {item.paid && item.analysis_id && (
                    <button onClick={() => nav('/laudo/' + item.analysis_id)} style={{ background: G.gold, color: G.dark, border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>
                      Ver laudo
                    </button>
                  )}
                  {(item.analysis_status === 'pending' || item.analysis_status === 'processing') && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: G.cream, color: G.muted, border: '1px solid ' + G.border, borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>
                      Acompanhar
                    </button>
                  )}
                  {item.analysis_status === 'failed' && (
                    <button onClick={() => nav('/upload')} style={{ background: 'rgba(192,57,43,0.1)', color: G.red, border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: sans }}>
                      Tentar novamente
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
