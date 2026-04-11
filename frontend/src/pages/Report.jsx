import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

function Severity({ val }) {
  const map = {
    alta: { bg: '#FEF2F2', color: '#7F1D1D', label: 'ALTA' },
    media: { bg: '#FFFBEB', color: '#78350F', label: 'MEDIA' },
    baixa: { bg: '#F0FDF4', color: '#14532D', label: 'BAIXA' },
  }
  const s = map[val] || { bg: '#F3F4F6', color: '#374151', label: val }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase' }}>
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
  const isGuest = !!currentUser?.is_guest
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
    <div style={{ minHeight: '100vh', background: '#F3F8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7E8FA5' }}>
      Carregando laudo...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#F3F8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontSize: 36, marginBottom: 16 }}>🔒</p>
        <h2 style={{ fontFamily: "'Merriweather', serif", color: '#10233F', marginBottom: 8 }}>Acesso restrito</h2>
        <p style={{ color: '#56677B', marginBottom: 24 }}>{error}</p>
        <Link to="/app" style={{ background: '#10233F', color: '#FFF', textDecoration: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700 }}>
          Voltar para analises
        </Link>
      </div>
    </div>
  )

  const irregularidades = report.irregularidades || []

  return (
    <div style={{ minHeight: '100vh', background: '#F3F8FF' }}>
      {/* Header */}
      <nav style={{ background: '#10233F', borderBottom: '1px solid #1F4E79', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={getReportDownloadUrl(analysisId)} target="_blank" rel="noreferrer"
              style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8 }}>
              Baixar PDF
            </a>
            <Link to={isGuest ? '/cadastro' : '/app'} style={{ background: 'transparent', border: '1px solid #3B4D63', color: '#7E91A6', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>
              {isGuest ? 'Criar conta para salvar' : 'Minhas analises'}
            </Link>
          </div>
        </div>
      </nav>

      <main className="mobile-safe" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>

        {/* Cabecalho do laudo */}
        <div style={{ background: '#10233F', borderRadius: 20, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(201,149,42,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Laudo Tecnico de Analise</p>
              <h1 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                {report.banco_credor || 'Instituicao Financeira'}
              </h1>
              <p style={{ color: '#5E7085', fontSize: 14 }}>{report.tipo_contrato}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#5E7085', fontSize: 12, marginBottom: 4 }}>Analise n.</p>
              <p style={{ color: '#FF9F1C', fontSize: 20, fontWeight: 700, fontFamily: "'Merriweather', serif" }}>#{analysisId}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { label: 'Valor contratado', val: fmt(report.valor_contratado) },
              { label: 'Taxa contratada', val: (report.taxa_mensal_contratada || '--') + '% a.m.' },
              { label: 'Taxa media BCB', val: (report.bcb_rate_pct ? report.bcb_rate_pct.toFixed(2) : '--') + '% a.m.' },
              { label: 'Prazo', val: (report.prazo_meses || '--') + ' meses' },
            ].map((d, i) => (
              <div key={i}>
                <p style={{ color: '#5E7085', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.label}</p>
                <p style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700 }}>{d.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Impacto financeiro */}
        {report.impact_brl > 0 && (
          <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ color: '#7F1D1D', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Cobranca excessiva estimada</p>
              <p style={{ fontFamily: "'Merriweather', serif", fontSize: 40, fontWeight: 800, color: '#8B1A1A' }}>{fmt(report.impact_brl)}</p>
              <p style={{ color: '#7E8FA5', fontSize: 12, marginTop: 4 }}>acima da taxa media do Banco Central para esta modalidade</p>
            </div>
            <div style={{ fontSize: 48 }}>⚠️</div>
          </div>
        )}

        {/* Irregularidades */}
        {irregularidades.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 24, color: '#10233F', marginBottom: 20, fontWeight: 700 }}>
              Irregularidades encontradas
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {irregularidades.map((irr, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 14, padding: '22px 24px', borderLeft: '4px solid ' + (irr.gravidade === 'alta' ? '#DC2626' : irr.gravidade === 'media' ? '#D97706' : '#16A34A') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, color: '#10233F', fontSize: 15, flex: 1 }}>{irr.tipo}</h3>
                    <Severity val={irr.gravidade} />
                    {irr.valor_estimado > 0 && (
                      <span style={{ color: '#8B1A1A', fontWeight: 700, fontSize: 14 }}>{fmt(irr.valor_estimado)}</span>
                    )}
                  </div>
                  <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.7 }}>{irr.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo tecnico */}
        {report.resumo_tecnico && (
          <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 16, padding: '28px', marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 20, color: '#10233F', marginBottom: 12, fontWeight: 700 }}>Resumo tecnico</h2>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.8 }}>{report.resumo_tecnico}</p>
          </div>
        )}

        {/* CTA Advogado */}
        {irregularidades.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #10233F, #1F4E79)', borderRadius: 20, padding: '36px', textAlign: 'center' }}>
            <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Proximo passo</p>
            <h3 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              Fale com um advogado especializado
            </h3>
            <p style={{ color: '#7E91A6', fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
              Este laudo identificou irregularidades no seu contrato. Um advogado especialista pode avaliar a viabilidade de uma acao revisional para reduzir os juros e recuperar valores cobrados indevidamente.
            </p>
            <a href={waUrl} target="_blank" rel="noreferrer"
              style={{ background: '#25D366', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, display: 'inline-block' }}>
              Falar no WhatsApp
            </a>
            <p style={{ color: '#475569', fontSize: 12, marginTop: 14 }}>Atendimento especializado em acoes revisionais</p>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: '#FFF4E5', border: '1px solid #F5E8C8', borderRadius: 12, padding: '18px', marginTop: 24 }}>
          <p style={{ color: '#8A4C00', fontSize: 12, lineHeight: 1.7 }}>
            <strong>Aviso legal:</strong> Este laudo e de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94). Os valores apresentados sao estimativas baseadas em calculo matematico comparativo.
          </p>
        </div>

      </main>
    </div>
  )
}

