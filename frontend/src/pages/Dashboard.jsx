import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory } from '../lib/api'

const STATUS_LABEL = {
  pending: 'Aguardando',
  processing: 'Processando',
  completed: 'Concluida',
  failed: 'Falha',
}

const STATUS_COLOR = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function fmtMoney(value) {
  if (value === null || value === undefined) return '--'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function Dashboard() {
  const nav = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.removeItem('token')
    nav('/')
  }

  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between">
          <Link to="/" className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Juros Abusivos IA</Link>
          <div className="flex items-center gap-2">
            <Link to="/upload" className="btn-accent px-4 py-2 text-sm">+ Nova analise</Link>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container-app py-10">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="section-title">Painel de analises</h1>
          <p className="muted">Acompanhe o status dos contratos enviados e acesse seus laudos.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="stat-card">
            <div className="text-xs uppercase tracking-wide text-[#7e8a98]">Total de contratos</div>
            <div className="mt-1 text-2xl font-bold text-[#0c1a2e]">{history.length}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs uppercase tracking-wide text-[#7e8a98]">Concluidos</div>
            <div className="mt-1 text-2xl font-bold text-[#0c1a2e]">{history.filter((i) => i.analysis_status === 'completed').length}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs uppercase tracking-wide text-[#7e8a98]">Com impacto</div>
            <div className="mt-1 text-2xl font-bold text-[#0c1a2e]">{history.filter((i) => Number(i.impact_brl) > 0).length}</div>
          </div>
        </div>

        {loading ? <div className="surface-card p-10 text-center muted">Carregando historico...</div> : null}

        {!loading && history.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <div className="text-5xl">📄</div>
            <h2 className="mt-3 text-2xl font-['Playfair_Display'] font-bold text-[#0c1a2e]">Nenhuma analise ainda</h2>
            <p className="mt-2 muted">Envie seu primeiro contrato para iniciar o diagnostico.</p>
            <Link to="/upload" className="btn-primary mt-5">Enviar contrato</Link>
          </div>
        ) : null}

        {!loading && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <article key={item.contract_id} className="surface-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#374151]">{item.loan_type_label}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_COLOR[item.analysis_status] || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        {STATUS_LABEL[item.analysis_status] || item.analysis_status}
                      </span>
                      {item.paid ? <span className="text-xs px-2.5 py-1 rounded-full border font-semibold bg-emerald-50 border-emerald-200 text-emerald-700">Pago</span> : null}
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-[#0c1a2e]">{item.filename}</h3>
                    <p className="mt-1 text-sm text-[#7e8a98]">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {Number(item.impact_brl) > 0 ? (
                      <div className="text-right">
                        <div className="text-xs text-[#7e8a98]">Impacto estimado</div>
                        <div className="text-xl font-bold text-[#8b1a1a]">{fmtMoney(item.impact_brl)}</div>
                      </div>
                    ) : null}

                    {item.paid && item.analysis_id ? (
                      <button className="btn-primary" onClick={() => nav(`/laudo/${item.analysis_id}`)}>Ver laudo</button>
                    ) : (
                      <button className="btn-secondary" onClick={() => nav(`/analise/${item.contract_id}`)}>
                        {item.analysis_status === 'completed' ? 'Ver resultado' : 'Acompanhar'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
