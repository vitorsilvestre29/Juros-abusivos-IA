import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadContract, getLoanTypes } from '../lib/api'
import { useEffect } from 'react'

export default function UploadContract() {
  const nav = useNavigate()
  const [file, setFile] = useState(null)
  const [loanType, setLoanType] = useState('credito_pessoal')
  const [loanTypes, setLoanTypes] = useState([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    getLoanTypes().then(r => setLoanTypes(r.data)).catch(() => {})
  }, [])

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Selecione um arquivo para continuar.'); return }
    setError('')
    setLoading(true)
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/app" className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</Link>
          <span className="text-gray-300">|</span>
          <span className="text-blue-900 font-bold">⚖️ Juros Abusivos IA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Analisar contrato</h1>
        <p className="text-gray-500 mb-8">Envie o contrato de empréstimo ou financiamento para análise. Aceitamos PDF ou imagem (foto).</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de empréstimo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de contrato</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {loanTypes.map(lt => (
                <label
                  key={lt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    loanType === lt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio" name="loanType" value={lt.id}
                    checked={loanType === lt.id}
                    onChange={() => setLoanType(lt.id)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{lt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Arquivo do contrato</label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => setFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="mt-3 text-xs text-red-500 hover:underline"
                  >Remover</button>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📄</p>
                  <p className="font-medium text-gray-600">Arraste aqui ou clique para selecionar</p>
                  <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG ou WEBP — máximo 20 MB</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">🔒 Seus dados estão protegidos</p>
            <p className="text-blue-600">O contrato é processado de forma segura e anônima, conforme a LGPD. Não armazenamos seus dados pessoais em servidores de terceiros.</p>
          </div>

          <button
            type="submit" disabled={loading || !file}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-base"
          >
            {loading ? '⏳ Enviando para análise...' : '🔍 Analisar contrato'}
          </button>
        </form>
      </main>
    </div>
  )
}
