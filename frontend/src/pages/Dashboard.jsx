import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory } from '../lib/api'

const STATUS_LABEL = { pending: 'Aguardando', processing: 'Analisando', completed: 'Concluido', failed: 'Erro' }
const STATUS_COLOR = { pending: '#FF9F1C', processing: '#2563EB', completed: '#1A6B3C', failed: '#8B1A1A' }
const STATUS_BG    = { pending: '#FFF4E5', processing: '#EFF6FF', completed: '#F0FDF4', failed: '#FEF2F2' }

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Dashboard() {
  const nav = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    nav('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F8FF' }}>
      {/* Header */}
      <nav style={{ background: '#10233F', borderBottom: '1px solid #1F4E79' }}>
        <div className="mobile-safe" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '8px 18px', borderRadius: 8 }}>
              + Nova analise
            </Link>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid #3B4D63', color: '#7E91A6', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="mobile-safe" style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 32, fontWeight: 700, color: '#10233F', marginBottom: 6 }}>Minhas analises</h1>
          <p style={{ color: '#56677B', fontSize: 15 }}>Historico de contratos enviados para analise</p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#7E8FA5' }}>Carregando...</div>
        )}

        {!loading && history.length === 0 && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 20, padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 22, color: '#10233F', marginBottom: 10 }}>Nenhuma analise ainda</h2>
            <p style={{ color: '#56677B', fontSize: 15, marginBottom: 28 }}>Envie seu primeiro contrato para comecar</p>
            <Link to="/upload" style={{ background: '#10233F', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 10 }}>
              Enviar contrato
            </Link>
          </div>
        )}

        {!loading && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map(item => (
              <div key={item.contract_id} style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#56677B' }}>{item.loan_type_label}</span>
                    <span style={{
                      background: STATUS_BG[item.analysis_status] || '#F3F4F6',
                      color: STATUS_COLOR[item.analysis_status] || '#56677B',
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                      textTransform: 'uppercase', letterSpacing: 0.5
                    }}>
                      {STATUS_LABEL[item.analysis_status] || item.analysis_status}
                    </span>
                    {item.paid && <span style={{ background: '#F0FDF4', color: '#1A6B3C', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>PAGO</span>}
                  </div>
                  <p style={{ fontWeight: 600, color: '#10233F', fontSize: 15, marginBottom: 4 }}>{item.filename}</p>
                  <p style={{ color: '#7E8FA5', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                {item.impact_brl > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: '#7E8FA5', marginBottom: 2 }}>Impacto estimado</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#8B1A1A', fontFamily: "'Merriweather', serif" }}>{fmt(item.impact_brl)}</p>
                  </div>
                )}

                <div>
                  {item.analysis_status === 'completed' && !item.paid && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                      Ver resultado
                    </button>
                  )}
                  {item.paid && item.analysis_id && (
                    <button onClick={() => nav('/laudo/' + item.analysis_id)} style={{ background: '#1A6B3C', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                      Ver laudo
                    </button>
                  )}
                  {(item.analysis_status === 'pending' || item.analysis_status === 'processing') && (
                    <button onClick={() => nav('/analise/' + item.contract_id)} style={{ background: '#F3F8FF', color: '#56677B', border: '1px solid #D8E3F2', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
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

