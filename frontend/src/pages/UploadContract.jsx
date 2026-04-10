import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadContract, getLoanTypes } from '../lib/api'
import { useEffect } from 'react'

const LOAN_LABELS = {
  credito_pessoal: 'Credito Pessoal',
  consignado: 'Consignado',
  financiamento_veiculo: 'Financiamento de Veiculo',
  financiamento_imovel: 'Financiamento de Imovel',
  cartao_credito: 'Cartao de Credito',
  cheque_especial: 'Cheque Especial',
  capital_giro: 'Capital de Giro',
}

export default function UploadContract() {
  const nav = useNavigate()
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
    if (!file) { setError('Selecione um arquivo.'); return }
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
    <div style={{ minHeight: '100vh', background: '#F3F8FF' }}>
      <nav style={{ background: '#10233F', borderBottom: '1px solid #1F4E79' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            Juros Abusivos
          </Link>
          <Link to="/app" style={{ color: '#5E7085', textDecoration: 'none', fontSize: 14 }}>Minhas analises</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 34, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>
            Enviar contrato para analise
          </h1>
          <p style={{ color: '#56677B', fontSize: 16 }}>PDF ou imagem do contrato de emprestimo ou financiamento</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#7F1D1D', fontSize: 14 }}>
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
              border: dragging ? '2px dashed #FF9F1C' : file ? '2px dashed #1A6B3C' : '2px dashed #D1CBC0',
              borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#FFF4E5' : file ? '#F0FDF4' : '#FFFFFF',
              transition: 'all 0.2s', marginBottom: 32
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 700, color: '#1A6B3C', fontSize: 16, marginBottom: 4 }}>{file.name}</p>
                <p style={{ color: '#56677B', fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB — Clique para trocar</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
                <p style={{ fontWeight: 700, color: '#10233F', fontSize: 16, marginBottom: 6 }}>Arraste o arquivo ou clique para selecionar</p>
                <p style={{ color: '#7E8FA5', fontSize: 13 }}>PDF, JPG ou PNG — Maximo 20MB</p>
              </>
            )}
          </div>

          {/* Tipo de contrato */}
          <div style={{ marginBottom: 36 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tipo de contrato
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {loanTypes.map(lt => (
                <label key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: loanType === lt.id ? '2px solid #FF9F1C' : '1.5px solid #D8E3F2', borderRadius: 10, cursor: 'pointer', background: loanType === lt.id ? '#FFF4E5' : '#FFFFFF', transition: 'all 0.15s' }}>
                  <input type="radio" name="loan_type" value={lt.id} checked={loanType === lt.id} onChange={() => setLoanType(lt.id)} style={{ accentColor: '#FF9F1C' }} />
                  <span style={{ fontSize: 13, color: loanType === lt.id ? '#8A4C00' : '#374151', fontWeight: loanType === lt.id ? 600 : 400 }}>{lt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            style={{ width: '100%', padding: '15px', background: (loading || !file) ? '#CBD5E1' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: (loading || !file) ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif" }}
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

