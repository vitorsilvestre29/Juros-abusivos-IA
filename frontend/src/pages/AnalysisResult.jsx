import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', bg: '#F7F5F0',
  cream: '#FAF8F3', border: '#E8E2D9', red: '#C0392B', redPale: '#FEF2F2',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

export default function AnalysisResult() {
  const { contractId } = useParams()
  const nav = useNavigate()
  const rawUser = localStorage.getItem('user')
  const currentUser = rawUser ? JSON.parse(rawUser) : null
  const isGuest = currentUser ? currentUser.is_guest === true : true
  const [status, setStatus] = useState(null)
  const [pricing, setPricing] = useState({ price_brl: 9.99, includes: [] })
  const [dots, setDots] = useState('.')

  useEffect(() => { getPricing().then(r => setPricing(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    let interval
    async function poll() {
      try {
        const res = await getContractStatus(contractId)
        setStatus(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval)
          if (res.data.status === 'completed' && res.data.paid === true) {
            nav('/laudo/' + res.data.analysis_id, { replace: true })
          }
        }
      } catch { clearInterval(interval) }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [contractId])

  useEffect(() => {
    if (status && (status.status === 'processing' || status.status === 'pending')) {
      const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
      return () => clearInterval(t)
    }
  }, [status])

  const navBar = (
    <nav style={{ background: G.dark, borderBottom: `1px solid rgba(201,168,76,0.15)`, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 19, fontWeight: 700, textDecoration: 'none' }}>Juros Abusivos</Link>
        <Link to={isGuest ? '/cadastro' : '/app'} style={{ color: G.mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 14px', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6 }}>
          {isGuest ? 'Salvar historico' : 'Minhas analises'}
        </Link>
      </div>
    </nav>
  )

  if (status === null) return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      {navBar}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${G.goldBorder}`, borderTopColor: G.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ fontFamily: serif, fontSize: 18, color: G.text }}>Carregando...</p>
        </div>
      </div>
    </div>
  )

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed    = status.status === 'failed'
  const isDone      = status.status === 'completed'
  const hasIssues   = status.has_issues === true

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      {navBar}

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* PROCESSING */}
        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '72px 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: G.dark, border: `2px solid ${G.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: G.gold, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 28 }}>🔍</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 28, color: G.text, marginBottom: 12 }}>Analisando seu contrato{dots}</h2>
            <p style={{ color: G.muted, fontSize: 15, marginBottom: 36 }}>
              Consultando taxas do Banco Central e jurisprudencia do STJ em tempo real
            </p>
            <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 12, padding: '24px 28px', maxWidth: 420, margin: '0 auto' }}>
              {['Consultando BCB/SGS ao vivo', 'Verificando jurisprudencia STJ', 'Extraindo clausulas contratuais', 'Calculando impacto financeiro'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${G.border}` : 'none' }}>
                  <div style={{ width: 8, height: 8, background: G.gold, borderRadius: '50%', flexShrink: 0, opacity: 0.6 + i * 0.1 }} />
                  <span style={{ color: G.muted, fontSize: 13 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAILED */}
        {isFailed && (
          <div style={{ background: G.redPale, border: `1px solid #FECACA`, borderLeft: `4px solid ${G.red}`, borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: serif, fontSize: 24, color: '#7F1D1D', marginBottom: 10 }}>Falha na analise</h2>
            <p style={{ color: '#991B1B', fontSize: 14, marginBottom: 24 }}>{status.error || 'Ocorreu um erro ao processar o contrato.'}</p>
            <Link to="/upload" style={{ display: 'inline-block', background: G.red, color: G.white, textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 8 }}>
              Tentar novamente
            </Link>
          </div>
        )}

        {/* DONE */}
        {isDone && (
          <>
            {/* Result header */}
            <div style={{ background: hasIssues ? G.dark : '#052E16', border: `1px solid ${hasIssues ? G.goldBorder : 'rgba(22,163,74,0.3)'}`, borderRadius: 16, padding: '36px 36px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: hasIssues ? `linear-gradient(90deg, ${G.gold}, ${G.goldLight})` : 'linear-gradient(90deg, #16A34A, #4ADE80)' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: hasIssues ? 'rgba(201,168,76,0.15)' : 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, border: `1px solid ${hasIssues ? G.goldBorder : 'rgba(22,163,74,0.3)'}` }}>
                  {hasIssues ? '⚠️' : '✅'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: hasIssues ? G.gold : '#4ADE80', fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                    {hasIssues ? 'Irregularidades detectadas' : 'Sem irregularidades graves'}
                  </p>
                  <h2 style={{ fontFamily: serif, color: G.white, fontSize: 26, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>
                    {hasIssues ? `${status.irregularities_count || ''} irregularidade${(status.irregularities_count || 0) > 1 ? 's' : ''} identificada${(status.irregularities_count || 0) > 1 ? 's' : ''}` : 'Contrato dentro dos parametros'}
                  </h2>
                  {hasIssues && status.impact_brl > 0 && (
                    <p style={{ color: G.mutedDark, fontSize: 14 }}>
                      Impacto estimado: <strong style={{ color: '#FCA5A5', fontSize: 18, fontFamily: serif }}>{fmt(status.impact_brl)}</strong> cobrados a mais
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rate comparison */}
            {status.bcb_rate_pct > 0 && (
              <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 12, padding: '22px 24px', marginBottom: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '12px', background: G.bg, borderRadius: 8 }}>
                  <div style={{ color: G.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Taxa media BCB</div>
                  <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: '#16A34A' }}>{status.bcb_rate_pct?.toFixed(2)}%</div>
                  <div style={{ color: G.muted, fontSize: 11 }}>ao mes</div>
                </div>
                <div style={{ width: 1, background: G.border, alignSelf: 'stretch' }} />
                <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '12px' }}>
                  <div style={{ color: G.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tipo</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.text }}>{status.loan_type_label || status.loan_type}</div>
                </div>
                <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '12px', background: G.bg, borderRadius: 8 }}>
                  <div style={{ color: G.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Arquivo</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: G.text, wordBreak: 'break-all' }}>{status.filename}</div>
                </div>
              </div>
            )}

            {/* PAYWALL */}
            <div style={{ background: G.dark, border: `1px solid ${G.goldBorder}`, borderRadius: 16, padding: '40px 36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${G.gold}, ${G.goldLight}, ${G.gold})` }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

              <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
                <div style={{ display: 'inline-flex', gap: 8, background: 'rgba(201,168,76,0.08)', border: `1px solid ${G.goldBorder}`, borderRadius: 4, padding: '5px 14px', marginBottom: 20 }}>
                  <span style={{ color: G.gold, fontSize: 10, fontWeight: 600, letterSpacing: 2 }}>LAUDO TECNICO COMPLETO</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ color: G.mutedDark, fontSize: 18, marginTop: 10 }}>R$</span>
                  <span style={{ fontFamily: serif, fontSize: 68, fontWeight: 700, color: G.white, lineHeight: 1 }}>
                    {pricing.price_brl?.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p style={{ color: G.mutedDark, fontSize: 13 }}>pagamento unico via PIX &mdash; acesso imediato</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, position: 'relative' }}>
                {['Irregularidades com fundamento legal', 'Calculo do excesso cobrado', 'Taxas comparadas com BCB ao vivo', 'PDF pronto para o advogado', 'Fundamentacao juridica STJ', 'Orientacao para acao revisional'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="8" fill="rgba(201,168,76,0.15)"/>
                      <path d="M5 8l2 2 4-4" stroke={G.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ color: '#D1D5DB', fontSize: 12 }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <a href={'https://wa.me/' + WHATSAPP + '?text=Ola%2C%20fiz%20uma%20analise%20de%20contrato%20e%20gostaria%20de%20saber%20mais%20sobre%20acao%20revisional.'} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 10, padding: '14px', marginBottom: 14, textDecoration: 'none' }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div>
                  <div style={{ color: '#4ADE80', fontSize: 13, fontWeight: 700 }}>Falar com advogado no WhatsApp</div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>Consulta gratuita sobre seu laudo</div>
                </div>
              </a>

              <Link to={'/pagamento/' + status.analysis_id}
                style={{ display: 'block', textAlign: 'center', background: G.gold, color: G.dark, textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '15px', borderRadius: 8, boxShadow: '0 4px 24px rgba(201,168,76,0.25)', letterSpacing: 0.2 }}>
                Acessar laudo completo &mdash; R$ {pricing.price_brl?.toFixed(2).replace('.', ',')}
              </Link>

              {isGuest && (
                <div style={{ marginTop: 20, textAlign: 'center', paddingTop: 20, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                  <p style={{ color: '#4B5563', fontSize: 12, marginBottom: 10 }}>Quer salvar essa analise no seu historico?</p>
                  <Link to="/cadastro" style={{ color: G.gold, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Criar conta gratuita &rarr;
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
