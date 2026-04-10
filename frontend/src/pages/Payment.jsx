import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPayment, getPaymentStatus, confirmMockPayment } from '../lib/api'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

export default function Payment() {
  const { analysisId } = useParams()
  const nav = useNavigate()
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
    if (!payment) return
    const interval = setInterval(async () => {
      try {
        const r = await getPaymentStatus(payment.payment_id)
        if (r.data.status === 'paid') {
          clearInterval(interval)
          nav('/laudo/' + analysisId, { replace: true })
        }
      } catch (e) {}
    }, 4000)
    return () => clearInterval(interval)
  }, [payment])

  function copyCode() {
    if (payment?.pix_code) {
      navigator.clipboard.writeText(payment.pix_code)
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

  return (
    <div style={{ minHeight: '100vh', background: '#F3F8FF' }}>
      <nav style={{ background: '#10233F', borderBottom: '1px solid #1F4E79' }}>
        <div className="mobile-safe" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <Link to="/app" style={{ color: '#5E7085', textDecoration: 'none', fontSize: 14 }}>Minhas analises</Link>
        </div>
      </nav>

      <main className="mobile-safe" style={{ maxWidth: 520, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 32, fontWeight: 700, color: '#10233F', marginBottom: 8 }}>
            Pagamento via PIX
          </h1>
          <p style={{ color: '#56677B', fontSize: 15 }}>Acesso imediato apos confirmacao</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 20, padding: '48px', textAlign: 'center', color: '#7E8FA5' }}>
            Gerando QR Code...
          </div>
        )}

        {payment && !loading && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 20, padding: '36px', boxShadow: '0 4px 24px rgba(12,26,46,0.06)' }}>

            {/* Valor */}
            <div style={{ textAlign: 'center', padding: '20px 0 28px', borderBottom: '1px solid #E4ECF8', marginBottom: 28 }}>
              <p style={{ color: '#56677B', fontSize: 13, marginBottom: 4 }}>Laudo Tecnico Completo</p>
              <p style={{ fontFamily: "'Merriweather', serif", fontSize: 42, fontWeight: 700, color: '#10233F' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount || 20)}
              </p>
            </div>

            {/* QR Code */}
            {payment.qr_code_base64 && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img
                  src={'data:image/png;base64,' + payment.qr_code_base64}
                  alt="QR Code PIX"
                  style={{ width: 200, height: 200, border: '1px solid #D8E3F2', borderRadius: 12, padding: 8 }}
                />
              </div>
            )}

            {/* Codigo copia e cola */}
            {payment.pix_code && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Codigo Pix copia e cola</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#F3F8FF', border: '1px solid #D8E3F2', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#56677B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {payment.pix_code}
                  </div>
                  <button onClick={copyCode} style={{ background: copied ? '#1A6B3C' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Manrope', sans-serif" }}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#0C4A6E', marginBottom: 20 }}>
              Apos o pagamento, o laudo sera liberado automaticamente em alguns segundos.
            </div>

            {MOCK_MODE && (
              <button
                onClick={mockConfirm}
                disabled={confirming}
                style={{ width: '100%', background: '#1A6B3C', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif" }}
              >
                {confirming ? 'Confirmando...' : 'Simular pagamento (modo teste)'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

