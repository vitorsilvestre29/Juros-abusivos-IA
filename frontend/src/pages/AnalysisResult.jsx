import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getContractStatus, getPricing } from '../lib/api'

function fmtMoney(value) {
  if (value === null || value === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function AnalysisResult() {
  const { contractId } = useParams()
  const nav = useNavigate()
  const [status, setStatus] = useState(null)
  const [pricing, setPricing] = useState({ price_brl: 20 })
  const [dots, setDots] = useState('.')

  useEffect(() => {
    getPricing().then((r) => setPricing(r.data || { price_brl: 20 })).catch(() => {})
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
            nav(`/laudo/${res.data.analysis_id}`, { replace: true })
          }
        }
      } catch (_err) {
        clearInterval(interval)
      }
    }

    poll()
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [contractId, nav])

  useEffect(() => {
    if (status && (status.status === 'pending' || status.status === 'processing')) {
      const timer = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '.' : `${prev}.`))
      }, 550)
      return () => clearInterval(timer)
    }
  }, [status])

  if (!status) {
    return <div className="site-shell flex items-center justify-center muted">Carregando status...</div>
  }

  const isProcessing = status.status === 'pending' || status.status === 'processing'
  const isFailed = status.status === 'failed'
  const isDone = status.status === 'completed'
  const hasIssues = status.has_issues === true

  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between">
          <Link to="/app" className="text-sm text-[#d3dce8]">Voltar ao painel</Link>
          <div className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Juros Abusivos IA</div>
          <div />
        </div>
      </header>

      <main className="container-app py-10 max-w-3xl">
        {isProcessing ? (
          <section className="surface-card p-8 text-center">
            <div className="text-5xl">🔎</div>
            <h1 className="mt-3 section-title">Analisando seu contrato{dots}</h1>
            <p className="mt-2 muted">Estamos processando os dados e cruzando informacoes tecnicas.</p>
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-700 space-y-1">
              <div>Extracao de dados do documento</div>
              <div>Consulta de referencia de mercado</div>
              <div>Calculo de impacto financeiro</div>
              <div>Montagem de resultado preliminar</div>
            </div>
          </section>
        ) : null}

        {isFailed ? (
          <section className="surface-card p-8 text-center">
            <div className="text-5xl">⚠️</div>
            <h1 className="mt-3 text-2xl font-['Playfair_Display'] font-bold text-[#8b1a1a]">Falha ao analisar</h1>
            <p className="mt-2 muted">{status.error || 'Nao foi possivel concluir a leitura do arquivo.'}</p>
            <button className="btn-primary mt-6" onClick={() => nav('/upload')}>Enviar novamente</button>
          </section>
        ) : null}

        {isDone && !status.paid ? (
          <section className="space-y-4">
            <div className={`${hasIssues ? 'bg-red-700' : 'bg-emerald-700'} rounded-2xl p-6 text-white`}>
              <div className="text-sm uppercase tracking-wider opacity-90">Resultado preliminar</div>
              <h2 className="mt-1 text-2xl font-bold font-['Playfair_Display']">
                {hasIssues ? 'Indicios de cobranca abusiva encontrados' : 'Analise concluida sem alerta critico'}
              </h2>
              <p className="mt-2 text-sm opacity-90">
                {hasIssues
                  ? 'Seu laudo detalha irregularidades, impacto estimado e fundamentos tecnicos para revisao contratual.'
                  : 'Seu laudo detalha as condicoes analisadas e conformidade tecnica conforme parametros adotados.'}
              </p>
            </div>

            <div className="surface-card p-6">
              <h3 className="text-xl font-bold text-[#0c1a2e]">Liberar laudo tecnico completo</h3>
              <p className="mt-1 muted text-sm">Documento completo com detalhamento e conclusao preliminar.</p>

              <div className="mt-4 stat-card flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#2e3a4d]">Pagamento unico</div>
                  <div className="text-xs text-[#7e8a98]">Acesso imediato apos confirmacao</div>
                </div>
                <div className="text-2xl font-bold text-[#0c1a2e]">{fmtMoney(pricing.price_brl)}</div>
              </div>

              <button className="btn-accent w-full mt-4" onClick={() => nav(`/pagamento/${status.analysis_id}`)}>
                Ir para pagamento PIX
              </button>
            </div>

            <div className="legal-box">
              Este resultado representa analise tecnica automatizada. A decisao juridica e o ajuizamento de acao
              devem ser realizados por advogado habilitado.
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
