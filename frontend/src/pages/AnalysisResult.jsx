import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'
const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'


function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

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
      } catch (e) { clearInterval(interval) }
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

  if (status === null) return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#94A3B8' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ fontFamily: "'Merriweather', serif", fontSize: 18, color: '#10233F' }}>Carregando...</p>
      </div>
    </div>
  )

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed = status.status === 'failed'
  const isDone = status.status === 'completed'
  const hasIssues = status.has_issues === true
  const navLinkStyle = { color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={navLinkStyle}>
            {isGuest ? 'Salvar meu historico' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '52px 24px' }}>

        {isProcessing && (
          <div style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2EBF8', padding: '56px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(12,26,46,0.07)' }}>
            <div style={{ width: 80, height: 80, background: '#FFF4E5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>🔍</div>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>
              Analisando seu contrato{dots}
            </h2>
            <p style={{ color: '#56677B', fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
              Nosso sistema esta analisando o contrato e verificando as normas do Banco Central. Aguarde.
            </p>
            <div style={{ background: '#F0F4FB', borderRadius: 16, padding: '20px 24px', textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
              {[
                { label: 'Extracao do texto do contrato', done: true },
                { label: 'Consulta as taxas do Banco Central (BCB)', done: true },
                { label: 'Identificando irregularidades...', done: false },
                { label: 'Calculando impacto financeiro...', done: false, faded: true },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 3 ? 12 : 0, opacity: s.faded ? 0.35 : 1 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.done ? '#FF9F1C' : '#E2EBF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: s.done ? '#10233F' : '#94A3B8' }}>
                    {s.done ? '✓' : '⏳'}
                  </div>
                  <span style={{ color: s.done ? '#10233F' : '#94A3B8', fontSize: 14, fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isFailed && (
          <div style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #FECACA', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(12,26,46,0.07)' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 24, fontWeight: 700, color: '#B91C1C', marginBottom: 10 }}>Nao foi possivel analisar</h2>
            <p style={{ color: '#56677B', fontSize: 15, marginBottom: 28 }}>{status.error || 'Verifique se o arquivo esta legivel e tente novamente.'}</p>
            <button onClick={() => nav('/upload')} style={{ background: '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
              Tentar novamente
            </button>
          </div>
        )}

        {isDone && status.paid === false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* banner resultado */}
            {hasIssues ? (
              <div style={{ background: 'linear-gradient(135deg, #7F1D1D, #B91C1C)', borderRadius: 20, padding: '32px 36px', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(185,28,28,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⚠️</div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Resultado da analise</p>
                    <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 800, margin: 0 }}>Irregularidades identificadas</h1>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                  Nossa analise identificou <strong style={{ color: '#FFFFFF' }}>irregularidades no seu contrato</strong> de {status.loan_type_label}.
                  Acesse o laudo para saber quais sao, o impacto financeiro e como agir.
                </p>
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #14532D, #15803D)', borderRadius: 20, padding: '32px 36px', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(21,128,61,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📋</div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Resultado da analise</p>
                    <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 800, margin: 0 }}>Analise concluida</h1>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                  Finalizamos a analise do seu contrato de {status.loan_type_label}.
                  Acesse o laudo tecnico para ver o resultado completo com a confirmacao tecnica por escrito.
                </p>
              </div>
            )}

            {/* paywall card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 24, padding: '36px', boxShadow: '0 4px 24px rgba(12,26,46,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #FF9F1C, #F5B942)' }} />

              <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 22, fontWeight: 700, color: '#10233F', marginBottom: 6 }}>
                {hasIssues ? 'Veja o que encontramos no seu contrato' : 'Obtenha o Laudo Tecnico Completo'}
              </h2>
              <p style={{ color: '#56677B', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
                {hasIssues
                  ? 'O laudo detalha cada irregularidade com fundamento legal, calculo do valor cobrado a mais e orientacoes para acao revisional.'
                  : 'O laudo e um documento tecnico que comprova a situacao do seu contrato perante as normas do BCB.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {(hasIssues ? [
                  'Irregularidades com fundamento legal',
                  'Calculo do valor cobrado a mais',
                  'Comparacao com taxas do BCB',
                  'PDF pronto para o advogado',
                  'Orientacao para acao revisional',
                  'Acesso imediato apos pagamento',
                ] : [
                  'Resultado completo e detalhado',
                  'Confirmacao tecnica das clausulas',
                  'Comparacao com taxas do BCB',
                  'Documento PDF com validade tecnica',
                  'Parecer sobre conformidade BCB',
                  'Acesso imediato apos pagamento',
                ]).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 20, height: 20, background: '#FFF4E5', border: '1.5px solid #FF9F1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700 }}>✓</span>
                    </div>
                    <span style={{ color: '#374151', fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#FFF9F0', border: '1px solid rgba(255,159,28,0.25)', borderLeft: '4px solid #FF9F1C', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
                <p style={{ color: '#8A4C00', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
                  <strong>Nota legal:</strong> Este laudo e uma analise tecnica e matematica, nao assessoria juridica. Para acao revisional, consulte um advogado.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F4FB', borderRadius: 14, padding: '18px 20px', marginBottom: 20, border: '1px solid #E2EBF8' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#10233F', marginBottom: 2 }}>Laudo Tecnico Completo</p>
                  <p style={{ fontSize: 13, color: '#94A3B8' }}>Pagamento unico — Acesso imediato via PIX</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Merriweather', serif", fontSize: 36, fontWeight: 800, color: '#10233F' }}>{fmt(pricing.price_brl)}</p>
                </div>
              </div>

              <button
                onClick={() => nav('/pagamento/' + status.analysis_id)}
                style={{ width: '100%', background: '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700, padding: '16px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: '0 4px 16px rgba(12,26,46,0.2)' }}
              >
                {hasIssues ? 'Ver irregularidades — Pagar com PIX' : 'Acessar laudo — Pagar com PIX'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 14 }}>
                Pagamento seguro via PIX — Acesso imediato apos confirmacao
              </p>


              {/* Botao WhatsApp advogado */}
              <div style={{ marginTop: 16, background: 'linear-gradient(135deg, #075E54, #128C7E)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Fale com um advogado especializado</p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Tire suas duvidas antes de pagar pelo laudo</p>
                </div>
                <a
                  href={'https://wa.me/' + WHATSAPP + '?text=Ola%2C%20fiz%20uma%20analise%20de%20contrato%20e%20gostaria%20de%20saber%20mais%20sobre%20meus%20direitos.'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#25D366', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 10, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  Falar no WhatsApp
                </a>
              </div>

              {isGuest && (
                <div style={{ marginTop: 20, borderTop: '1px solid #E2EBF8', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ color: '#56677B', fontSize: 13 }}>Quer salvar este resultado? Crie uma conta gratuita.</p>
                  <Link to="/cadastro" style={{ color: '#FF9F1C', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Criar conta</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
