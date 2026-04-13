import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadContract, getLoanTypes } from '../lib/api'
import useIsMobile from '../lib/useIsMobile'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

const LOAN_LABELS = {
  consignado_inss: 'Consignado INSS',
  consignado_clt: 'Consignado CLT (desconto em folha)',
  credito_pessoal: 'Credito Pessoal (bancario direto)',
  credito_habitacional: 'Credito Habitacional / Financiamento Imobiliario',
  cdc_veiculo: 'CDC Veiculo / Financiamento de Veiculo',
  cartao_credito: 'Cartao de Credito',
  outros: 'Outros',
}

export default function UploadContract() {
  const nav = useNavigate()
  const isMobile = useIsMobile()
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
    setFile(f)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (file === null) { setError('Selecione um arquivo.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await uploadContract(file, loanType)
      nav('/analise/' + res.data.contract_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '12px 16px' : '0 24px', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>LaudoJuros</Link>
          <Link to={isGuest ? '/cadastro' : '/app'} style={{ color: '#7E9BB5', textDecoration: 'none', fontSize: 14, width: isMobile ? '100%' : 'auto' }}>
            {isGuest ? 'Criar conta para salvar' : 'Minhas analises'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '36px 16px 48px' : '56px 24px' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontFamily: serif, fontSize: isMobile ? 28 : 34, fontWeight: 700, color: N, marginBottom: 10 }}>
            Enviar contrato para analise
          </h1>
          <p style={{ color: muted, fontSize: isMobile ? 14 : 16, lineHeight: 1.6 }}>Envie apenas o PDF do contrato de emprestimo ou financiamento</p>
        </div>

        <div style={{ background: '#FFF4E5', border: '1px solid #F5E8C8', borderLeft: '4px solid ' + O, borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <p style={{ color: '#8A4C00', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
            <strong>Aviso importante:</strong> Para maior precisao, envie o PDF original do banco. PDFs gerados a partir de foto/escaneamento podem reduzir a qualidade da leitura e impactar a analise.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            style={{
              border: dragging ? '2px dashed ' + O : file ? '2px dashed #1A6B3C' : '2px dashed ' + border,
              borderRadius: 16, padding: isMobile ? '32px 18px' : '48px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#FFF4E5' : file ? '#F0FDF4' : white,
              transition: 'all 0.2s', marginBottom: 32
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 700, color: '#1A6B3C', fontSize: 16, marginBottom: 4 }}>{file.name}</p>
                <p style={{ color: muted, fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB — Clique para trocar</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
                <p style={{ fontWeight: 700, color: N, fontSize: 16, marginBottom: 6 }}>Arraste o arquivo ou clique para selecionar</p>
                <p style={{ color: '#7E8FA5', fontSize: 13 }}>Apenas PDF — Maximo 20MB</p>
              </>
            )}
          </div>

          <div style={{ marginBottom: 36 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: N, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tipo de contrato
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {loanTypes.map(lt => (
                <label key={lt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: loanType === lt.id ? '2px solid ' + O : '1.5px solid ' + border, borderRadius: 10, cursor: 'pointer', background: loanType === lt.id ? '#FFF4E5' : white, transition: 'all 0.15s' }}>
                  <input type="radio" name="loan_type" value={lt.id} checked={loanType === lt.id} onChange={() => setLoanType(lt.id)} style={{ accentColor: O }} />
                  <span style={{ fontSize: 13, color: loanType === lt.id ? '#8A4C00' : '#374151', fontWeight: loanType === lt.id ? 600 : 400 }}>{lt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #C8E6C9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#2E7D32"/></svg>
            <p style={{ color: '#2E7D32', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              Seus dados sao protegidos pela <strong>LGPD (Lei 13.709/2018)</strong>. O documento e usado exclusivamente para esta analise e excluido em 90 dias.{' '}
              <Link to="/privacidade" target="_blank" style={{ color: '#1B5E20', textDecoration: 'underline' }}>Politica de Privacidade</Link>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || file === null}
            style={{ width: '100%', padding: '15px', background: (loading || file === null) ? '#CBD5E1' : N, color: white, border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: (loading || file === null) ? 'not-allowed' : 'pointer', fontFamily: sans }}
          >
            {loading ? 'Enviando para analise...' : 'Analisar contrato'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#7E8FA5', marginTop: 16, lineHeight: 1.6 }}>
            Seus documentos sao protegidos conforme a LGPD. Analise tecnica — nao assessoria juridica.
          </p>
        </form>
      </main>
    </div>
  )
}
