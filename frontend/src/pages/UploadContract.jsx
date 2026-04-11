import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadContract, getLoanTypes } from '../lib/api'

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
  credito_pessoal: '💰', consignado: '📋', financiamento_veiculo: '🚗',
  financiamento_imovel: '🏠', cartao_credito: '💳', cheque_especial: '🏦', capital_giro: '📈',
}

export default function UploadContract() {
  const nav = useNavigate()
  const rawUser = localStorage.getItem('user')
  const currentUser = rawUser ? JSON.parse(rawUser) : null
  const isGuest = currentUser ? currentUser.is_guest === true : true
  const [loanTypes, setLoanTypes] = useState(Object.entries(LOAN_LABELS).map(([id, label]) => ({ id, label })))
  const [loanType, setLoanType] = useState('credito_pessoal')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    getLoanTypes().then(r => setLoanTypes(r.data)).catch(() => {})
  }, [])

  function handleFile(f) {
    if (f && f.size > 20 * 1024 * 1024) { setError('Arquivo muito grande. Maximo 20MB.'); return }
    setFile(f); setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (file === null) { setError('Selecione um arquivo.'); return }
    setLoading(true); setError('')
    try {
      const res = await uploadContract(file, loanType)
      nav('/analise/' + res.data.contract_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const navLinkStyle = { color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={navLinkStyle}>
            {isGuest ? 'Salvar meu historico' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 44, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#FFF4E5', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Analise tecnica</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 36, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>
            Enviar contrato para analise
          </h1>
          <p style={{ color: '#56677B', fontSize: 16 }}>PDF ou imagem do contrato de emprestimo ou financiamento</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Upload area */}
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            style={{
              border: dragging ? '2px dashed #FF9F1C' : file ? '2px dashed #16A34A' : '2px dashed #CBD5E1',
              borderRadius: 20, padding: '56px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#FFF9F0' : file ? '#F0FDF4' : '#FFFFFF',
              transition: 'all 0.2s', marginBottom: 36,
              boxShadow: '0 2px 12px rgba(12,26,46,0.05)',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
                <p style={{ fontWeight: 700, color: '#15803D', fontSize: 17, marginBottom: 6 }}>{file.name}</p>
                <p style={{ color: '#56677B', fontSize: 14 }}>{(file.size / 1024 / 1024).toFixed(2)} MB — Clique para trocar o arquivo</p>
              </>
            ) : (
              <>
                <div style={{ width: 72, height: 72, background: '#F0F4FB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>📎</div>
                <p style={{ fontWeight: 700, color: '#10233F', fontSize: 17, marginBottom: 8 }}>Arraste o arquivo aqui ou clique para selecionar</p>
                <p style={{ color: '#94A3B8', fontSize: 14 }}>PDF, JPG ou PNG — Maximo 20MB</p>
              </>
            )}
          </div>

          {/* Tipo de contrato */}
          <div style={{ marginBottom: 40 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Tipo de contrato
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 10 }}>
              {loanTypes.map(lt => (
                <label key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', border: loanType === lt.id ? '2px solid #FF9F1C' : '1.5px solid #E2EBF8', borderRadius: 12, cursor: 'pointer', background: loanType === lt.id ? '#FFF9F0' : '#FFFFFF', transition: 'all 0.15s', boxShadow: loanType === lt.id ? '0 2px 8px rgba(255,159,28,0.15)' : 'none' }}>
                  <input type="radio" name="loan_type" value={lt.id} checked={loanType === lt.id} onChange={() => setLoanType(lt.id)} style={{ display: 'none' }} />
                  <span style={{ fontSize: 18 }}>{LOAN_ICONS[lt.id] || '📄'}</span>
                  <span style={{ fontSize: 13, color: loanType === lt.id ? '#8A4C00' : '#374151', fontWeight: loanType === lt.id ? 700 : 500 }}>{lt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || file === null}
            style={{ width: '100%', padding: '16px', background: (loading || file === null) ? '#94A3B8' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: (loading || file === null) ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: (loading || file === null) ? 'none' : '0 4px 16px rgba(12,26,46,0.2)' }}
          >
            {loading ? 'Enviando para analise...' : 'Analisar contrato'}
          </button>

          {/* trust bar */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
            {['🔒 Protegido pela LGPD', '📊 Comparacao com BCB', '⚖️ Base juridica STJ'].map(t => (
              <span key={t} style={{ color: '#94A3B8', fontSize: 13 }}>{t}</span>
            ))}
          </div>

          {/* opcional cadastro */}
          {isGuest && (
            <div style={{ marginTop: 28, background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 700, color: '#10233F', fontSize: 14, marginBottom: 3 }}>Quer salvar seu historico de analises?</p>
                <p style={{ color: '#56677B', fontSize: 13 }}>O cadastro e gratuito e opcional.</p>
              </div>
              <Link to="/cadastro" style={{ background: '#FFF4E5', color: '#8A4C00', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,159,28,0.3)', whiteSpace: 'nowrap' }}>
                Criar conta gratis
              </Link>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
