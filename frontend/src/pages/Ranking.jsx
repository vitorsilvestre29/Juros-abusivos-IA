import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

const LOAN_LABELS = {
  credito_pessoal: 'Credito Pessoal',
  consignado: 'Consignado',
  financiamento_veiculo: 'Financiamento de Veiculo',
  financiamento_imovel: 'Financiamento de Imovel',
  cartao_credito: 'Cartao de Credito',
  cheque_especial: 'Cheque Especial',
  capital_giro: 'Capital de Giro',
}

const LOAN_ICONS = {
  credito_pessoal: '💰',
  consignado: '📋',
  financiamento_veiculo: '🚗',
  financiamento_imovel: '🏠',
  cartao_credito: '💳',
  cheque_especial: '🏦',
  capital_giro: '📈',
}

const MEDAL = ['🥇', '🥈', '🥉']

const API_BASE = import.meta.env.VITE_API_URL || 'https://juros-abusivos-api.up.railway.app'

export default function Ranking() {
  const [ranking, setRanking] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rRes, sRes] = await Promise.all([
          fetch(API_BASE + '/api/v1/public/ranking'),
          fetch(API_BASE + '/api/v1/public/stats'),
        ])
        const rData = await rRes.json()
        const sData = await sRes.json()
        setRanking(Array.isArray(rData) ? rData : [])
        setStats(sData)
      } catch {
        setRanking([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const maxTotal = ranking.length > 0 ? ranking[0].total : 1

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      {/* Nav */}
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            LaudoJuros
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/comparador" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Comparador</Link>
            <Link to="/blog" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Blog</Link>
            <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '8px 18px', borderRadius: 8 }}>
              Analisar contrato
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: '#FFF4E5', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Dados em tempo real</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, fontWeight: 700, color: '#10233F', marginBottom: 14 }}>
            Ranking de Contratos Abusivos
          </h1>
          <p style={{ color: '#56677B', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
            Veja quais tipos de contrato concentram mais irregularidades detectadas pelo nosso sistema
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
            {[
              { label: 'Contratos analisados', value: stats.total_analyses || 0, suffix: '' },
              { label: 'Com irregularidades', value: stats.with_issues || 0, suffix: '' },
              { label: 'Impacto total detectado', value: stats.total_impact_brl ? 'R$ ' + Number(stats.total_impact_brl).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'R$ 0', suffix: '' },
            ].map(s => (
              <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(12,26,46,0.05)' }}>
                <div style={{ fontFamily: "'Merriweather', serif", fontSize: 28, fontWeight: 700, color: '#10233F', marginBottom: 6 }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString('pt-BR') : s.value}
                </div>
                <div style={{ color: '#56677B', fontSize: 13 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Ranking list */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(12,26,46,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg, #10233F, #1E3A5F)', padding: '24px 32px' }}>
            <h2 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 20, fontWeight: 700, margin: 0 }}>
              Tipos de contrato com mais irregularidades
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '60px 32px', textAlign: 'center', color: '#56677B', fontSize: 16 }}>
              Carregando dados...
            </div>
          ) : ranking.length === 0 ? (
            <div style={{ padding: '60px 32px', textAlign: 'center', color: '#56677B', fontSize: 16 }}>
              Nenhum dado disponivel ainda. Seja o primeiro a analisar um contrato.
            </div>
          ) : (
            <div>
              {ranking.map((item, idx) => {
                const pct = Math.round((item.total / maxTotal) * 100)
                const label = LOAN_LABELS[item.loan_type] || item.loan_type
                const icon = LOAN_ICONS[item.loan_type] || '📄'
                const medal = MEDAL[idx] || null
                return (
                  <div key={item.loan_type} style={{ padding: '20px 32px', borderBottom: idx < ranking.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Posicao */}
                    <div style={{ fontSize: medal ? 24 : 18, minWidth: 36, textAlign: 'center', color: medal ? 'inherit' : '#94A3B8', fontWeight: 700 }}>
                      {medal || ('#' + (idx + 1))}
                    </div>
                    {/* Icon + label */}
                    <div style={{ fontSize: 28, minWidth: 40, textAlign: 'center' }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#10233F', fontSize: 16, marginBottom: 8 }}>{label}</div>
                      <div style={{ background: '#F1F5F9', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', background: idx === 0 ? '#DC2626' : idx === 1 ? '#EA580C' : idx === 2 ? '#D97706' : '#3B82F6', borderRadius: 100, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                    {/* Count */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontWeight: 700, color: '#10233F', fontSize: 18 }}>{item.total}</div>
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>casos</div>
                    </div>
                    {/* Impact */}
                    {item.impact_total && (
                      <div style={{ textAlign: 'right', minWidth: 110 }}>
                        <div style={{ fontWeight: 700, color: '#DC2626', fontSize: 15 }}>
                          R$ {Number(item.impact_total).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: 12 }}>impacto total</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, background: 'linear-gradient(135deg, #10233F, #1E3A5F)', borderRadius: 20, padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Seu contrato pode estar neste ranking
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
            Analise agora e descubra se voce e mais um caso de juro abusivo no Brasil.
          </p>
          <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 16, fontWeight: 700, padding: '14px 36px', borderRadius: 12, display: 'inline-block' }}>
            Analisar meu contrato — R$ 4,99
          </Link>
        </div>
      </main>
    </div>
  )
}
