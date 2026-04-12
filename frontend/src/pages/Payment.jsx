import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPayment, getPaymentStatus, confirmMockPayment } from '../lib/api'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', bg: '#F7F5F0',
  cream: '#FAF8F3', border: '#E8E2D9', red: '#C0392B',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

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

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .pix-card { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      <nav style={{ background: G.dark, borderBottom: '1px solid ' + G.goldBorder, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
            Juros Abusivos IA
          </Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={{ color: G.mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            {isGuest ? 'Salvar historico' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '56px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: G.goldPale, border: '1px solid ' + G.goldBorder, borderRadius: 100, padding: '5px 16px', marginBottom: 18 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: G.gold }} />
            <span style={{ color: G.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Pagamento seguro via PIX</span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, color: G.text, marginBottom: 8, letterSpacing: '-0.5px' }}>
            Acesso ao laudo tecnico
          </h1>
          <p style={{ color: G.muted, fontSize: 15, lineHeight: 1.6 }}>Liberacao automatica apos confirmacao do pagamento</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid ' + G.red, borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14, fontFamily: sans }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ background: G.dark, border: '1px solid ' + G.goldBorder, borderRadius: 20, padding: '60px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '3px solid ' + G.goldBorder, borderTop: '3px solid ' + G.gold, borderRadius: '50%', margin: '0 auto 18px', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: G.mutedDark, fontFamily: sans, fontSize: 15 }}>Gerando QR Code PIX...</p>
          </div>
        )}

        {hasPayment && (
          <div className="pix-card" style={{ background: G.dark, border: '1px solid ' + G.goldBorder, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, ' + G.gold + ', ' + G.goldLight + ', ' + G.gold + ')' }} />

            <div style={{ padding: '36px 36px 0' }}>
              <div style={{ textAlign: 'center', paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
                <p style={{ color: G.mutedDark, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Laudo Tecnico Completo</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6 }}>
                  <span style={{ color: G.gold, fontSize: 20, fontWeight: 700, marginTop: 14, fontFamily: sans }}>R$</span>
                  <span style={{ fontFamily: serif, fontSize: 68, fontWeight: 700, color: G.white, lineHeight: 1, letterSpacing: '-2px' }}>
                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(payment.amount_brl || 9.99)}
                  </span>
                </div>
                <p style={{ color: G.muted, fontSize: 13, marginTop: 8 }}>Pagamento unico — sem assinatura</p>
              </div>
            </div>

            {payment.qr_code_base64 && (
              <div style={{ textAlign: 'center', padding: '0 36px 24px' }}>
                <div style={{ display: 'inline-block', background: G.white, borderRadius: 16, padding: 16, boxShadow: '0 0 0 4px ' + G.goldBorder }}>
                  <img
                    src={'data:image/png;base64,' + payment.qr_code_base64}
                    alt="QR Code PIX"
                    style={{ width: 180, height: 180, display: 'block' }}
                  />
                </div>
                <p style={{ color: G.muted, fontSize: 12, marginTop: 12 }}>Escaneie com o app do seu banco</p>
              </div>
            )}

            {payment.qr_code && (
              <div style={{ padding: '0 36px 24px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: G.mutedDark, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>PIX copia e cola</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: G.darkMid, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {payment.qr_code}
                  </div>
                  <button onClick={copyCode} style={{ background: copied ? '#15803D' : G.gold, color: copied ? G.white : G.dark, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: sans, transition: 'all 0.2s' }}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ margin: '0 36px 28px', background: 'rgba(201,168,76,0.08)', border: '1px solid ' + G.goldBorder, borderRadius: 12, padding: '13px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.gold, animation: 'pulse 2s ease infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: G.goldLight, margin: 0, fontFamily: sans }}>Aguardando confirmacao de pagamento...</p>
            </div>

            {MOCK_MODE && (
              <div style={{ padding: '0 36px 36px' }}>
                <button
                  onClick={mockConfirm}
                  disabled={confirming}
                  style={{ width: '100%', background: confirming ? G.muted : '#15803D', color: G.white, border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: sans }}
                >
                  {confirming ? 'Confirmando...' : 'Simular pagamento (modo teste)'}
                </button>
              </div>
            )}
          </div>
        )}

        {isGuest && (
          <div style={{ marginTop: 20, background: G.cream, border: '1px solid ' + G.border, borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ color: G.muted, fontSize: 13, margin: 0, fontFamily: sans }}>Quer salvar este laudo? Crie uma conta gratuita.</p>
            <Link to="/cadastro" style={{ color: G.gold, fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: sans }}>Criar conta</Link>
          </div>
        )}

      </main>
    </div>
  )
}
