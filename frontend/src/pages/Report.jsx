import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

function Severity({ val }) {
  const map = {
    alta:  { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'ALTA' },
    media: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'MEDIA' },
    baixa: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'BAIXA' },
  }
  const s = map[val] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', label: val }
  return (
    <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase' }}>
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

  const waMsg = 'Ola%21%20Recebi%20meu%20laudo%20tecnico%20(analise%20n%C2%BA%20' + analysisId + ')%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20acao%20revisional.'
  const waUrl = 'https://wa.me/' + WHATSAPP + '?text=' + waMsg

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#94A3B8' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ fontFamily: "'Merriweather', serif", fontSize: 18, color: '#10233F' }}>Carregando laudo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
        <h2 style={{ fontFamily: "'Merriweather', serif", color: '#10233F', fontSize: 26, marginBottom: 10 }}>Acesso restrito</h2>
        <p style={{ color: '#56677B', marginBottom: 28, lineHeight: 1.7 }}>{error}</p>
        <Link to="/app" style={{ background: '#10233F', color: '#FFF', textDecoration: 'none', padding: '13px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
          Voltar para analises
        </Link>
      </div>
    </div>
  )

  const irregularidades = report.irregularidades || []
  const borderColor = { alta: '#DC2626', media: '#D97706', baixa: '#16A34A' }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href={getReportDownloadUrl(analysisId)} target="_blank" rel="noreferrer"
              style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 8 }}>
              Baixar PDF
            </a>
            <Link to={isGuest ? '/cadastro' : '/app'} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#94A3B8', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>
              {isGuest ? 'Salvar meu historico' : 'Minhas analises'}
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '52px 24px' }}>

        {/* Cabecalho do laudo */}
        <div style={{ background: 'linear-gradient(145deg, #0C1A2E, #10233F)', borderRadius: 24, padding: '44px', marginBottom: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(12,26,46,0.2)' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,159,28,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, background: 'radial-gradient(circle, rgba(255,159,28,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, position: 'relative' }}>
            <div>
              <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Laudo Tecnico de Analise</p>
              <h1 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
                {report.banco_credor || 'Instituicao Financeira'}
              </h1>
              <p style={{ color: '#64748B', fontSize: 15 }}>{report.tipo_contrato}</p>
            </div>
            <div style={{ background: 'rgba(255,159,28,0.1)', border: '1px solid rgba(255,159,28,0.2)', borderRadius: 14, padding: '14px 20px', textAlign: 'center' }}>
              <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Analise n.</p>
              <p style={{ color: '#FF9F1C', fontSize: 22, fontWeight: 800, fontFamily: "'Merriweather', serif" }}>#{analysisId}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
            {[
              { label: 'Valor contratado', val: fmt(report.valor_contratado) },
              { label: 'Taxa contratada', val: (report.taxa_mensal_contratada || '--') + '% a.m.' },
              { label: 'Taxa media BCB', val: (report.bcb_rate_pct ? report.bcb_rate_pct.toFixed(2) : '--') + '% a.m.' },
              { label: 'Prazo', val: (report.prazo_meses || '--') + ' meses' },
            ].map((d, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#64748B', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.label}</p>
                <p style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>{d.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Impacto financeiro */}
        {report.impact_brl > 0 && (
          <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 20, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(185,28,28,0.1)' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ color: '#7F1D1D', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cobranca excessiva estimada</p>
              <p style={{ fontFamily: "'Merriweather', serif", fontSize: 44, fontWeight: 800, color: '#B91C1C', marginBottom: 4 }}>{fmt(report.impact_brl)}</p>
              <p style={{ color: '#94A3B8', fontSize: 13 }}>acima da taxa media do Banco Central para esta modalidade</p>
            </div>
            <div style={{ width: 64, height: 64, background: 'rgba(185,28,28,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>⚠️</div>
          </div>
        )}

        {/* Irregularidades */}
        {irregularidades.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, color: '#10233F', marginBottom: 20, fontWeight: 700 }}>
              Irregularidades encontradas
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {irregularidades.map((irr, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 16, padding: '22px 24px', borderLeft: '4px solid ' + (borderColor[irr.gravidade] || '#94A3B8'), boxShadow: '0 2px 8px rgba(12,26,46,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, color: '#10233F', fontSize: 15, flex: 1, margin: 0 }}>{irr.tipo}</h3>
                    <Severity val={irr.gravidade} />
                    {irr.valor_estimado > 0 && (
                      <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: 15 }}>{fmt(irr.valor_estimado)}</span>
                    )}
                  </div>
                  <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{irr.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo tecnico */}
        {report.resumo_tecnico && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 18, padding: '28px 32px', marginBottom: 24, boxShadow: '0 2px 8px rgba(12,26,46,0.04)' }}>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 22, color: '#10233F', marginBottom: 14, fontWeight: 700 }}>Resumo tecnico</h2>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.85, margin: 0 }}>{report.resumo_tecnico}</p>
          </div>
        )}

        {/* CTA Advogado */}
        {irregularidades.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #0C1A2E, #10233F)', borderRadius: 24, padding: '40px', textAlign: 'center', marginBottom: 24, boxShadow: '0 8px 32px rgba(12,26,46,0.15)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,159,28,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Proximo passo</p>
            <h3 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
              Fale com um advogado especializado
            </h3>
            <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.75, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Este laudo identificou irregularidades no seu contrato. Um advogado especialista pode avaliar a viabilidade de uma acao revisional para reduzir os juros e recuperar valores cobrados indevidamente.
            </p>
            <a href={waUrl} target="_blank" rel="noreferrer"
              style={{ background: '#25D366', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 16, padding: '15px 36px', borderRadius: 14, display: 'inline-block', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
              💬 Falar no WhatsApp
            </a>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 16 }}>Atendimento especializado em acoes revisionais</p>
          </div>
        )}

        {/* salvar historico */}
        {isGuest && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(12,26,46,0.04)' }}>
            <div>
              <p style={{ fontWeight: 700, color: '#10233F', fontSize: 15, marginBottom: 3 }}>Quer salvar este laudo?</p>
              <p style={{ color: '#56677B', fontSize: 13 }}>Crie uma conta gratuita para acessar seu historico de analises.</p>
            </div>
            <Link to="/cadastro" style={{ background: '#10233F', color: '#FFFFFF', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '11px 22px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              Criar conta gratis
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: '#FFF9F0', border: '1px solid rgba(255,159,28,0.2)', borderLeft: '4px solid #FF9F1C', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ color: '#8A4C00', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            <strong>Aviso legal:</strong> Este laudo e de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94). Os valores apresentados sao estimativas baseadas em calculo matematico comparativo.
          </p>
        </div>

      </main>
    </div>
  )
}
