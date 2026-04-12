import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', bg: '#F7F5F0',
  cream: '#FAF8F3', border: '#E8E2D9', red: '#C0392B',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

function Severity({ val }) {
  const map = {
    alta:  { bg: 'rgba(192,57,43,0.12)',  color: '#E57373', border: 'rgba(192,57,43,0.3)',  label: 'ALTA' },
    media: { bg: 'rgba(217,119,6,0.12)',  color: '#FBB040', border: 'rgba(217,119,6,0.3)',  label: 'MEDIA' },
    baixa: { bg: 'rgba(21,128,61,0.12)',  color: '#4CAF50', border: 'rgba(21,128,61,0.3)',  label: 'BAIXA' },
  }
  const s = map[val] || { bg: 'rgba(156,163,175,0.15)', color: G.mutedDark, border: 'rgba(156,163,175,0.3)', label: val }
  return (
    <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: sans }}>
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

  useEffect(() => {
    getFullReport(analysisId)
      .then(r => { setReport(r.data); setLoading(false) })
      .catch(err => {
        setError(err.response?.status === 402 ? 'Pagamento necessario para acessar o laudo.' : 'Erro ao carregar laudo.')
        setLoading(false)
      })
  }, [analysisId])

  const waMsg = 'Ola%20Recebi%20meu%20laudo%20tecnico%20(analise%20n%C2%BA%20' + analysisId + ')%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20acao%20revisional.'
  const waUrl = 'https://wa.me/' + WHATSAPP + '?text=' + waMsg

  if (loading) return (
    <div style={{ minHeight: '100vh', background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid ' + G.gold, borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontFamily: serif, fontSize: 20, color: G.text }}>Carregando laudo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ width: 80, height: 80, background: G.dark, border: '1px solid ' + G.goldBorder, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>🔒</div>
        <h2 style={{ fontFamily: serif, color: G.text, fontSize: 28, marginBottom: 12 }}>Acesso restrito</h2>
        <p style={{ color: G.muted, marginBottom: 32, lineHeight: 1.7, fontSize: 15 }}>{error}</p>
        <Link to="/app" style={{ background: G.dark, color: G.white, textDecoration: 'none', padding: '13px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: sans }}>
          Voltar para analises
        </Link>
      </div>
    </div>
  )

  const irregularidades = report.irregularidades || []
  const borderColor = { alta: G.red, media: '#D97706', baixa: '#16A34A' }

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      <nav style={{ background: G.dark, borderBottom: '1px solid ' + G.goldBorder, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
            Juros Abusivos IA
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href={getReportDownloadUrl(analysisId)} target="_blank" rel="noreferrer"
              style={{ background: G.gold, color: G.dark, textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 8, fontFamily: sans }}>
              Baixar PDF
            </a>
            <Link to={isGuest ? '/cadastro' : '/app'} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: G.mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>
              {isGuest ? 'Salvar historico' : 'Minhas analises'}
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '52px 24px' }}>

        {/* Cabecalho do laudo */}
        <div style={{ background: G.dark, border: '1px solid ' + G.goldBorder, borderRadius: 20, overflow: 'hidden', marginBottom: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, ' + G.gold + ', ' + G.goldLight + ', ' + G.gold + ')' }} />
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
              <div>
                <p style={{ color: G.gold, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Laudo Tecnico de Analise</p>
                <h1 style={{ fontFamily: serif, color: G.white, fontSize: 32, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.5px' }}>
                  {report.banco_credor || 'Instituicao Financeira'}
                </h1>
                <p style={{ color: G.muted, fontSize: 15 }}>{report.tipo_contrato}</p>
              </div>
              <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid ' + G.goldBorder, borderRadius: 14, padding: '14px 20px', textAlign: 'center' }}>
                <p style={{ color: G.gold, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Analise n.</p>
                <p style={{ color: G.gold, fontSize: 24, fontWeight: 800, fontFamily: serif }}>#{analysisId}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Valor contratado', val: fmt(report.valor_contratado) },
                { label: 'Taxa contratada', val: (report.taxa_mensal_contratada || '--') + '% a.m.' },
                { label: 'Taxa media BCB', val: (report.bcb_rate_pct ? report.bcb_rate_pct.toFixed(2) : '--') + '% a.m.' },
                { label: 'Prazo', val: (report.prazo_meses || '--') + ' meses' },
              ].map((d, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ color: G.muted, fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{d.label}</p>
                  <p style={{ color: G.white, fontSize: 18, fontWeight: 700, fontFamily: serif }}>{d.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Impacto financeiro */}
        {report.impact_brl > 0 && (
          <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', borderLeft: '4px solid ' + G.red, borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ color: '#E57373', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Cobranca excessiva estimada</p>
              <p style={{ fontFamily: serif, fontSize: 48, fontWeight: 700, color: G.red, marginBottom: 4, letterSpacing: '-1px' }}>{fmt(report.impact_brl)}</p>
              <p style={{ color: G.muted, fontSize: 13 }}>acima da taxa media do Banco Central para esta modalidade</p>
            </div>
            <div style={{ width: 64, height: 64, background: 'rgba(192,57,43,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚠️</div>
          </div>
        )}

        {/* Irregularidades */}
        {irregularidades.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: serif, fontSize: 26, color: G.text, marginBottom: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
              Irregularidades encontradas
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {irregularidades.map((irr, i) => (
                <div key={i} style={{ background: G.white, border: '1px solid ' + G.border, borderRadius: 14, padding: '22px 24px', borderLeft: '4px solid ' + (borderColor[irr.gravidade] || G.muted), boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, color: G.text, fontSize: 15, flex: 1, margin: 0, fontFamily: sans }}>{irr.tipo}</h3>
                    <Severity val={irr.gravidade} />
                    {irr.valor_estimado > 0 && (
                      <span style={{ color: G.red, fontWeight: 800, fontSize: 15, fontFamily: serif }}>{fmt(irr.valor_estimado)}</span>
                    )}
                  </div>
                  <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{irr.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo tecnico */}
        {report.resumo_tecnico && (
          <div style={{ background: G.white, border: '1px solid ' + G.border, borderRadius: 16, padding: '28px 32px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontFamily: serif, fontSize: 22, color: G.text, marginBottom: 14, fontWeight: 700 }}>Resumo tecnico</h2>
            <p style={{ color: G.text, fontSize: 15, lineHeight: 1.85, margin: 0 }}>{report.resumo_tecnico}</p>
          </div>
        )}

        {/* CTA Advogado */}
        {irregularidades.length > 0 && (
          <div style={{ background: G.dark, border: '1px solid ' + G.goldBorder, borderRadius: 20, overflow: 'hidden', marginBottom: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, ' + G.gold + ', transparent)' }} />
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: G.gold, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Proximo passo</p>
              <h3 style={{ fontFamily: serif, color: G.white, fontSize: 28, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.3px' }}>
                Fale com um advogado especializado
              </h3>
              <p style={{ color: G.mutedDark, fontSize: 15, lineHeight: 1.8, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
                Este laudo identificou irregularidades no seu contrato. Um advogado especialista pode avaliar a viabilidade de uma acao revisional para reduzir os juros e recuperar valores cobrados indevidamente.
              </p>
              <a href={waUrl} target="_blank" rel="noreferrer"
                style={{ background: '#25D366', color: G.white, textDecoration: 'none', fontWeight: 700, fontSize: 16, padding: '15px 36px', borderRadius: 14, display: 'inline-block', boxShadow: '0 8px 24px rgba(37,211,102,0.3)', fontFamily: sans }}>
                Falar no WhatsApp
              </a>
              <p style={{ color: G.muted, fontSize: 13, marginTop: 16 }}>Atendimento especializado em acoes revisionais</p>
            </div>
          </div>
        )}

        {/* salvar historico */}
        {isGuest && (
          <div style={{ background: G.cream, border: '1px solid ' + G.border, borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, color: G.text, fontSize: 15, marginBottom: 3 }}>Quer salvar este laudo?</p>
              <p style={{ color: G.muted, fontSize: 13 }}>Crie uma conta gratuita para acessar seu historico de analises.</p>
            </div>
            <Link to="/cadastro" style={{ background: G.dark, color: G.white, textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '11px 22px', borderRadius: 10, whiteSpace: 'nowrap', fontFamily: sans }}>
              Criar conta gratis
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: G.goldPale, border: '1px solid ' + G.goldBorder, borderLeft: '4px solid ' + G.gold, borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ color: '#7A6030', fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
            <strong>Aviso legal:</strong> Este laudo e de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94). Os valores apresentados sao estimativas baseadas em calculo matematico comparativo.
          </p>
        </div>

      </main>
    </div>
  )
}
