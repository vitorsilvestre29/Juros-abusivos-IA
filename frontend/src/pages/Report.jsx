import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

function Severity({ val }) {
  const map = {
    alta: { bg: '#FEF2F2', color: '#7F1D1D', label: 'ALTA' },
    media: { bg: '#FFFBEB', color: '#78350F', label: 'MEDIA' },
    baixa: { bg: '#F0FDF4', color: '#14532D', label: 'BAIXA' },
  }
  const s = map[val] || { bg: '#F3F4F6', color: '#374151', label: val }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase', fontFamily: sans }}>
      {s.label}
    </span>
  )
}

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Report() {
  const { analysisId } = useParams()
  const rawUser = localStorage.getItem('user')
  const currentUser = rawUser ? JSON.parse(rawUser) : null
  const isGuest = currentUser ? currentUser.is_guest === true : true
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingAfterPayment, setProcessingAfterPayment] = useState(false)
  const [dots, setDots] = useState('.')
  const retryRef = useRef(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    async function loadReport() {
      try {
        const r = await getFullReport(analysisId)
        setReport(r.data)
        setProcessingAfterPayment(false)
        setError('')
        setLoading(false)
        if (retryRef.current) {
          clearTimeout(retryRef.current)
          retryRef.current = null
        }
        retryCountRef.current = 0
      } catch (err) {
        const status = err.response?.status
        if (status === 425) {
          setProcessingAfterPayment(true)
          setLoading(true)
          setError('')
          const nextDelay = Math.min(30000, 4000 * Math.max(1, retryCountRef.current + 1))
          if (retryRef.current) clearTimeout(retryRef.current)
          retryRef.current = setTimeout(loadReport, nextDelay)
          retryCountRef.current += 1
          return
        }
        if (status === 422) {
          setError(err.response?.data?.detail || 'Falha ao gerar o laudo completo.')
        } else {
          setError(status === 402 ? 'Pagamento necessario para acessar o laudo.' : 'Erro ao carregar laudo.')
        }
        setLoading(false)
      }
    }

    loadReport()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [analysisId])

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '.' : d + '.')), 600)
    return () => clearInterval(t)
  }, [loading])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontFamily: sans, padding: '24px' }}>
      <div style={{ background: white, borderRadius: 20, border: '1px solid ' + border, padding: '40px 28px', textAlign: 'center', boxShadow: '0 4px 16px rgba(13,33,55,0.06)', width: '100%', maxWidth: 700 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{processingAfterPayment ? '⏳' : '📄'}</div>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: N, marginBottom: 10 }}>
          {processingAfterPayment ? `Pagamento confirmado. Finalizando seu laudo${dots}` : `Carregando laudo${dots}`}
        </h2>
        <p style={{ color: muted, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {processingAfterPayment
            ? 'Estamos gerando o laudo completo com todos os detalhes tecnicos para liberacao na tela e no PDF.'
            : 'Estamos preparando os dados do seu laudo tecnico.'}
        </p>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '18px 20px', textAlign: 'left' }}>
          {(processingAfterPayment
            ? [
                { label: 'Pagamento confirmado', done: true },
                { label: 'Consolidando resultado da analise', done: true },
                { label: 'Montando laudo completo', done: false },
                { label: 'Liberando visualizacao e PDF', done: false },
              ]
            : [
                { label: 'Verificando acesso ao laudo', done: true },
                { label: 'Carregando dados da analise', done: false },
              ]
          ).map(step => (
            <p key={step.label} style={{ color: step.done ? '#1E40AF' : '#93C5FD', fontSize: 14, marginBottom: 8, opacity: step.done ? 1 : 0.55 }}>
              {step.done ? '✓' : '⌛'} {step.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2 style={{ fontFamily: serif, color: N, marginBottom: 8 }}>Acesso restrito</h2>
        <p style={{ color: muted, marginBottom: 24 }}>{error}</p>
        <Link to="/app" style={{ background: N, color: white, textDecoration: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontFamily: sans }}>
          Voltar para analises
        </Link>
      </div>
    </div>
  )

  const irregularidades = report.irregularidades || []
  const hasIrregularities = irregularidades.length > 0
  const waText = hasIrregularities
    ? ('Ola Recebi meu laudo tecnico (analise n. ' + analysisId + ') e gostaria de saber mais sobre a acao revisional.')
    : ('Ola Recebi meu laudo tecnico (analise n. ' + analysisId + ') e gostaria de agendar uma consulta preventiva sobre meu contrato.')
  const waUrl = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(waText)

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>LaudoJuros</Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={getReportDownloadUrl(analysisId)} target="_blank" rel="noreferrer"
              style={{ background: O, color: N, textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, fontFamily: sans }}>
              Baixar PDF
            </a>
            <Link to={isGuest ? '/cadastro' : '/app'} style={{ background: 'transparent', border: '1px solid #3B4D63', color: '#7E9BB5', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>
              {isGuest ? 'Criar conta para salvar' : 'Minhas analises'}
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ background: N, borderRadius: 20, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(13,33,55,0.18)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(232,146,10,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Laudo Tecnico de Analise</p>
              <h1 style={{ fontFamily: serif, color: white, fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                {report.banco_credor || 'Instituicao Financeira'}
              </h1>
              <p style={{ color: '#5E7085', fontSize: 14 }}>{report.tipo_contrato}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#5E7085', fontSize: 12, marginBottom: 4 }}>Analise n.</p>
              <p style={{ color: O, fontSize: 20, fontWeight: 700, fontFamily: serif }}>#{analysisId}</p>
            </div>
          </div>
        </div>

        {report.impact_brl > 0 && (
          <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '28px', marginBottom: 28 }}>
            <p style={{ color: '#7F1D1D', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Cobranca excessiva estimada</p>
            <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 800, color: '#8B1A1A' }}>{fmt(report.impact_brl)}</p>
          </div>
        )}

        {irregularidades.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: serif, fontSize: 24, color: N, marginBottom: 20, fontWeight: 700 }}>Irregularidades encontradas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {irregularidades.map((irr, i) => (
                <div key={i} style={{ background: white, border: '1px solid ' + border, borderRadius: 14, padding: '22px 24px', borderLeft: '4px solid ' + (irr.gravidade === 'alta' ? '#DC2626' : irr.gravidade === 'media' ? '#D97706' : '#16A34A') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, color: N, fontSize: 15, flex: 1, margin: 0 }}>{irr.tipo}</h3>
                    <Severity val={irr.gravidade} />
                    {irr.valor_estimado > 0 && <span style={{ color: '#8B1A1A', fontWeight: 700, fontSize: 14 }}>{fmt(irr.valor_estimado)}</span>}
                  </div>
                  <p style={{ color: muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{irr.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.resumo_tecnico && (
          <div style={{ background: white, border: '1px solid ' + border, borderRadius: 16, padding: '28px', marginBottom: 28 }}>
            <h2 style={{ fontFamily: serif, fontSize: 20, color: N, marginBottom: 12, fontWeight: 700 }}>Resumo tecnico</h2>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.8, margin: 0 }}>{report.resumo_tecnico}</p>
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, ' + N + ', #163552)', borderRadius: 20, padding: '36px', textAlign: 'center' }}>
          <p style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Proximo passo</p>
          <h3 style={{ fontFamily: serif, color: white, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Fale com um advogado especializado</h3>
          <p style={{ color: '#7E91A6', fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            {hasIrregularities
              ? 'Este laudo identificou irregularidades no seu contrato. Um advogado especialista pode avaliar a viabilidade de uma acao revisional para reduzir os juros e recuperar valores cobrados indevidamente.'
              : 'Seu laudo nao apontou irregularidades relevantes, mas um advogado parceiro pode revisar seu caso com profundidade e orientar medidas preventivas para proteger seus direitos.'}
          </p>
          <a href={waUrl} target="_blank" rel="noreferrer"
            style={{ background: '#25D366', color: white, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, display: 'inline-block', fontFamily: sans }}>
            Falar no WhatsApp
          </a>
        </div>
      </main>
    </div>
  )
}
