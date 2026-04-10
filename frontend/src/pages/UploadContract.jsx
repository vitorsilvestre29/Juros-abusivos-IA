import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLoanTypes, uploadContract } from '../lib/api'

const LOAN_LABELS = {
  credito_pessoal: 'Credito pessoal',
  consignado: 'Consignado',
  financiamento_veiculo: 'Financiamento de veiculo',
  financiamento_imovel: 'Financiamento de imovel',
  cartao_credito: 'Cartao de credito',
  cheque_especial: 'Cheque especial',
  capital_giro: 'Capital de giro',
}

export default function UploadContract() {
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [loanTypes, setLoanTypes] = useState(Object.entries(LOAN_LABELS).map(([id, label]) => ({ id, label })))
  const [loanType, setLoanType] = useState('credito_pessoal')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getLoanTypes().then((r) => setLoanTypes(r.data || [])).catch(() => {})
  }, [])

  function handleFile(selectedFile) {
    if (selectedFile && selectedFile.size > 20 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite de 20MB.')
      return
    }
    setFile(selectedFile)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Selecione um arquivo para continuar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await uploadContract(file, loanType)
      nav(`/analise/${res.data.contract_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between">
          <Link to="/" className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Juros Abusivos IA</Link>
          <Link to="/app" className="btn-secondary px-4 py-2 text-sm">Minhas analises</Link>
        </div>
      </header>

      <main className="container-app py-10 max-w-4xl">
        <div className="mb-6">
          <h1 className="section-title">Enviar contrato para analise</h1>
          <p className="mt-2 muted">PDF, JPG, PNG ou WEBP. O arquivo sera processado em ambiente seguro.</p>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <section
            className={`surface-card p-6 sm:p-8 text-center cursor-pointer transition-all ${dragging ? 'ring-2 ring-[#c9952a]' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {file ? (
              <>
                <div className="text-4xl">✅</div>
                <h2 className="mt-3 text-xl font-bold text-[#0c1a2e]">{file.name}</h2>
                <p className="mt-1 text-sm muted">{(file.size / 1024 / 1024).toFixed(2)} MB - clique para trocar</p>
              </>
            ) : (
              <>
                <div className="text-4xl">📎</div>
                <h2 className="mt-3 text-xl font-bold text-[#0c1a2e]">Arraste o arquivo aqui</h2>
                <p className="mt-1 text-sm muted">ou clique para selecionar no dispositivo</p>
                <p className="mt-2 text-xs text-[#7e8a98]">Limite de 20MB por envio</p>
              </>
            )}
          </section>

          <section className="surface-card p-6">
            <label className="block text-sm font-semibold text-[#273142] mb-3">Tipo da operacao</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {loanTypes.map((item) => (
                <label key={item.id} className={`rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-all ${loanType === item.id ? 'border-[#c9952a] bg-[#fff8e8] text-[#7d5a12] font-semibold' : 'border-[#ddd5c7] bg-white text-[#374151]'}`}>
                  <input
                    type="radio"
                    className="mr-2"
                    checked={loanType === item.id}
                    onChange={() => setLoanType(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </section>

          <button className="btn-primary w-full" type="submit" disabled={loading || !file}>
            {loading ? 'Enviando para analise...' : 'Iniciar analise tecnica'}
          </button>

          <div className="legal-box">
            Este envio gera analise tecnica automatizada. O resultado nao substitui parecer juridico profissional.
          </div>
        </form>
      </main>
    </div>
  )
}
