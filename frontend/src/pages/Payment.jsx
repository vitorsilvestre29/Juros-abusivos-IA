import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPayment, getPaymentStatus, confirmMockPayment } from '../lib/api'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

export default function Payment() {
  const { analysisId } = useParams()
  const nav = useNavigate()
  const [payment, setPayment] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pollRef = useRef()

  useEffect(() => {
    createPayment(analysisId)
      .then(r => { setPayment(r.data); startPolling(r.data.payment_id) })
      .catch(err => setError(err.response?.data?.detail || 'Erro ao gerar PIX'))
      .finally(() => setLoading(false))
    return () => clearInterval(pollRef.current)
  }, [analysisId])

  function startPolling(paymentId) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await getPaymentStatus(paymentId)
        if (res.data.status === 'paid') {
          clearInterval(pollRef.current)
          nav(`/laudo/${analysisId}`)
        }
      } catch {}
    }, 3000)
  }

  async function copyCode() {
    if (!payment?.qr_code) return
    await navigator.clipboard.writeText(payment.qr_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  async function handleMockConfirm() {
    if (!payment?.payment_id) return
    try {
      await confirmMockPayment(payment.payment_id)
      nav(`/laudo/${analysisId}`)
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Gerando QR Code PIX...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <Link to="/app" className="text-blue-700 text-sm hover:underline">Voltar ao início</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/app" className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</Link>
          <span className="text-gray-300">|</span>
          <span className="text-blue-900 font-bold">⚖️ Juros Abusivos IA</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento via PIX</h1>
        <p className="text-gray-500 text-sm mb-8">Após a confirmação do pagamento, seu laudo será liberado automaticamente.</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          {/* Valor */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <span className="text-gray-600">Laudo Técnico Completo</span>
            <span className="text-2xl font-bold text-blue-900">{fmt(payment?.amount_brl)}</span>
          </div>

          {/* QR Code */}
          {payment?.qr_code_base64 ? (
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-4">Escaneie o QR Code com seu app de banco:</p>
              <img
                src={`data:image/png;base64,${payment.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto border border-gray-200 rounded-xl"
              />
            </div>
          ) : (
            <div className="text-center mb-6 py-8 bg-gray-50 rounded-xl">
              <p className="text-4xl mb-2">📱</p>
              <p className="text-sm text-gray-500">Use o código abaixo no app do seu banco</p>
            </div>
          )}

          {/* Copia e cola */}
          {payment?.qr_code && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Código copia e cola:</p>
              <div className="flex gap-2">
                <input
                  readOnly value={payment.qr_code}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50 font-mono truncate"
                />
                <button
                  onClick={copyCode}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    copied ? 'bg-green-600 text-white' : 'bg-blue-900 text-white hover:bg-blue-800'
                  }`}
                >
                  {copied ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 text-center mb-4">
          <p className="font-semibold mb-1">⏳ Aguardando pagamento...</p>
          <p>Esta página atualiza automaticamente após a confirmação do PIX.</p>
        </div>

        {/* Mock button */}
        {MOCK_MODE && payment?.payment_id && (
          <button
            onClick={handleMockConfirm}
            className="w-full bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition text-sm"
          >
            🧪 [MOCK] Simular pagamento aprovado
          </button>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Pagamento processado com segurança pelo Mercado Pago
        </p>
      </main>
    </div>
  )
}
