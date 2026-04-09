import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs sm:text-sm bg-white/10 border border-white/10 text-blue-50 px-3 py-2 rounded-full">
      <Icon className="w-4 h-4" />
      {children}
    </span>
  )
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all">
      <div className="w-11 h-11 rounded-2xl bg-[#003366]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#003366]" />
      </div>
      <h3 className="font-bold text-gray-900 mt-4">{title}</h3>
      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-2xl bg-[#003366] text-white flex items-center justify-center font-extrabold">
        {n}
      </div>
      <div>
        <div className="font-bold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [active, setActive] = useState('contratos')

  const useCases = useMemo(
    () => [
      {
        id: 'contratos',
        label: 'Contratos bancários',
        title: 'Análise rápida, segura e rastreável',
        bullets: [
          'Detecte juros abusivos, CET elevado, seguro prestamista e tarifas indevidas.',
          'Extração automática de dados do cliente a partir do PDF.',
          'Resumo pronto para orientar o próximo passo (parecer, procuração, petição).',
        ],
      },
      {
        id: 'produtividade',
        label: 'Produtividade no escritório',
        title: 'Padronização que escala com o time',
        bullets: [
          'Chat por caso com histórico completo e contexto do contrato.',
          'Geração de documentos com linguagem formal e fundamentos jurídicos.',
          'Fluxo guiado para reduzir retrabalho e acelerar entregas.',
        ],
      },
      {
        id: 'controle',
        label: 'Controle de custos',
        title: 'Previsibilidade de IA no mês',
        bullets: [
          'Budget mensal em USD + limite de casos para proteção anti-abuso.',
          'Custo real por usuário e por caso, com painel de margem.',
          'Alerte uso alto antes de virar problema.',
        ],
      },
    ],
    []
  )

  const activeCase = useCases.find((u) => u.id === active) || useCases[0]

  useEffect(() => {
    const i = setInterval(() => {
      setActive((prev) => {
        const idx = useCases.findIndex((u) => u.id === prev)
        const next = (idx + 1) % useCases.length
        return useCases[next].id
      })
    }, 7000)
    return () => clearInterval(i)
  }, [useCases])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001428] via-[#002855] to-[#003366]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[#001428]/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white"
            aria-label="Portal Jurídico AI"
          >
            <span className="bg-white/10 rounded-xl p-2">
              <Scale className="w-5 h-5" />
            </span>
            <span className="font-semibold tracking-tight">Portal Jurídico AI</span>
          </button>

          <nav className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => navigate('/planos')}
              className="text-sm text-blue-100 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              Planos
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm bg-white text-[#003366] font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Entrar
            </button>
          </nav>

          <div className="sm:hidden flex items-center gap-2">
            <button
              onClick={() => navigate('/planos')}
              className="text-xs text-blue-100 px-3 py-2 rounded-lg bg-white/10 border border-white/10"
            >
              Planos
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs bg-white text-[#003366] font-semibold px-3 py-2 rounded-lg"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-blue-50 text-xs font-semibold px-3 py-2 rounded-full">
              <Sparkles className="w-4 h-4" />
              Automação jurídica com IA, do jeito certo
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-5 leading-[1.05]">
              Mais velocidade no atendimento.
              <span className="text-blue-200"> Menos risco no conteúdo.</span>
            </h1>
            <p className="text-blue-200 mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
              O Portal Jurídico AI organiza seu fluxo por caso: conversa, contrato em PDF, análise técnica e
              geração de documentos. Tudo com controle de custos e previsibilidade mensal.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#003366] font-semibold px-5 py-3 rounded-2xl hover:bg-blue-50 transition-colors"
              >
                Acessar o portal
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/planos')}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold px-5 py-3 rounded-2xl transition-colors"
              >
                Ver planos
                <Zap className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Pill icon={ShieldCheck}>Budget mensal (IA) + limite de casos</Pill>
              <Pill icon={MessagesSquare}>Chat por caso com histórico</Pill>
              <Pill icon={FileText}>Documentos gerados em minutos</Pill>
            </div>
          </div>

          {/* Painel interativo */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {useCases.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setActive(u.id)}
                  className={`text-xs sm:text-sm px-4 py-2 rounded-xl border transition-colors ${
                    active === u.id
                      ? 'bg-white text-[#003366] border-white'
                      : 'bg-transparent text-blue-100 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-white font-extrabold text-xl">{activeCase.title}</h3>
              <ul className="mt-4 space-y-3 text-blue-100 text-sm">
                {activeCase.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-200 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 bg-white rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  Resultado esperado
                </div>
                <div className="text-sm text-gray-800 mt-2 leading-relaxed">
                  Um fluxo padronizado que reduz retrabalho, acelera entregas e melhora a qualidade do conteúdo —
                  com previsibilidade de custos de IA.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Um fluxo completo, pronto para o seu escritório
            </h2>
            <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
              Tudo organizado por caso, do primeiro contato ao documento final — com camadas de segurança e
              controle de custo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
            <FeatureCard
              icon={FileText}
              title="Contratos em PDF"
              desc="Faça upload do contrato. O sistema extrai texto (e usa visão quando necessário) para análises mais robustas."
            />
            <FeatureCard
              icon={MessagesSquare}
              title="Chat por caso"
              desc="Converse com o assistente no contexto do caso e dos contratos já analisados, com histórico persistente."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Controle financeiro"
              desc="Budget mensal em USD + limite por casos para manter previsibilidade e proteger o negócio."
            />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Comece em 3 passos
            </h2>
            <p className="text-gray-600 mt-3">
              Rápido de adotar, fácil de operar no dia a dia.
            </p>

            <div className="mt-8 space-y-6">
              <Step
                n="1"
                title="Crie um caso"
                desc="Inicie um atendimento e defina o tipo do caso (CLT, Bancário Direto ou Saúde)."
              />
              <Step
                n="2"
                title="Envie o contrato"
                desc="Faça upload do PDF para análise automática e extração de dados do cliente."
              />
              <Step
                n="3"
                title="Gere os documentos"
                desc="Produza Parecer, Procuração e Petição com base nas irregularidades e fundamentos."
              />
            </div>

            <div className="mt-9 flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/planos')}
                className="btn-secondary rounded-2xl px-5 py-3"
              >
                Ver planos
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary rounded-2xl px-5 py-3"
              >
                Entrar no portal
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#001428] via-[#002855] to-[#003366] rounded-3xl p-8 text-white border border-white/10">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              Segurança & previsibilidade
            </div>
            <h3 className="text-2xl font-extrabold mt-3">Conteúdo consistente, com custo controlado</h3>
            <p className="text-blue-200 mt-3 leading-relaxed">
              Você controla o ritmo do mês com limites objetivos: casos/mês e budget de IA. O sistema mostra uso,
              saldo e alertas quando a operação exige atenção.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, t: 'Budget mensal de IA', d: 'Evita surpresas e protege margem.' },
                { icon: Zap, t: 'Limite por casos', d: 'Bloqueia criação abusiva de casos vazios.' },
                { icon: FileText, t: 'Documentos prontos', d: 'Parecer, procuração e petição.' },
                { icon: Scale, t: 'Padrões jurídicos', d: 'Fundamentos e checklist integrados.' },
              ].map((c) => (
                <div key={c.t} className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <c.icon className="w-4 h-4 text-blue-100" />
                    <div className="font-semibold">{c.t}</div>
                  </div>
                  <div className="text-sm text-blue-200 mt-2">{c.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#001428]/40">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-blue-100">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="bg-white/10 rounded-xl p-2">
                <Scale className="w-4 h-4" />
              </span>
              Portal Jurídico AI
            </div>
            <div className="text-xs text-blue-200 mt-2">
              Automação jurídica com IA para contratos, chat por caso e geração de documentos.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/planos')}
              className="text-sm text-blue-100 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              Planos
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm bg-white text-[#003366] font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Entrar
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

