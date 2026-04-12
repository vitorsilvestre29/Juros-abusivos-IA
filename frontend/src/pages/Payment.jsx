import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPayment, getPaymentStatus, confirmMockPayment } from '../lib/api'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const red = '#C0392B'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

export default function Payment() {
  const { analysisId } = useParams()
  const nav = useNavigate()
  const rawUser = localStorage.getItem('user')
  const currentUser = rawUser ? JSON.parse(rawUser) : null
  const isGuest = currentUser ? currentUser.is_guest === true : true
  const [payment, setPayment] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createPayment(analysisId)
      .then(r => { setPayment(r.data); setLoading(false) })
      .catch(() => { setError('Erro ao gerar pagamento.'); setLoading(false) })
  }, [analysisId])

  useEffect(() => {
    if (payment === null) return
    const interval = setInterval(async () => {
      try {
        const r = await getPaymentStatus(payment.payment_id)
        if (r.data.status === 'paid') { clearInterval(interval); nav('/laudo/' + analysisId, { replace: true }) }
      } catch (e) {}
    }, 4000)
    return () => clearInterval(interval)
  }, [payment])

  function copyCode() {
    if (payment && payment.qr_code) {
      navigator.clipboard.writeText(payment.qr_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  async function mockConfirm() {
    setConfirming(true)
    try {
      await confirmMockPayment(payment.payment_id)
      nav('/laudo/' + analysisId, { replace: true })
    } catch (e) {
      setError('Erro ao confirmar pagamento mock.')
    } finally {
      setConfirming(false)
    }
  }

  const hasPayment = payment && (loading === false)
  const navLinkStyle = { color: '#7E9BB5', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>Juros Abusivos</Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={navLinkStyle}>
            {isGuest ? 'Salvar meu historico' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 540, margin: '0 auto', padding: '52px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-block', background: OL, border: '1px solid rgba(232,146,10,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 16 }}>
            <span style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Pagamento seguro</span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: N, marginBottom: 8 }}>Pagamento via PIX</h1>
          <p style={{ color: muted, fontSize: 15 }}>Acesso imediato apos confirmacao</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ background: white, border: '1px solid ' + border, borderRadius: 24, padding: '60px', textAlign: 'center', color: '#94A3B8', boxShadow: '0 4px 24px rgba(13,33,55,0.06)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <p>Gerando QR Code PIX...</p>
          </div>
        )}

        {hasPayment && (
          <div style={{ background: white, border: '1px solid ' + border, borderRadius: 24, padding: '36px', boxShadow: '0 4px 24px rgba(13,33,55,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, ' + O + ', #F5B942)' }} />

            <div style={{ textAlign: 'center', padding: '20px 0 28px', borderBottom: '1px solid ' + border, marginBottom: 28 }}>
              <p style={{ color: muted, fontSize: 13, marginBottom: 6 }}>Laudo Tecnico Completo</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4 }}>
                <span style={{ color: muted, fontSize: 18, marginTop: 10, fontWeight: 600 }}>R$</span>
                <span style={{ fontFamily: serif, fontSize: 60, fontWeight: 800, color: N, lineHeight: 1 }}>
                  {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(payment.amount_brl || 9.99)}
                </span>
              </div>
            </div>

            {payment.qr_code_base64 && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ display: 'inline-block', background: white, border: '1px solid ' + border, borderRadius: 16, padding: 12, boxShadow: '0 2px 12px rgba(13,33,55,0.08)' }}>
                  <img src={'data:image/png;base64,' + payment.qr_code_base64} alt="QR Code PIX" style={{ width: 180, height: 180, display: 'block' }} />
                </div>
                <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 10 }}>Escaneie com o aplicativo do seu banco</p>
              </div>
            )}

            {payment.qr_code && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>PIX copia e cola</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: bg, border: '1px solid ' + border, borderRadius: 10, padding: '11px 14px', fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {payment.qr_code}
                  </div>
                  <button onClick={copyCode} style={{ background: copied ? '#15803D' : N, color: white, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: sans, transition: 'background 0.2s' }}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#1E40AF', marginBottom: 20 }}>
              Apos o pagamento, o laudo sera liberado automaticamente em segundos.
            </div>

            {MOCK_MODE && (
              <button onClick={mockConfirm} disabled={confirming}
                style={{ width: '100%', background: confirming ? '#94A3B8' : '#15803D', color: white, border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: sans }}>
                {confirming ? 'Confirmando...' : 'Simular pagamento (modo teste)'}
              </button>
            )}
          </div>
        )}

        {isGuest && (
          <div style={{ marginTop: 20, background: white, border: '1px solid ' + border, borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ color: muted, fontSize: 13, margin: 0 }}>Quer salvar este laudo? Crie uma conta gratuita.</p>
            <Link to="/cadastro" style={{ color: O, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Criar conta</Link>
          </div>
        )}
      </main>
    </div>
  )
}
