import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Scale,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import api from '../lib/api'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatCases(n) {
  try {
    return new Intl.NumberFormat('pt-BR').format(Number(n || 0))
  } catch {
    return String(n ?? '')
  }
}

function formatPriceBRL(price) {
  const p = Number(price || 0)
  return p <= 0 ? 'Grátis' : BRL.format(p)
}

function PlanCard({ plan, featured = false }) {
  const base =
    'rounded-3xl border bg-white shadow-sm p-7 flex flex-col h-full transition-all'
  const border = featured
    ? 'border-[#003366] shadow-md ring-1 ring-[#003366]/20'
    : 'border-gray-200 hover:shadow-md'

  const badge = featured ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#003366] text-white px-3 py-1 rounded-full">
      <Zap className="w-3.5 h-3.5" />
      Mais escolhido
    </span>
  ) : null

  const priceText = Number(plan?.price_brl || 0) <= 0 ? 'Grátis' : `${formatPriceBRL(plan?.price_brl)}/mês`

  return (
    <div className={`${base} ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">{plan?.label}</h3>
          {plan?.tagline ? <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p> : null}
        </div>
        {badge}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold text-gray-900 leading-none">{priceText}</div>
          <div className="text-xs text-gray-400 mt-1">casos/mês + budget de IA</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Casos</div>
          <div className="font-extrabold text-gray-900">{formatCases(plan?.limit_cases)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Budget IA (USD)</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">
            U$ {Number(plan?.budget_usd || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">controle de custo real</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Ideal para</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {plan?.tagline || 'Seu volume'}
          </div>
          <div className="text-xs text-gray-400 mt-1">perfil recomendado</div>
        </div>
      </div>

      {plan?.for_whom ? (
        <div className="mt-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Para quem serve</div>
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{plan.for_whom}</p>
        </div>
      ) : null}

      <div className="mt-5 pt-5 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inclui</div>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            'Análise de contrato (PDF) com IA',
            'Chat por caso com histórico',
            'Geração de Parecer, Procuração e Petição',
            'Controle de custo real por budget',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#003366]">
                <Check className="w-4 h-4" />
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <button className="w-full btn-primary rounded-2xl py-3 flex items-center justify-center gap-2">
          Escolher plano
          <ArrowRight className="w-4 h-4" />
        </button>
        <div className="text-xs text-gray-400 text-center mt-2">
          Ajuste de plano pode ser feito pelo admin a qualquer momento.
        </div>
      </div>
    </div>
  )
}

function CompareRow({ label, values, highlightIndex }) {
  return (
    <div className="grid grid-cols-4 gap-3 items-center py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-sm text-gray-600">{label}</div>
      {values.map((v, idx) => (
        <div
          key={`${label}-${idx}`}
          className={`text-sm font-semibold text-gray-900 text-center rounded-xl py-2 ${
            idx === highlightIndex
              ? 'bg-[#003366]/5 border border-[#003366]/10'
              : 'bg-gray-50 border border-gray-100'
          }`}
        >
          {v}
        </div>
      ))}
    </div>
  )
}

function FAQItem({ q, a }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start gap-3">
        <div className="bg-[#003366]/10 rounded-xl p-2">
          <HelpCircle className="w-4 h-4 text-[#003366]" />
        </div>
        <div>
          <div className="font-bold text-gray-900">{q}</div>
          <div className="text-sm text-gray-600 mt-2 leading-relaxed">{a}</div>
        </div>
      </div>
    </div>
  )
}

export default function Plans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/public/plans')
        if (!alive) return
        setPlans(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (!alive) return
        setError('Não foi possível carregar os planos agora. Tente novamente em instantes.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const featuredId = useMemo(() => 'intermediario', [])

  const top3 = useMemo(() => {
    const map = new Map(plans.map((p) => [p.id, p]))
    return ['basico', 'intermediario', 'profissional'].map((id) => map.get(id)).filter(Boolean)
  }, [plans])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001428] via-[#002855] to-[#003366]">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#001428]/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white/10 rounded-xl p-2">
              <Scale className="w-5 h-5" />
            </div>
            <span className="font-semibold">Portal Jurídico AI</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex items-center gap-2 text-sm bg-white text-[#003366] font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Entrar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-14">
        <div className="text-center text-white pt-10 pb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-blue-50 text-xs font-semibold px-3 py-2 rounded-full">
            <Sparkles className="w-4 h-4" />
            Planos e capacidade do portal
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 leading-tight">
            Escolha o plano ideal para seu volume mensal
          </h1>
          <p className="text-blue-200 mt-4 max-w-3xl mx-auto">
            Você tem previsibilidade porque controlamos <strong>casos/mês</strong> e também o{' '}
            <strong>budget real de IA</strong>. Assim você escala com segurança e mantém a margem saudável.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/10 px-3 py-2 rounded-full">
              <Shield className="w-4 h-4" />
              Proteção por budget (evita surpresas)
            </span>
            <span className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/10 px-3 py-2 rounded-full">
              <Zap className="w-4 h-4" />
              Limite por casos (anti-abuso)
            </span>
            <span className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/10 px-3 py-2 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              Upgrade/downgrade via admin
            </span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
          {loading ? (
            <div className="text-center text-blue-100 py-12">Carregando planos…</div>
          ) : error ? (
            <div className="text-center text-red-200 py-12">{error}</div>
          ) : plans.length === 0 ? (
            <div className="text-center text-blue-100 py-12">Nenhum plano disponível.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} featured={p.id === featuredId} />
              ))}
            </div>
          )}
        </div>

        {!loading && !error && top3.length === 3 && (
          <section className="mt-10">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-7 py-6 bg-gray-50 border-b border-gray-100">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Comparação rápida</div>
                <h2 className="text-2xl font-extrabold text-gray-900 mt-1">Básico vs Intermediário vs Profissional</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Se você está em dúvida, o <strong>Intermediário</strong> costuma ser o ponto ideal de custo-benefício.
                </p>
              </div>
              <div className="p-7">
                <div className="grid grid-cols-4 gap-3 items-center mb-3">
                  <div />
                  {top3.map((p) => (
                    <div
                      key={p.id}
                      className={`text-center font-extrabold ${p.id === featuredId ? 'text-[#003366]' : 'text-gray-900'}`}
                    >
                      {p.label}
                    </div>
                  ))}
                </div>

                <CompareRow
                  label="Preço (mês)"
                  values={top3.map((p) => formatPriceBRL(p.price_brl))}
                  highlightIndex={1}
                />
                <CompareRow label="Casos/mês" values={top3.map((p) => formatCases(p.limit_cases))} highlightIndex={1} />
                <CompareRow
                  label="Budget IA (USD)"
                  values={top3.map((p) => `U$ ${Number(p.budget_usd || 0).toFixed(2)}`)}
                  highlightIndex={1}
                />
              </div>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="text-white text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-blue-50 text-xs font-semibold px-3 py-2 rounded-full">
              <HelpCircle className="w-4 h-4" />
              Dúvidas frequentes
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-4">Como escolher sem erro</h2>
            <p className="text-blue-200 mt-3 max-w-3xl mx-auto">
              O limite principal é o budget de IA. O limite de casos é uma camada de proteção extra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <FAQItem
              q="Por que existe budget de IA?"
              a="Porque o custo real varia conforme tamanho do PDF e volume de mensagens. O budget garante previsibilidade e protege a operação."
            />
            <FAQItem
              q="Posso trocar de plano depois?"
              a="Sim. O admin pode mudar o plano a qualquer momento pelo painel, e o contador mensal é reiniciado na troca."
            />
            <FAQItem
              q="Qual plano costuma ter melhor custo-benefício?"
              a="O Intermediário tende a ser o ponto ideal: mais folga que o Básico sem pular direto para o Profissional."
            />
            <FAQItem
              q="Tem plano sob medida?"
              a="Sim. Para volumes muito altos ou necessidades específicas, dá para criar uma proposta personalizada."
            />
          </div>
        </section>

        <div className="text-center text-blue-200 text-xs mt-10">
          Precisa de um plano sob medida? Fale com o suporte para uma proposta personalizada.
        </div>
      </main>
    </div>
  )
}

