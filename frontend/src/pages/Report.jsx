import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

function fmtMoney(value) {
  if (value === null || value === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function severityClass(level) {
  if (level === 'alta') return 'bg-red-50 border-red-200 text-red-700'
  if (level === 'media') return 'bg-amber-50 border-amber-200 text-amber-700'
  if (level === 'baixa') return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  return 'bg-slate-50 border-slate-200 text-slate-700'
}

export default function Report() {
  const { analysisId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFullReport(analysisId)
      .then((res) => {
        setReport(res.data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.response?.status === 402 ? 'Pagamento necessario para acesso ao laudo.' : 'Erro ao carregar laudo.')
        setLoading(false)
      })
  }, [analysisId])

  if (loading) return <div className="site-shell flex items-center justify-center muted">Carregando laudo...</div>

  if (error) {
    return (
      <div className="site-shell flex items-center justify-center px-4">
        <div className="surface-card p-8 text-center max-w-md w-full">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-3 text-2xl font-['Playfair_Display'] font-bold text-[#0c1a2e]">Acesso restrito</h1>
          <p className="mt-2 muted">{error}</p>
          <Link to="/app" className="btn-primary mt-5">Voltar ao painel</Link>
        </div>
      </div>
    )
  }

  const irregularidades = report?.irregularidades || []
  const waMsg = `Ola! Recebi o laudo tecnico da analise #${analysisId} e quero orientacao juridica.`
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between gap-3">
          <Link to="/app" className="text-sm text-[#d3dce8]">Voltar ao painel</Link>
          <div className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Laudo tecnico</div>
          <a className="btn-accent px-4 py-2 text-sm" href={getReportDownloadUrl(analysisId)} target="_blank" rel="noreferrer">Baixar PDF</a>
        </div>
      </header>

      <main className="container-app py-10 max-w-4xl space-y-4">
        <section className="surface-dark p-6 sm:p-8">
          <div className="text-xs uppercase tracking-wider text-[#d6c08a]">Analise #{analysisId}</div>
          <h1 className="mt-2 font-['Playfair_Display'] text-3xl font-bold">{report.banco_credor || 'Instituicao financeira'}</h1>
          <p className="mt-1 text-sm text-[#c9d4e3]">{report.tipo_contrato || 'Tipo nao informado'}</p>

          <div className="mt-5 grid sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <div className="text-xs text-[#c9d4e3]">Valor contratado</div>
              <div className="mt-1 font-bold">{fmtMoney(report.valor_contratado)}</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <div className="text-xs text-[#c9d4e3]">Taxa contratada</div>
              <div className="mt-1 font-bold">{report.taxa_mensal_contratada || '--'}% a.m.</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <div className="text-xs text-[#c9d4e3]">Taxa de referencia</div>
              <div className="mt-1 font-bold">{report.bcb_rate_pct ? report.bcb_rate_pct.toFixed(2) : '--'}% a.m.</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <div className="text-xs text-[#c9d4e3]">Prazo</div>
              <div className="mt-1 font-bold">{report.prazo_meses || '--'} meses</div>
            </div>
          </div>
        </section>

        {Number(report.impact_brl) > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="text-xs uppercase tracking-wider font-semibold text-red-700">Impacto financeiro estimado</div>
            <div className="mt-1 font-['Playfair_Display'] text-4xl font-bold text-red-800">{fmtMoney(report.impact_brl)}</div>
          </section>
        ) : null}

        {irregularidades.length > 0 ? (
          <section className="surface-card p-6">
            <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#0c1a2e]">Achados principais</h2>
            <div className="mt-4 space-y-3">
              {irregularidades.map((irr, index) => (
                <article key={`${irr.tipo || 'item'}-${index}`} className="rounded-xl border border-[#e6dcc6] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <h3 className="font-bold text-[#0c1a2e]">{irr.tipo || 'Irregularidade'}</h3>
                    <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${severityClass(irr.gravidade)}`}>
                      {(irr.gravidade || 'nao classificada').toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm muted leading-relaxed">{irr.descricao}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {report.resumo_tecnico ? (
          <section className="surface-card p-6">
            <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#0c1a2e]">Resumo tecnico</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#334155]">{report.resumo_tecnico}</p>
          </section>
        ) : null}

        {irregularidades.length > 0 ? (
          <section className="surface-dark p-6 sm:p-8 text-center">
            <h2 className="font-['Playfair_Display'] text-3xl font-bold">Encaminhamento juridico recomendado</h2>
            <p className="mt-2 text-[#d3dce8] text-sm leading-relaxed max-w-xl mx-auto">
              Com base nos achados tecnicos, o proximo passo e uma avaliacao juridica para eventual acao revisional.
            </p>
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn-accent mt-5">
              Falar com advogado parceiro
            </a>
          </section>
        ) : null}

        <section className="legal-box">
          Este documento possui natureza tecnica e informativa. Interpretacao juridica e medidas judiciais cabem
          exclusivamente a profissional habilitado nos termos do Estatuto da OAB.
        </section>
      </main>
    </div>
  )
}
