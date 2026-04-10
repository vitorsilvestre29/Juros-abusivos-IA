import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { confirmMockPayment, createPayment, getPaymentStatus } from '../lib/api'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

export default function Payment() {
  const { analysisId } = useParams()
  const nav = useNavigate()
  const [payment, setPayment] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createPayment(analysisId)
      .then((res) => {
        setPayment(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Erro ao gerar pagamento.')
        setLoading(false)
      })
  }, [analysisId])

  useEffect(() => {
    if (!payment) return

    const interval = setInterval(async () => {
      try {
        const res = await getPaymentStatus(payment.payment_id)
        if (res.data.status === 'paid') {
          clearInterval(interval)
          nav(`/laudo/${analysisId}`, { replace: true })
        }
      } catch (_err) {}
    }, 4000)

    return () => clearInterval(interval)
  }, [payment, analysisId, nav])

  function copyCode() {
    if (!payment?.pix_code) return
    navigator.clipboard.writeText(payment.pix_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function mockConfirm() {
    if (!payment) return
    setConfirming(true)
    try {
      await confirmMockPayment(payment.payment_id)
      nav(`/laudo/${analysisId}`, { replace: true })
    } catch (_err) {
      setError('Erro ao confirmar pagamento em modo de teste.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between">
          <Link to="/app" className="text-sm text-[#d3dce8]">Voltar ao painel</Link>
          <div className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Pagamento PIX</div>
          <div />
        </div>
      </header>

      <main className="container-app py-10 max-w-2xl">
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? <div className="surface-card p-10 text-center muted">Gerando cobranca...</div> : null}

        {!loading && payment ? (
          <section className="surface-card p-6 sm:p-8">
            <div className="text-center border-b border-[#ece4d5] pb-6">
              <div className="text-xs uppercase tracking-wider text-[#7e8a98]">Laudo tecnico completo</div>
              <div className="mt-2 font-['Playfair_Display'] text-5xl font-bold text-[#0c1a2e]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount || 20)}
              </div>
            </div>

            {payment.qr_code_base64 ? (
              <div className="mt-6 flex justify-center">
                <img
                  src={`data:image/png;base64,${payment.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-52 h-52 rounded-xl border border-[#ded6c7] bg-white p-2"
                />
              </div>
            ) : null}

            {payment.pix_code ? (
              <div className="mt-6">
                <label className="block mb-2 text-xs uppercase tracking-wide font-semibold text-[#7e8a98]">Pix copia e cola</label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl border border-[#ded6c7] bg-[#fbfaf6] px-3 py-3 text-xs text-[#334155] truncate">
                    {payment.pix_code}
                  </div>
                  <button className="btn-primary px-4" type="button" onClick={copyCode}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              O laudo sera liberado automaticamente assim que o pagamento for confirmado.
            </div>

            {MOCK_MODE ? (
              <button className="btn-accent w-full mt-4" onClick={mockConfirm} disabled={confirming}>
                {confirming ? 'Confirmando...' : 'Simular pagamento (teste)'}
              </button>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}
