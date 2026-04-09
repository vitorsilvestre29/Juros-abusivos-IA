import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getHistory } from '../lib/api'

const STATUS_LABEL = {
  pending: { text: 'Aguardando', color: 'bg-yellow-100 text-yellow-800' },
  processing: { text: 'Analisando...', color: 'bg-blue-100 text-blue-800' },
  completed: { text: 'Concluído', color: 'bg-green-100 text-green-800' },
  failed: { text: 'Falhou', color: 'bg-red-100 text-red-800' },
}

function fmt(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Dashboard() {
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.clear()
    nav('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-blue-900 font-bold text-lg">⚖️ Juros Abusivos IA</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">Olá, {user.name?.split(' ')[0] || 'usuário'}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* CTA nova análise */}
        <div className="bg-blue-900 rounded-2xl p-6 text-white mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Analisar novo contrato</h2>
            <p className="text-blue-200 text-sm">Envie um contrato de empréstimo ou financiamento e receba o resultado em minutos.</p>
          </div>
          <button
            onClick={() => nav('/upload')}
            className="bg-white text-blue-900 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition whitespace-nowrap"
          >
            + Nova análise
          </button>
        </div>

        {/* Histórico */}
        <div>
          <h3 className="text-gray-800 font-semibold text-lg mb-4">Suas análises</h3>

          {loading && (
            <div className="text-center py-16 text-gray-400">Carregando...</div>
          )}

          {!loading && history.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-500 font-medium">Nenhuma análise ainda</p>
              <p className="text-gray-400 text-sm mt-1">Clique em "Nova análise" para começar</p>
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className="space-y-3">
              {history.map(item => {
                const st = STATUS_LABEL[item.analysis_status] || STATUS_LABEL.pending
                return (
                  <div
                    key={item.contract_id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition cursor-pointer"
                    onClick={() => {
                      if (item.analysis_id) {
                        if (item.paid) nav(`/laudo/${item.analysis_id}`)
                        else if (item.analysis_status === 'completed') nav(`/analise/${item.contract_id}`)
                        else nav(`/analise/${item.contract_id}`)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.filename}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.loan_type_label} • {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.paid && (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">✅ Pago</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>{st.text}</span>
                      </div>
                    </div>
                    {item.analysis_status === 'completed' && item.has_issues && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
                        <span className="text-red-600 font-semibold">⚠️ Irregularidades encontradas</span>
                        {item.impact_brl > 0 && (
                          <span className="text-gray-500">Impacto estimado: <strong className="text-red-600">{fmt(item.impact_brl)}</strong></span>
                        )}
                      </div>
                    )}
                    {item.analysis_status === 'completed' && !item.has_issues && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-green-600 font-medium">
                        ✅ Nenhuma irregularidade encontrada
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
