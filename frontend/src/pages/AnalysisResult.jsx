import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

function fmt(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function AnalysisResult() {
  const { contractId } = useParams()
  const nav = useNavigate()
  const [status, setStatus] = useState(null)
  const [price, setPrice] = useState(97)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    getPricing().then(r => setPrice(r.data.price_brl)).catch(() => {})
  }, [])

  // Polling a cada 3s enquanto processando
  useEffect(() => {
    let interval
    async function poll() {
      try {
        const res = await getContractStatus(contractId)
        setStatus(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [contractId])

  // Animação de loading
  useEffect(() => {
    if (status?.status === 'processing' || status?.status === 'pending') {
      const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
      return () => clearInterval(t)
    }
  }, [status?.status])

  if (!status) return (
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

        {/* Processando */}
        {isProcessing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="text-5xl mb-4 animate-pulse">🔍</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Analisando seu contrato{dots}</h2>
            <p className="text-gray-500 text-sm mb-6">
              Nossa IA está lendo todas as cláusulas, taxas e comparando com as médias do Banco Central.
              Isso leva entre 30 segundos e 2 minutos.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left space-y-2">
              <p>✓ Extraindo texto do contrato</p>
              <p>✓ Consultando taxas médias do Banco Central (BCB)</p>
              <p className="opacity-50">⏳ Identificando cláusulas abusivas com IA...</p>
              <p className="opacity-30">⏳ Calculando impacto financeiro...</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {isFailed && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
            <p className="text-4xl mb-3">❌</p>
            <h2 className="text-xl font-bold text-red-700 mb-2">Não foi possível analisar</h2>
            <p className="text-gray-500 text-sm mb-4">{status.error || 'Verifique se o arquivo está legível e tente novamente.'}</p>
            <button onClick={() => nav('/upload')} className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Resultado */}
        {isDone && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Resultado da análise</h1>
            <p className="text-sm text-gray-500">{status.loan_type_label} • {status.filename}</p>

            {/* Card principal */}
            {status.has_issues ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🚨</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-red-800">
                      {status.irregularities_count} irregularidade{status.irregularities_count !== 1 ? 's' : ''} encontrada{status.irregularities_count !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-red-700 text-sm mt-1">
                      Identificamos possíveis cobranças abusivas no seu contrato.
                    </p>
                    {status.impact_brl > 0 && (
                      <div className="mt-4 bg-white rounded-xl p-4 inline-block">
                        <p className="text-xs text-gray-500 mb-0.5">Cobrança excessiva estimada</p>
                        <p className="text-3xl font-bold text-red-600">{fmt(status.impact_brl)}</p>
                        <p className="text-xs text-gray-400 mt-1">acima da média de mercado do BCB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">✅</span>
                  <div>
                    <h2 className="text-lg font-bold text-green-800">Nenhuma irregularidade encontrada</h2>
                    <p className="text-green-700 text-sm mt-1">As taxas do seu contrato estão dentro dos parâmetros de mercado.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Paywall — laudo completo */}
            {status.has_issues && !status.paid && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Ver laudo técnico completo</h3>
                <p className="text-sm text-gray-500 mb-4">
                  O laudo detalha cada irregularidade com o fundamento legal, o trecho exato do contrato,
                  o cálculo do impacto financeiro e orientações para ação revisional.
                </p>
                <ul className="text-sm text-gray-600 space-y-1.5 mb-6">
                  <li>✅ Todas as irregularidades detalhadas com fundamento legal</li>
                  <li>✅ Cálculo preciso do valor cobrado a mais</li>
                  <li>✅ Comparação com taxas médias do Banco Central</li>
                  <li>✅ PDF pronto para o advogado</li>
                  <li>✅ Indicação de ação revisional quando aplicável</li>
                </ul>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4">
                  <span className="text-gray-600 text-sm">Laudo Técnico Completo</span>
                  <span className="text-2xl font-bold text-blue-900">{fmt(price)}</span>
                </div>
                <button
                  onClick={() => nav(`/pagamento/${status.analysis_id}`)}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition"
                >
                  💳 Pagar com PIX e baixar laudo
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">Pagamento único via PIX • Acesso imediato após confirmação</p>
              </div>
            )}

            {/* Já pago */}
            {status.paid && (
              <div className="bg-white rounded-2xl border border-green-300 p-6 text-center">
                <p className="text-3xl mb-2">✅</p>
                <h3 className="font-bold text-green-700 mb-1">Laudo pago e disponível</h3>
                <button
                  onClick={() => nav(`/laudo/${status.analysis_id}`)}
                  className="mt-4 bg-green-700 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-600 transition"
                >
                  Ver e baixar laudo
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
