import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

function fmt(val) {
  if (val === null || val === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function AnalysisResult() {
  const { contractId } = useParams()
  const nav = useNavigate()
  const [status, setStatus] = useState(null)
  const [pricing, setPricing] = useState({ price_brl: 20, includes: [] })
  const [dots, setDots] = useState('.')

  useEffect(() => {
    getPricing().then(r => setPricing(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    let interval
    async function poll() {
      try {
        const res = await getContractStatus(contractId)
        setStatus(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval)
          if (res.data.status === 'completed' && res.data.paid === true) {
            nav('/laudo/' + res.data.analysis_id, { replace: true })
          }
        }
      } catch (e) {
        clearInterval(interval)
      }
    }
    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [contractId])

  useEffect(() => {
    if (status && (status.status === 'processing' || status.status === 'pending')) {
      const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
      return () => clearInterval(t)
    }
  }, [status])

  if (status === null) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed = status.status === 'failed'
  const isDone = status.status === 'completed'
  const hasIssues = status.has_issues === true

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/app" className="text-gray-400 hover:text-gray-600 text-sm">Minhas analises</Link>
          <span className="text-gray-300"> | </span>
          <span className="text-blue-900 font-bold">Juros Abusivos IA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {isProcessing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
            <div className="text-5xl mb-4 animate-pulse">&#128269;</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Analisando seu contrato{dots}</h2>
            <p className="text-gray-500 text-sm mb-6">
              Nosso sistema esta analisando o contrato e verificando as normas do Banco Central. Aguarde.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left space-y-2">
              <p>&#10003; Extracao do texto do contrato</p>
              <p>&#10003; Consulta as taxas do Banco Central (BCB)</p>
              <p className="opacity-60">&#8987; Identificando irregularidades...</p>
              <p className="opacity-30">&#8987; Calculando impacto financeiro...</p>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-red-700 mb-2">Nao foi possivel analisar</h2>
            <p className="text-gray-500 text-sm mb-4">{status.error || 'Verifique se o arquivo esta legivel e tente novamente.'}</p>
            <button onClick={() => nav('/upload')} className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition">
              Tentar novamente
            </button>
          </div>
        )}

        {isDone && status.paid === false && (
          <div className="space-y-4">

            {hasIssues ? (
              <div className="bg-red-700 rounded-2xl p-6 text-white text-center shadow-md">
                <div className="text-4xl mb-3">&#9888;</div>
                <h1 className="text-2xl font-bold mb-2">Irregularidades identificadas</h1>
                <p className="text-red-100 text-sm">
                  Nossa analise identificou <strong className="text-white">irregularidades no seu contrato</strong> de {status.loan_type_label}.
                  Acesse o laudo para saber quais sao, o impacto financeiro e como agir.
                </p>
              </div>
            ) : (
              <div className="bg-green-700 rounded-2xl p-6 text-white text-center shadow-md">
                <div className="text-4xl mb-3">&#128203;</div>
                <h1 className="text-2xl font-bold mb-2">Analise concluida</h1>
                <p className="text-green-100 text-sm">
                  Finalizamos a analise do seu contrato de {status.loan_type_label}.
                  Acesse o laudo tecnico para ver o resultado completo com a confirmacao tecnica por escrito.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {hasIssues ? 'Veja o que encontramos no seu contrato' : 'Obtenha o Laudo Tecnico Completo'}
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                {hasIssues
                  ? 'O laudo detalha cada irregularidade com fundamento legal, calculo do valor cobrado a mais e orientacoes para acao revisional.'
                  : 'O laudo e um documento tecnico que comprova a situacao do seu contrato perante as normas do BCB. Util para comprovacao e seguranca juridica.'}
              </p>
              <ul className="space-y-2 mb-6">
                {(hasIssues ? [
                  'Irregularidades detalhadas com fundamento legal',
                  'Calculo preciso do valor cobrado a mais',
                  'Comparacao com taxas medias do Banco Central',
                  'PDF pronto para o advogado',
                  'Orientacao para acao revisional',
                ] : [
                  'Resultado completo e detalhado da analise',
                  'Confirmacao tecnica das clausulas do contrato',
                  'Comparacao com taxas medias do Banco Central',
                  'Documento PDF com validade tecnica',
                  'Parecer sobre conformidade com normas BCB',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
                <strong>Nota legal:</strong> Este laudo e uma analise tecnica e matematica, nao assessoria juridica. Para acao revisional, consulte um advogado.
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Laudo Tecnico Completo</p>
                  <p className="text-xs text-gray-400">Pagamento unico - Acesso imediato</p>
                </div>
                <span className="text-2xl font-bold text-blue-900">{fmt(pricing.price_brl)}</span>
              </div>
              <button
                onClick={() => nav('/pagamento/' + status.analysis_id)}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-4 rounded-xl transition text-lg"
              >
                {hasIssues ? 'Ver irregularidades e pagar com PIX' : 'Acessar laudo e pagar com PIX'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Pagamento seguro via PIX - Acesso imediato apos confirmacao
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
