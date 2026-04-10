import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

function fmt(val) {
  if (\!val && val \!== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function AnalysisResult() {
  const { contractId } = useParams()
  const nav = useNavigate()
  const [status, setStatus] = useState(null)
  const [pricing, setPricing] = useState({ price_brl: 20, includes: [] })
  const [dots, setDots] = useState('.')

  useEffect(() => {
    getPricing()
      .then(r => setPricing(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let interval
    async function poll() {
      try {
        const res = await getContractStatus(contractId)
        setStatus(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval)
          // Se já pagou, vai direto pro laudo
          if (res.data.status === 'completed' && res.data.paid) {
            nav(`/laudo/${res.data.analysis_id}`, { replace: true })
          }
        }
      } catch {
        clearInterval(interval)
      }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [contractId])

  useEffect(() => {
    if (status?.status === 'processing' || status?.status === 'pending') {
      const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
      return () => clearInterval(t)
    }
  }, [status?.status])

  if (\!status) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed = status.status === 'failed'
  const isDone = status.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/app" className="text-gray-400 hover:text-gray-600 text-sm">← Minhas análises</Link>
          <span className="text-gray-300">|</span>
          <span className="text-blue-900 font-bold">⚖️ Juros Abusivos IA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Analisando */}
        {isProcessing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
            <div className="text-5xl mb-4 animate-pulse">🔍</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Analisando seu contrato{dots}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Nossa IA está lendo todas as cláusulas e comparando com as normas do Banco Central.
              Isso leva entre 30 segundos e 2 minutos.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left space-y-2">
              <p>✓ Extração do texto do contrato</p>
              <p>✓ Consulta às taxas médias do Banco Central (BCB)</p>
              <p className="opacity-60">⏳ Identificando irregularidades técnicas...</p>
              <p className="opacity-30">⏳ Calculando impacto financeiro...</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {isFailed && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">❌</p>
            <h2 className="text-xl font-bold text-red-700 mb-2">Não foi possível analisar</h2>
            <p className="text-gray-500 text-sm mb-4">
              {status.error || 'Verifique se o arquivo está legível e tente novamente.'}
            </p>
            <button
              onClick={() => nav('/upload')}
              className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Análise pronta — paywall total */}
        {isDone && \!status.paid && (
          <div className="space-y-4">

            {/* Banner de conclusão */}
            <div className="bg-blue-900 rounded-2xl p-6 text-white text-center shadow-md">
              <div className="text-4xl mb-3">📋</div>
              <h1 className="text-2xl font-bold mb-2">Análise concluída\!</h1>
              <p className="text-blue-200 text-sm">
                Verificamos seu contrato de <strong className="text-white">{status.loan_type_label}</strong> contra
                as normas do Banco Central e a legislação bancária vigente.
              </p>
            </div>

            {/* Paywall */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Acesse o Laudo Técnico Completo
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                O laudo detalha cada ponto encontrado na análise, com fundamento legal,
                cálculo do impacto financeiro e orientações para ação revisional.
              </p>

              <ul className="space-y-2 mb-6">
                {(pricing.includes?.length > 0 ? pricing.includes : [
                  'Todas as irregularidades detalhadas com fundamento legal',
                  'Cálculo preciso do valor cobrado a mais',
                  'Comparação com taxas médias do Banco Central',
                  'PDF pronto para o advogado',
                  'Indicação de ação revisional quando aplicável',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Aviso legal */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
                ⚖️ <strong>Nota:</strong> Este laudo é uma análise técnica e matemática.
                Não constitui assessoria jurídica. Para ação revisional, consulte um advogado habilitado.
              </div>

              {/* CTA de pagamento */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Laudo Técnico Completo</p>
                  <p className="text-xs text-gray-400">Pagamento único • Acesso imediato</p>
                </div>
                <span className="text-2xl font-bold text-blue-900">{fmt(pricing.price_brl)}</span>
              </div>

              <button
                onClick={() => nav(`/pagamento/${status.analysis_id}`)}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-4 rounded-xl transition text-lg"
              >
                💳 Pagar com PIX e acessar laudo
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Pagamento seguro via PIX • Acesso imediato após confirmação
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
