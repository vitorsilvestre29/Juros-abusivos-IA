import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadContract, getLoanTypes } from '../lib/api'

const LOAN_LABELS = {
  credito_pessoal: 'Credito Pessoal',
  consignado: 'Consignado INSS / CLT',
  financiamento_veiculo: 'Financiamento de Veiculo',
  financiamento_imovel: 'Financiamento Imobiliario',
  cartao_credito: 'Cartao de Credito',
  cheque_especial: 'Cheque Especial',
  capital_giro: 'Capital de Giro',
}

const LOAN_ICONS = {
  credito_pessoal: '💰', consignado: '📋', financiamento_veiculo: '🚗',
  financiamento_imovel: '🏠', cartao_credito: '💳', cheque_especial: '🏦', capital_giro: '📈',
}

const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', cream: '#FAF8F3',
  bg: '#F7F5F0', border: '#E8E2D9',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

export default function UploadContract() {
  const nav = useNavigate()
  const rawUser = localStorage.getItem('user')
  const currentUser = rawUser ? JSON.parse(rawUser) : null
  const isGuest = currentUser ? currentUser.is_guest === true : true
  const [loanTypes, setLoanTypes] = useState(Object.entries(LOAN_LABELS).map(([id, label]) => ({ id, label })))
  const [loanType, setLoanType] = useState('credito_pessoal')
  const [file, setFile] = useState(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  useEffect(() => { getLoanTypes().then(r => setLoanTypes(r.data)).catch(() => {}) }, [])

  function handleFile(f) {
    if (f && f.size > 20 * 1024 * 1024) { setError('Arquivo muito grande. Maximo 20MB.'); return }
    setFile(f); setError('')
  }

  function formatPhone(val) {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return '(' + digits.slice(0,2) + ') ' + digits.slice(2)
    if (digits.length <= 11) return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + '-' + digits.slice(7)
    return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + '-' + digits.slice(7,11)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (file === null) { setError('Selecione um arquivo antes de continuar.'); return }
    setLoading(true); setError('')
    try {
      const rawPhone = phone.replace(/\D/g, '')
      const phoneE164 = rawPhone.length >= 10 ? '55' + rawPhone : ''
      const res = await uploadContract(file, loanType, phoneE164)
      nav('/analise/' + res.data.contract_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar contrato. Tente novamente.')
    } finally { setLoading(false) }
  }

  const btnBase = { fontFamily: sans, border: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans }}>
      {/* NAV */}
      <nav style={{ background: G.dark, borderBottom: `1px solid rgba(201,168,76,0.15)`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 19, fontWeight: 700, textDecoration: 'none', letterSpacing: 0.4 }}>
            Juros Abusivos
          </Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={{ color: G.mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 6, border: `1px solid rgba(255,255,255,0.1)` }}>
            {isGuest ? 'Salvar meu historico' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 740, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${G.goldBorder}`, borderRadius: 4, padding: '5px 14px', marginBottom: 20, background: '#FAF5EB' }}>
            <div style={{ width: 6, height: 6, background: G.gold, borderRadius: '50%' }} />
            <span style={{ color: G.gold, fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Analise tecnica</span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 700, color: G.text, marginBottom: 10, letterSpacing: '-0.3px', lineHeight: 1.15 }}>
            Enviar contrato para analise
          </h1>
          <p style={{ color: G.muted, fontSize: 15 }}>PDF ou foto do contrato de emprestimo ou financiamento</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '3px solid #DC2626', borderRadius: 8, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            style={{ border: dragging ? `2px dashed ${G.gold}` : file ? `2px dashed #16A34A` : `2px dashed ${G.border}`, borderRadius: 12, padding: '44px 28px', textAlign: 'center', background: dragging ? '#FAF5EB' : file ? '#F0FDF4' : G.white, transition: 'all 0.2s', marginBottom: 28 }}
          >
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

            {file ? (
              <>
                <div style={{ width: 52, height: 52, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                <p style={{ fontWeight: 700, color: '#15803D', fontSize: 16, marginBottom: 4 }}>{file.name}</p>
                <p style={{ color: G.muted, fontSize: 13, marginBottom: 20 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => fileRef.current.click()} style={{ ...btnBase, background: G.bg, color: G.text, border: `1px solid ${G.border}`, borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600 }}>Trocar arquivo</button>
                  <button type="button" onClick={() => cameraRef.current.click()} style={{ ...btnBase, background: G.bg, color: G.text, border: `1px solid ${G.border}`, borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600 }}>📷 Tirar foto</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 52, height: 52, background: G.goldPale, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22 }}>📎</div>
                <p style={{ fontWeight: 700, color: G.text, fontSize: 16, marginBottom: 6 }}>Arraste o arquivo ou escolha uma opcao</p>
                <p style={{ color: G.muted, fontSize: 13, marginBottom: 24 }}>PDF, JPG ou PNG &mdash; Maximo 20MB</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => fileRef.current.click()} style={{ ...btnBase, background: G.dark, color: G.white, borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600 }}>📄 Selecionar arquivo</button>
                  <button type="button" onClick={() => cameraRef.current.click()} style={{ ...btnBase, background: G.goldPale, color: '#78600A', border: `1.5px solid ${G.goldBorder}`, borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600 }}>📸 Foto pelo celular</button>
                </div>
              </>
            )}
          </div>

          {/* Tipo de contrato */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: G.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.2 }}>Tipo de contrato</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))', gap: 8 }}>
              {loanTypes.map(lt => (
                <label key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: loanType === lt.id ? `2px solid ${G.gold}` : `1.5px solid ${G.border}`, borderRadius: 8, cursor: 'pointer', background: loanType === lt.id ? G.goldPale : G.white, transition: 'all 0.15s' }}>
                  <input type="radio" name="loan_type" value={lt.id} checked={loanType === lt.id} onChange={() => setLoanType(lt.id)} style={{ display: 'none' }} />
                  <span style={{ fontSize: 16 }}>{LOAN_ICONS[lt.id] || '📄'}</span>
                  <span style={{ fontSize: 13, color: loanType === lt.id ? '#78600A' : G.text, fontWeight: loanType === lt.id ? 700 : 500 }}>{lt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <div style={{ marginBottom: 32, background: G.white, border: `1.5px solid ${G.border}`, borderRadius: 12, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
              <div>
                <p style={{ fontWeight: 700, color: G.text, fontSize: 14, marginBottom: 2 }}>Receber resultado por WhatsApp</p>
                <p style={{ color: G.muted, fontSize: 12 }}>Opcional &mdash; avisamos quando a analise ficar pronta</p>
              </div>
            </div>
            <input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={16}
              style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${G.border}`, borderRadius: 8, fontSize: 15, fontFamily: sans, color: G.text, outline: 'none', boxSizing: 'border-box', background: G.bg }} />
          </div>

          {/* LGPD Notice */}
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid ' + G.goldBorder, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill={G.gold}/></svg>
            <p style={{ color: G.muted, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: sans }}>
              Seus dados sao protegidos conforme a <strong style={{ color: G.text }}>LGPD (Lei 13.709/2018)</strong>. O documento e usado exclusivamente para esta analise e excluido em 90 dias.{' '}
              <a href="/privacidade" target="_blank" rel="noreferrer" style={{ color: G.gold, textDecoration: 'none', fontWeight: 600 }}>Ver Politica de Privacidade</a>
            </p>
          </div>

          <button type="submit" disabled={loading || file === null}
            style={{ ...btnBase, width: '100%', padding: '15px', background: (loading || file === null) ? '#9CA3AF' : G.dark, color: G.white, borderRadius: 8, fontSize: 15, fontWeight: 700, boxShadow: (loading || file === null) ? 'none' : '0 4px 16px rgba(14,17,23,0.2)', letterSpacing: 0.2 }}>
            {loading ? 'Enviando para analise...' : 'Analisar contrato'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
            {['🔒 LGPD', '📊 Taxas BCB ao vivo', '⚖️ Jurisprudencia STJ'].map(t => (
              <span key={t} style={{ color: G.muted, fontSize: 12 }}>{t}</span>
            ))}
          </div>

          {isGuest && (
            <div style={{ marginTop: 28, background: G.white, border: `1px solid ${G.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 700, color: G.text, fontSize: 13, marginBottom: 2 }}>Quer salvar seu historico?</p>
                <p style={{ color: G.muted, fontSize: 12 }}>Cadastro gratuito e opcional.</p>
              </div>
              <Link to="/cadastro" style={{ background: G.goldPale, color: '#78600A', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 7, border: `1px solid ${G.goldBorder}` }}>
                Criar conta gratis
              </Link>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
