import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

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

  useEffect(() => {
    getPricing().then(r => setPricing(r.data)).catch(() => {})
  }, [])

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
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans }}>
      <p style={{ color: muted }}>Carregando...</p>
    </div>
  )

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed = status.status === 'failed'
  const isDone = status.status === 'completed'
  const hasIssues = status.has_issues === true

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <header style={{ background: white, borderBottom: '1px solid ' + border, boxShadow: '0 1px 4px rgba(13,33,55,0.06)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 18, fontWeight: 700, textDecoration: 'none' }}>Juros Abusivos</Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={{ color: muted, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            {isGuest ? 'Criar conta para salvar' : 'Minhas analises'}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {isProcessing && (
          <div style={{ background: white, borderRadius: 20, border: '1px solid ' + border, padding: '48px 32px', textAlign: 'center', boxShadow: '0 4px 16px rgba(13,33,55,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: N, marginBottom: 10 }}>Analisando seu contrato{dots}</h2>
            <p style={{ color: muted, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Nosso sistema esta verificando o contrato e consultando as normas do Banco Central. Aguarde.
            </p>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '18px 20px', textAlign: 'left' }}>
              {[
                { label: 'Extracao do texto do contrato', done: true },
                { label: 'Consulta as taxas do Banco Central (BCB)', done: true },
                { label: 'Identificando irregularidades...', done: false },
                { label: 'Calculando impacto financeiro...', done: false },
              ].map((step, i) => (
                <p key={i} style={{ color: step.done ? '#1E40AF' : '#93C5FD', fontSize: 14, marginBottom: i < 3 ? 8 : 0, opacity: step.done ? 1 : 0.5 }}>
                  {step.done ? '✓' : '⏳'} {step.label}
                </p>
              ))}
            </div>
          </div>
        )}

        {isFailed && (
          <div style={{ background: white, borderRadius: 20, border: '1px solid #FECACA', padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 16px rgba(13,33,55,0.06)' }}>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: '#B91C1C', marginBottom: 10 }}>Nao foi possivel analisar</h2>
            <p style={{ color: muted, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{status.error || 'Verifique se o arquivo esta legivel e tente novamente.'}</p>
            <button onClick={() => nav('/upload')} style={{ background: N, color: white, border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: sans }}>
              Tentar novamente
            </button>
          </div>
        )}

        {isDone && status.paid === false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {hasIssues ? (
              <div style={{ background: '#DC2626', borderRadius: 20, padding: '28px', textAlign: 'center', boxShadow: '0 4px 16px rgba(185,28,28,0.25)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: white, marginBottom: 10 }}>Irregularidades identificadas</h1>
                <p style={{ color: '#FCA5A5', fontSize: 14, lineHeight: 1.6 }}>
                  Nossa analise identificou <strong style={{ color: white }}>irregularidades no seu contrato</strong> de {status.loan_type_label}.
                  Acesse o laudo para saber quais sao, o impacto financeiro e como agir.
                </p>
              </div>
            ) : (
              <div style={{ background: '#15803D', borderRadius: 20, padding: '28px', textAlign: 'center', boxShadow: '0 4px 16px rgba(21,128,61,0.25)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: white, marginBottom: 10 }}>Analise concluida</h1>
                <p style={{ color: '#86EFAC', fontSize: 14, lineHeight: 1.6 }}>
                  Finalizamos a analise do seu contrato de {status.loan_type_label}.
                  Acesse o laudo tecnico para ver o resultado completo.
                </p>
              </div>
            )}

            <div style={{ background: white, borderRadius: 20, border: '1px solid ' + border, padding: '28px', boxShadow: '0 4px 16px rgba(13,33,55,0.06)' }}>
              <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: N, marginBottom: 8 }}>
                {hasIssues ? 'Veja o que encontramos no seu contrato' : 'Obtenha o Laudo Tecnico Completo'}
              </h2>
              <p style={{ color: muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                {hasIssues
                  ? 'O laudo detalha cada irregularidade com fundamento legal, calculo do valor cobrado a mais e orientacoes para acao revisional.'
                  : 'O laudo e um documento tecnico que comprova a situacao do seu contrato perante as normas do BCB.'}
              </p>

              <div style={{ marginBottom: 20 }}>
                {(hasIssues ? [
                  'Irregularidades detalhadas com fundamento legal',
                  'Calculo preciso do valor cobrado a mais',
                  'Comparacao com taxas medias do Banco Central',
                  'PDF pronto para o advogado',
                  'Orientacao para acao revisional',
                ] : [
                  'Resultado completo e detalhado da analise',
                  'Confirmacao tecnica das clausulas do contrato',
                  'Comparacao com taxas medias do Banco Central',
                  'Documento PDF com validade tecnica',
                  'Parecer sobre conformidade com normas BCB',
                ]).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#15803D', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ color: muted, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#FFF4E5', border: '1px solid #F5E8C8', borderLeft: '4px solid ' + O, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ color: '#8A4C00', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
                  <strong>Aviso legal:</strong> Os laudos sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, border: '1px solid ' + border, borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, color: N, fontSize: 14, margin: 0, marginBottom: 2 }}>Laudo Tecnico Completo</p>
                  <p style={{ color: muted, fontSize: 12, margin: 0 }}>Pagamento unico — Acesso imediato</p>
                </div>
                <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 800, color: N }}>{fmt(pricing.price_brl)}</span>
              </div>

              <button onClick={() => nav('/pagamento/' + status.analysis_id)}
                style={{ width: '100%', background: N, color: white, border: 'none', fontWeight: 700, padding: '15px', borderRadius: 12, fontSize: 16, cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 16px rgba(13,33,55,0.2)' }}>
                {hasIssues ? 'Ver irregularidades e pagar com PIX' : 'Acessar laudo e pagar com PIX'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 12 }}>
                Pagamento seguro via PIX — Acesso imediato apos confirmacao
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
