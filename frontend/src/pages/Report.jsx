import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFullReport, getReportDownloadUrl } from '../lib/api'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999'

function fmt(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function GravidadeBadge({ g }) {
  return g === 'alta'
    ? <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">🔴 ALTA</span>
    : <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">🟡 MÉDIA</span>
}

export default function Report() {
  const { analysisId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFullReport(analysisId)
      .then(r => setReport(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Erro ao carregar laudo'))
      .finally(() => setLoading(false))
  }, [analysisId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Carregando laudo...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <Link to="/app" className="text-blue-700 text-sm hover:underline">Voltar ao início</Link>
      </div>
    </div>
  )

  const irregularidades = report?.irregularidades || []
  const waMsg = `Olá! Recebi meu laudo técnico (análise nº ${analysisId}) e gostaria de saber mais sobre a ação revisional.`
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-gray-400 hover:text-gray-600 text-sm">← Minhas análises</Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <span className="text-blue-900 font-bold hidden sm:block">⚖️ Juros Abusivos IA</span>
          </div>
          <a
            href={getReportDownloadUrl(analysisId)}
            target="_blank" rel="noreferrer"
            className="bg-blue-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800 transition"
          >
            ⬇️ Baixar PDF
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Título */}
        <div className="bg-blue-900 rounded-2xl p-6 text-white">
          <h1 className="text-xl font-bold mb-1">Laudo Técnico de Análise de Contrato</h1>
          <p className="text-blue-200 text-sm">{report.loan_type_label} • Emitido em {new Date(report.completed_at || Date.now()).toLocaleDateString('pt-BR')}</p>
        </div>

        {/* Aviso legal */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <p className="font-semibold mb-1">⚖️ Aviso importante</p>
          <p>Este laudo é de natureza <strong>técnico-matemática</strong>. A interpretação jurídica e o ajuizamento de ação revisional devem ser realizados por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94).</p>
        </div>

        {/* Dados do contrato */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-800 mb-4">📋 Dados do contrato</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              ['Banco', report.banco_identificado],
              ['Nº Contrato', report.numero_contrato],
              ['Data', report.data_contrato],
              ['Valor liberado', report.valor_emprestimo],
              ['Taxa mensal', report.taxa_mensal],
              ['CET anual', report.cet_anual],
              ['Parcelas', `${report.numero_parcelas}x de ${report.valor_parcela}`],
              ['Total a pagar', report.valor_total_devido],
              ['Taxa média BCB', `${report.bcb_rate_pct?.toFixed(2)}% a.m.`],
            ].map(([label, val]) => val && (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800">{val || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Irregularidades */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-800 mb-4">🔍 Irregularidades identificadas ({irregularidades.length})</h2>
          {irregularidades.length === 0 ? (
            <p className="text-green-600 font-medium">✅ Nenhuma irregularidade identificada.</p>
          ) : (
            <div className="space-y-4">
              {irregularidades.map((irr, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${irr.gravidade === 'alta' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{irr.tipo}</h3>
                    <GravidadeBadge g={irr.gravidade} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{irr.descricao}</p>
                  {irr.trecho_contrato && (
                    <p className="text-xs text-gray-500 italic bg-white rounded-lg p-2 border border-gray-100 mb-2">
                      "{irr.trecho_contrato}"
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs mt-2">
                    {irr.fundamento_legal && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">⚖️ {irr.fundamento_legal}</span>
                    )}
                    {irr.valor_cobrado && (
                      <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded">💰 {irr.valor_cobrado}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Impacto financeiro */}
        {report.impact_brl > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">💰 Impacto financeiro estimado</h2>
            <div className="bg-red-50 rounded-xl p-4 text-center mb-4">
              <p className="text-sm text-gray-500 mb-1">Cobrança excessiva estimada</p>
              <p className="text-4xl font-bold text-red-600">{fmt(report.impact_brl)}</p>
              <p className="text-xs text-gray-400 mt-1">acima da taxa média do Banco Central para esta modalidade</p>
            </div>
            <p className="text-xs text-gray-400">
              Metodologia: cálculo pelo Sistema Price (tabela de amortização francesa) comparando a taxa contratada ({report.taxa_mensal}) com a taxa média BCB ({report.bcb_rate_pct?.toFixed(2)}% a.m.). Somadas às cobranças identificadas como indevidas. Valores aproximados — cálculo exato deve ser realizado por perito contábil.
            </p>
          </div>
        )}

        {/* Resumo */}
        {(report.resumo_para_cliente || report.recomendacao) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-800 mb-4">📝 Conclusão</h2>
            {report.resumo_para_cliente && <p className="text-sm text-gray-600 mb-3">{report.resumo_para_cliente}</p>}
            {report.recomendacao && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Recomendação:</p>
                <p>{report.recomendacao}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA advogado */}
        <div className="bg-green-50 border border-green-300 rounded-2xl p-6 text-center">
          <p className="text-2xl mb-2">📱</p>
          <h3 className="font-bold text-green-800 text-lg mb-2">Fale com um advogado especializado</h3>
          <p className="text-green-700 text-sm mb-5">
            Este laudo identificou irregularidades no seu contrato. Um advogado especialista pode
            avaliar a viabilidade de uma ação revisional para reduzir os juros e recuperar os valores cobrados indevidamente.
          </p>
          <a
            href={waUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3.5 rounded-xl transition text-base"
          >
            💬 Falar com advogado no WhatsApp
          </a>
          <p className="text-xs text-green-600 mt-3">Atendimento especializado em ações revisionais</p>
        </div>

        {/* Download */}
        <div className="text-center pb-4">
          <a
            href={getReportDownloadUrl(analysisId)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-xl hover:border-gray-400 transition text-sm"
          >
            ⬇️ Baixar laudo em PDF
          </a>
        </div>
      </main>
    </div>
  )
}
