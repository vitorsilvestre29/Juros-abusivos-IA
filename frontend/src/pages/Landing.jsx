import { Link } from 'react-router-dom'

const steps = [
  {
    title: 'Envie seu contrato',
    desc: 'Upload de PDF ou imagem para leitura automatica da operacao de credito.',
  },
  {
    title: 'Analise tecnica automatizada',
    desc: 'Comparacao com referencias de mercado e deteccao de cobrancas potencialmente abusivas.',
  },
  {
    title: 'Receba o laudo preliminar',
    desc: 'Documento tecnico com achados matematicos e orientacao para proximo passo com advogado.',
  },
]

const bullets = [
  'Taxa contratada x media de mercado (BCB)',
  'Deteccao de juros capitalizados de forma indevida',
  'Mapeamento de tarifas e seguros potencialmente indevidos',
  'Estimativa de impacto financeiro em minutos',
]

export default function Landing() {
  return (
    <div className="site-shell">
      <header className="top-nav">
        <div className="container-app h-16 flex items-center justify-between">
          <div className="font-['Playfair_Display'] text-2xl font-bold text-[#c9952a]">Juros Abusivos IA</div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary px-4 py-2 text-sm">Entrar</Link>
            <Link to="/cadastro" className="btn-accent px-4 py-2 text-sm">Criar conta</Link>
          </div>
        </div>
      </header>

      <section className="container-app py-14 sm:py-20 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <span className="tag">Laudo tecnico para credito bancario</span>
          <h1 className="mt-4 font-['Playfair_Display'] text-4xl sm:text-5xl leading-tight font-bold text-[#0c1a2e]">
            Descubra se seu contrato tem
            <span className="text-[#b6831f]"> cobrancas abusivas</span>
          </h1>
          <p className="mt-4 muted text-base sm:text-lg leading-relaxed max-w-xl">
            Plataforma digital para analise tecnica de emprestimos e financiamentos com foco em abusividade,
            comparacao com referencias de mercado e geracao de relatorio preliminar para avaliacao juridica.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/cadastro" className="btn-accent">Analisar meu contrato</Link>
            <Link to="/login" className="btn-primary">Acessar conta</Link>
          </div>

          <p className="mt-4 text-sm text-[#6f7b88]">Cadastro gratuito. Relatorio completo liberado apos pagamento.</p>
        </div>

        <div className="surface-dark p-6 sm:p-8">
          <h2 className="font-['Playfair_Display'] text-2xl font-bold">O que o sistema verifica</h2>
          <div className="mt-4 space-y-3 text-sm text-[#d3dce8]">
            {bullets.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#c9952a]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-[#c7d3e3]">
            Resultado em poucos minutos com linguagem clara, base tecnica e rastreabilidade dos achados.
          </div>
        </div>
      </section>

      <section className="container-app pb-14 sm:pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step, idx) => (
            <div key={step.title} className="surface-card p-6">
              <div className="text-xs font-bold tracking-wider text-[#b6831f]">ETAPA {idx + 1}</div>
              <h3 className="mt-2 text-lg font-bold text-[#0c1a2e]">{step.title}</h3>
              <p className="mt-2 text-sm muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-app pb-14 sm:pb-20">
        <div className="legal-box">
          <strong>Aviso legal:</strong> esta plataforma emite laudo tecnico com apontamentos matematicos e
          contratuais. Interpretacao juridica e eventual acao revisional devem ser conduzidas por advogado
          regularmente inscrito na OAB.
        </div>
      </section>
    </div>
  )
}
