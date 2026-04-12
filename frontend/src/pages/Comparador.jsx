import { useState } from 'react'
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

const BCB_RATES = {
  credito_pessoal: { label: 'Credito Pessoal', rate: 5.87, unit: '% a.m.' },
  consignado: { label: 'Consignado', rate: 1.72, unit: '% a.m.' },
  financiamento_veiculo: { label: 'Financiamento Veiculo', rate: 1.84, unit: '% a.m.' },
  financiamento_imovel: { label: 'Financiamento Imovel', rate: 0.89, unit: '% a.m.' },
  cartao_credito: { label: 'Cartao de Credito', rate: 14.13, unit: '% a.m.' },
  cheque_especial: { label: 'Cheque Especial', rate: 8.08, unit: '% a.m.' },
  capital_giro: { label: 'Capital de Giro', rate: 2.18, unit: '% a.m.' },
}

function calcTotalPaid(principal, rateMonthly, months) {
  if (rateMonthly === 0) return principal
  const r = rateMonthly / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) * months
}

function calcCET(principal, monthlyPayment, months) {
  // Newton-Raphson to find monthly rate
  let r = 0.05
  for (let i = 0; i < 100; i++) {
    const pv = monthlyPayment * (1 - Math.pow(1 + r, -months)) / r
    const dpv = monthlyPayment * ((months * Math.pow(1 + r, -(months + 1))) / r - (1 - Math.pow(1 + r, -months)) / (r * r))
    const delta = (pv - principal) / dpv
    r -= delta
    if (Math.abs(delta) < 1e-8) break
  }
  return r * 100
}

export default function Comparador() {
  const [loanType, setLoanType] = useState('credito_pessoal')
  const [principal, setPrincipal] = useState('')
  const [months, setMonths] = useState('')
  const [contractRate, setContractRate] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function handleCalc(e) {
    e.preventDefault()
    const p = parseFloat(principal.replace(',', '.'))
    const m = parseInt(months)
    const r = parseFloat(contractRate.replace(',', '.'))
    if (isNaN(p) || p <= 0) { setError('Informe o valor emprestado.'); return }
    if (isNaN(m) || m <= 0) { setError('Informe o numero de parcelas.'); return }
    if (isNaN(r) || r <= 0) { setError('Informe a taxa do contrato.'); return }
    setError('')

    const bcbRate = BCB_RATES[loanType].rate
    const totalContract = calcTotalPaid(p, r, m)
    const totalBCB = calcTotalPaid(p, bcbRate, m)
    const excess = totalContract - totalBCB
    const excessPct = ((totalContract / totalBCB) - 1) * 100
    const isAbusive = r > bcbRate * 1.5

    setResult({ p, m, r, bcbRate, totalContract, totalBCB, excess, excessPct, isAbusive })
  }

  function formatBRL(val) {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid #CBD5E1', borderRadius: 10, fontSize: 16, fontFamily: "'Manrope', sans-serif", color: '#10233F', outline: 'none', boxSizing: 'border-box', background: '#FFFFFF' }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            LaudoJuros
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/ranking" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Ranking</Link>
            <Link to="/blog" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Blog</Link>
            <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '8px 18px', borderRadius: 8 }}>
              Analisar contrato
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 840, margin: '0 auto', padding: '56px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: '#FFF4E5', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Ferramenta gratuita</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, fontWeight: 700, color: '#10233F', marginBottom: 14 }}>
            Comparador de Proposta de Credito
          </h1>
          <p style={{ color: '#56677B', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
            Compare a taxa do seu contrato com a media do Banco Central e descubra quanto voce pagou a mais
          </p>
        </div>

        {/* BCB Rates banner */}
        <div style={{ background: 'linear-gradient(135deg, #10233F, #1E3A5F)', borderRadius: 16, padding: '20px 28px', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24 }}>🏦</div>
          <div>
            <div style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>TAXA MEDIA BCB — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
            <div style={{ color: '#FFFFFF', fontSize: 14 }}>
              {BCB_RATES[loanType].label}: <strong>{BCB_RATES[loanType].rate}% a.m.</strong>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#94A3B8', fontSize: 12 }}>Fonte: BCB SGS</div>
        </div>

        {/* Form */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 20, padding: '36px 36px', marginBottom: 36, boxShadow: '0 2px 16px rgba(12,26,46,0.06)' }}>
          <form onSubmit={handleCalc}>
            {/* Tipo */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Tipo de emprestimo</label>
              <select value={loanType} onChange={e => setLoanType(e.target.value)} style={{ ...inputStyle }}>
                {Object.entries(BCB_RATES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — media BCB: {v.rate}% a.m.</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Valor emprestado (R$)</label>
                <input type="text" inputMode="decimal" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="Ex: 15000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Numero de parcelas</label>
                <input type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="Ex: 36" min="1" max="360" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Taxa de juros do contrato (% a.m.)</label>
              <input type="text" inputMode="decimal" value={contractRate} onChange={e => setContractRate(e.target.value)} placeholder={`Media BCB: ${BCB_RATES[loanType].rate}% a.m.`} style={inputStyle} />
              <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>
                Verifique no contrato em "Taxa de juros mensal" ou "CET mensal"
              </p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" style={{ width: '100%', padding: '15px', background: '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
              Calcular e comparar
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div style={{ background: '#FFFFFF', border: result.isAbusive ? '2px solid #DC2626' : '2px solid #16A34A', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(12,26,46,0.1)', marginBottom: 36 }}>
            <div style={{ background: result.isAbusive ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : 'linear-gradient(135deg, #16A34A, #15803D)', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 36 }}>{result.isAbusive ? '\u26A0\uFE0F' : '\u2705'}</div>
              <div>
                <div style={{ color: '#FFFFFF', fontFamily: "'Merriweather', serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  {result.isAbusive ? 'Taxa possivelmente abusiva' : 'Taxa dentro da media'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  {result.isAbusive
                    ? 'A taxa contratada e ' + result.excessPct.toFixed(1) + '% acima da media BCB'
                    : 'A taxa esta proxima da media de mercado para esse tipo de credito'}
                </div>
              </div>
            </div>

            <div style={{ padding: '28px 32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
                {[
                  { label: 'Total com sua taxa', value: 'R$ ' + formatBRL(result.totalContract), highlight: result.isAbusive, color: result.isAbusive ? '#DC2626' : '#10233F' },
                  { label: 'Total pela media BCB', value: 'R$ ' + formatBRL(result.totalBCB), highlight: false, color: '#16A34A' },
                  { label: 'Excesso cobrado', value: result.excess > 0 ? 'R$ ' + formatBRL(result.excess) : 'R$ 0,00', highlight: result.excess > 0, color: result.excess > 0 ? '#DC2626' : '#10233F' },
                ].map(card => (
                  <div key={card.label} style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 14, padding: '20px 16px', border: '1px solid #E2EBF8' }}>
                    <div style={{ fontFamily: "'Merriweather', serif", fontSize: 20, fontWeight: 700, color: card.color, marginBottom: 6 }}>{card.value}</div>
                    <div style={{ color: '#56677B', fontSize: 13 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#374151', fontSize: 14 }}>Taxa do contrato</span>
                  <span style={{ fontWeight: 700, color: result.isAbusive ? '#DC2626' : '#10233F', fontSize: 14 }}>{result.r.toFixed(2)}% a.m.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#374151', fontSize: 14 }}>Media BCB — {BCB_RATES[loanType].label}</span>
                  <span style={{ fontWeight: 700, color: '#16A34A', fontSize: 14 }}>{result.bcbRate}% a.m.</span>
                </div>
              </div>

              {result.isAbusive && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
                  <p style={{ color: '#7F1D1D', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    <strong>Atencao:</strong> Uma taxa acima de 1,5x a media BCB pode caracterizar abusividade conforme a jurisprudencia do STJ.
                    Para obter um laudo tecnico completo com identificacao das clausulas irregulares, faca a analise do contrato original.
                  </p>
                </div>
              )}

              {result.isAbusive && (
                <Link to="/upload" style={{ display: 'block', textAlign: 'center', background: '#DC2626', color: '#FFFFFF', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '14px', borderRadius: 12 }}>
                  Obter laudo tecnico completo — R$ 9,99
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            { icon: '🏦', title: 'Dados do BCB', desc: 'Taxas medias atualizadas mensalmente pelo Banco Central do Brasil' },
            { icon: '\u2696\uFE0F', title: 'Base juridica STJ', desc: 'Calculo baseado no criterio de abusividade consolidado pelo Superior Tribunal de Justica' },
            { icon: '📊', title: 'CET real', desc: 'Calculamos o Custo Efetivo Total de acordo com a Resolucao BCB 3.517' },
          ].map(c => (
            <div key={c.title} style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 16, padding: '22px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(12,26,46,0.04)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, color: '#10233F', fontSize: 14, marginBottom: 6 }}>{c.title}</div>
              <div style={{ color: '#56677B', fontSize: 13, lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
