import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Menu,
  X,
  AlertTriangle,
  FileWarning,
  Landmark,
  Scale,
  FileText,
  Lock,
  Trash2,
  Info,
  Check,
  Plus,
  TrendingUp,
  Percent,
  Layers,
} from 'lucide-react'
import './Landing.css'

const steps = [
  { n: '01', title: 'Envie o contrato', desc: 'Faca upload do PDF ou foto do contrato de emprestimo ou financiamento.' },
  { n: '02', title: 'Analise especializada', desc: 'Nosso sistema verifica clausulas, taxas e compara com as medias do Banco Central.' },
  { n: '03', title: 'Acesse o laudo', desc: 'Pague o laudo tecnico completo e leve para um advogado especializado.' },
]

const issues = [
  'Juros acima da media do Banco Central',
  'Capitalizacao indevida de juros (anatocismo)',
  'Tarifas nao autorizadas pelo BCB',
  'Seguro prestamista abusivo',
  'Comissao de permanencia irregular',
  'Spread bancario excessivo',
  'Cobranca de IOF irregular',
  'Multas e encargos em duplicidade',
]

const methodology = [
  { icon: Landmark, text: 'Comparacao com as taxas medias divulgadas pelo Banco Central do Brasil (serie historica publica).' },
  { icon: Scale, text: 'Fundamentacao em jurisprudencia do STJ sobre limitacao de juros e capitalizacao (Sumula 566, REsp 1.061.530/RS).' },
  { icon: FileText, text: 'Laudo tecnico em PDF, com citacao de fonte em cada apontamento identificado.' },
  { icon: ShieldCheck, text: 'Conformidade com a LGPD - dados tratados sob a base legal de execucao de contrato.' },
]

const features = [
  { icon: Percent, title: 'Taxas comparadas com o BCB', desc: 'Consultamos as taxas medias de mercado diretamente da API do Banco Central, atualizadas periodicamente.' },
  { icon: Scale, title: 'Baseado em jurisprudencia real', desc: 'A analise usa Sumula 566 STJ, REsp 1.061.530/RS e as Resolucoes BCB vigentes como referencia.' },
  { icon: FileText, title: 'Laudo em PDF profissional', desc: 'Documento tecnico completo, pronto para ser apresentado a um advogado para acao revisional.' },
  { icon: Lock, title: 'Privacidade garantida (LGPD)', desc: 'Seus dados e documentos sao protegidos conforme a Lei Geral de Protecao de Dados.' },
]

const signals = [
  { icon: TrendingUp, text: 'A taxa de juros do seu contrato parece muito acima da media do tipo de credito contratado.' },
  { icon: Layers, text: 'Ha cobranca de tarifas cumulativas cujo detalhamento nao ficou claro no momento da contratacao.' },
  { icon: AlertTriangle, text: 'O contrato preve capitalizacao de juros que voce nao lembra de ter autorizado explicitamente.' },
  { icon: FileWarning, text: 'Voce nunca comparou as condicoes do seu contrato com as taxas medias publicadas pelo Banco Central.' },
]

const lgpdCards = [
  { icon: Lock, title: 'Dados criptografados', desc: 'Transmissao com criptografia TLS em todas as comunicacoes.' },
  { icon: X, title: 'Zero venda de dados', desc: 'Nunca vendemos ou compartilhamos seus dados com terceiros.' },
  { icon: Trash2, title: 'Exclusao garantida', desc: 'Documentos excluidos automaticamente em 90 dias.' },
  { icon: Scale, title: 'Direitos assegurados', desc: 'Acesso, correcao e exclusao garantidos pela LGPD.' },
]

const ctaItems = [
  'Irregularidades com fundamento legal',
  'Calculo do valor cobrado a mais',
  'Comparacao com taxas BCB ao vivo',
  'PDF pronto para o advogado',
  'Orientacao para acao revisional',
  'Acesso imediato via PIX',
]

const navItems = [
  { to: '/comparador', label: 'Comparador' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/blog', label: 'Blog' },
]

const faq = [
  {
    q: 'O laudo substitui um advogado?',
    a: 'Nao. O laudo e um documento tecnico-matematico com carater informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser feitos exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94).',
  },
  {
    q: 'Como voces calculam se a taxa e abusiva?',
    a: 'Comparamos a taxa de juros do seu contrato com as taxas medias divulgadas pelo Banco Central para a mesma modalidade de credito e periodo, e aplicamos entendimentos consolidados do STJ (como a Sumula 566 e o REsp 1.061.530/RS).',
  },
  {
    q: 'Voces usam dados oficiais do Banco Central?',
    a: 'Sim. As taxas medias de mercado usadas na comparacao vem diretamente da API publica do Banco Central do Brasil.',
  },
  {
    q: 'Preciso me cadastrar para analisar meu contrato?',
    a: 'Nao e obrigatorio criar conta para enviar o contrato e receber a analise inicial. O laudo tecnico completo em PDF e liberado apos o pagamento.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'O pagamento do laudo completo e unico, via PIX, sem mensalidade e sem cadastro de cartao.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Operamos em conformidade com a LGPD, usamos criptografia TLS em todas as comunicacoes e excluimos os documentos automaticamente em 90 dias.',
  },
  {
    q: 'Em quanto tempo recebo o laudo?',
    a: 'A analise tecnica e feita em minutos apos o envio do contrato. O laudo completo em PDF fica disponivel logo apos a confirmacao do pagamento.',
  },
  {
    q: 'O laudo tem validade juridica e pode ser usado em processo?',
    a: 'O laudo tem natureza tecnico-matematica e carater informativo, servindo como base para um advogado avaliar e conduzir uma eventual acao revisional - ele nao substitui a analise e a atuacao de um profissional habilitado.',
  },
]

function buildJsonLd() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Visorm',
    legalName: 'Visorm',
    description: 'Empresa responsavel pela plataforma LaudoJuros, de analise tecnica de contratos de credito.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Barretos',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    taxID: '66.430.538/0001-44',
  }

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Laudo Tecnico de Analise de Juros',
    name: 'LaudoJuros',
    provider: {
      '@type': 'Organization',
      name: 'Visorm',
    },
    areaServed: 'BR',
    inLanguage: 'pt-BR',
    offers: {
      '@type': 'Offer',
      price: '4.99',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
    },
  }

  return [faqSchema, organizationSchema, productSchema]
}

export default function Landing() {
  const nav = useNavigate()
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const jsonLd = useRef(buildJsonLd())

  useEffect(() => {
    function handleScroll() {
      setNavScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleStartAnalysis() {
    setMobileMenuOpen(false)
    nav('/upload')
  }

  return (
    <div className="landingPage">
      {jsonLd.current.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Barra LGPD */}
      <div className="lgpdBar">
        <ShieldCheck size={15} strokeWidth={2} color="#A8D5A2" />
        <p>
          Seus dados sao protegidos pela <strong>LGPD (Lei 13.709/2018)</strong>. Documentos excluidos automaticamente em 90 dias.{' '}
          <Link to="/privacidade">Saiba mais</Link>
        </p>
      </div>

      {/* Nav */}
      <nav className={`nav ${navScrolled ? 'navScrolled' : ''}`}>
        <div className="navInner">
          <span className="logo">LaudoJuros</span>
          <div className="navRight">
            <div className="navLinks">
              {navItems.map(item => (
                <Link key={item.to} to={item.to} className="navLink">
                  {item.label}
                </Link>
              ))}
            </div>
            <Link to="/login" className="navEntrar">Entrar</Link>
            <button onClick={handleStartAnalysis} className="navCta">
              Comecar agora
            </button>
            <button
              type="button"
              className="navToggle"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(open => !open)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <div className={`navMobilePanel ${mobileMenuOpen ? 'navMobileOpen' : ''}`}>
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className="navLink" onClick={() => setMobileMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="heroDecor" />
        <div className="heroInner">
          <div className="heroCopy">
            <div className="heroPill">
              <span>Analise Tecnica Especializada</span>
            </div>
            <h1 className="heroTitle">
              Seu contrato tem<br /><span>juros abusivos?</span>
            </h1>
            <p className="heroLead">
              Nosso sistema cruza seu contrato com as taxas reais do Banco Central e jurisprudencia do STJ para identificar cobrancas indevidas em minutos.
            </p>
            <p className="heroSub">
              Identificamos irregularidades, comparamos com as taxas do Banco Central e geramos um laudo tecnico completo.
            </p>
            <div className="heroCtaRow">
              <button onClick={handleStartAnalysis} className="heroBtnPrimary">
                Analisar meu contrato
              </button>
              <div className="priceCard">
                <span className="priceOld">R$ 9,99</span>
                <span className="priceNew">R$ 4,99</span>
                <span className="priceTag">Preco de lancamento</span>
              </div>
            </div>
            <div className="disclaimerBox">
              <Info size={16} />
              <p>
                <strong>Aviso legal:</strong> Os laudos gerados por esta plataforma sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94). A plataforma nao presta consultoria juridica.
              </p>
            </div>
          </div>

          <div className="heroVisual">
            <div className="laudoPreview">
              <div className="laudoPreviewLabel">Ilustracao do laudo - dados ficticios</div>
              <div className="laudoPreviewHeader">
                <span className="kicker">Laudo tecnico de analise de juros</span>
                <h4>Contrato: Banco Exemplo S.A.</h4>
              </div>
              <div className="laudoPreviewBody">
                <div className="laudoRateRow">
                  <span className="laudoRateLabel">Taxa contratada (a.m.)</span>
                  <span className="laudoRateValue alert">7,80%</span>
                </div>
                <div className="laudoRateRow">
                  <span className="laudoRateLabel">Taxa media BCB (mesmo periodo)</span>
                  <span className="laudoRateValue">3,95%</span>
                </div>
                <div className="laudoRateRow">
                  <span className="laudoRateLabel">Modalidade</span>
                  <span className="laudoRateValue">Credito pessoal (ilustrativo)</span>
                </div>
                <div className="laudoClause">
                  <p>
                    <strong>Apontamento:</strong> indicio de capitalizacao de juros nao expressamente pactuada (anatocismo), conforme Sumula 566/STJ. Exemplo ilustrativo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="section containerNarrow">
        <div className="sectionHead">
          <span className="eyebrow">Como funciona</span>
          <h2>Simples e rapido</h2>
        </div>
        <div className="stepsGrid">
          {steps.map(s => (
            <div key={s.n} className="stepCard">
              <div className="stepNumber">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* O que identificamos */}
      <section className="section issuesSection">
        <div className="containerNarrow">
          <div className="sectionHead sectionHeadLight">
            <span className="eyebrow">Cobertura completa</span>
            <h2>O que nossa analise identifica</h2>
            <p className="sectionLead" style={{ color: '#7E9BB5' }}>
              Cobrimos as principais formas de abusividade em contratos de credito, com base na jurisprudencia do STJ e nas resolucoes do Banco Central.
            </p>
          </div>
          <div className="issuesGrid">
            {issues.map(issue => (
              <div key={issue} className="issuePill">
                <AlertTriangle size={16} strokeWidth={2} />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metodologia / confianca */}
      <section className="section containerNarrow">
        <div className="sectionHead">
          <span className="eyebrow">Metodologia</span>
          <h2>Uma analise que voce pode conferir</h2>
          <p className="sectionLead">
            Nenhum numero da nossa analise sai do nada - tudo e comparavel com fontes oficiais e publicas.
          </p>
        </div>
        <div className="methodGrid">
          {methodology.map(item => (
            <div key={item.text} className="methodCard">
              <item.icon size={20} strokeWidth={2} />
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nossa diferenca */}
      <section className="section containerNarrow">
        <div className="sectionHead">
          <span className="eyebrow">Por que usar</span>
          <h2>Nossa diferenca</h2>
        </div>
        <div className="diffGrid">
          {features.map(feature => (
            <div key={feature.title} className="diffCard">
              <feature.icon size={26} strokeWidth={1.75} />
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quando vale a pena verificar */}
      <section className="section signalsSection">
        <div className="containerNarrow">
          <div className="sectionHead">
            <span className="eyebrow">Sinais de alerta</span>
            <h2>Quando vale a pena verificar seu contrato</h2>
            <p className="sectionLead">
              Alguns sinais objetivos costumam indicar que vale a pena revisar as condicoes do seu contrato de credito.
            </p>
          </div>
          <div className="signalsGrid">
            {signals.map(item => (
              <div key={item.text} className="signalCard">
                <item.icon size={20} strokeWidth={2} />
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secao verde LGPD */}
      <section className="section lgpdSection">
        <div className="containerNarrow" style={{ textAlign: 'center' }}>
          <div className="lgpdBadge">
            <ShieldCheck size={15} strokeWidth={2} />
            <span>LGPD</span>
          </div>
          <h2 style={{ marginBottom: 12, color: 'var(--navy-800)' }}>Seus dados protegidos por lei</h2>
          <p className="sectionLead" style={{ margin: '0 auto 40px', maxWidth: 560 }}>
            Operamos em total conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018). Sua privacidade nao e opcional.
          </p>
          <div className="lgpdGrid">
            {lgpdCards.map(item => (
              <div key={item.title} className="lgpdCard">
                <item.icon size={20} strokeWidth={2} />
                <p>{item.title}</p>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/privacidade" className="btnSecondary">
            Ler nossa Politica de Privacidade completa
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="section containerNarrow">
        <div className="sectionHead">
          <span className="eyebrow">Duvidas</span>
          <h2>Perguntas frequentes</h2>
        </div>
        <div className="faqList">
          {faq.map(item => (
            <details key={item.q} className="faqItem">
              <summary>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>{item.q}</h3>
                <Plus size={18} className="faqIcon" strokeWidth={2.5} />
              </summary>
              <p className="faqAnswer">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="section ctaFinal">
        <div className="container" style={{ maxWidth: 600 }}>
          <h2>Pronto para verificar seu contrato?</h2>
          <p>Sem cadastro obrigatorio. Envie o contrato e receba o resultado.</p>
          <div className="ctaPriceTag">
            <span style={{ color: 'var(--navy-900)', fontSize: 13, fontWeight: 700 }}>Pagamento unico e transparente - </span>
            <span style={{ textDecoration: 'line-through', color: 'rgba(13,33,55,0.5)', fontSize: 14, marginRight: 6 }}>R$ 9,99</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800, color: 'var(--navy-900)' }}>R$ 4,99</span>
            <span style={{ color: 'var(--navy-900)', fontSize: 12, fontWeight: 600 }}> pelo laudo completo</span>
          </div>
          <div className="ctaChecklist">
            {ctaItems.map(item => (
              <div key={item} className="ctaChecklistItem">
                <div className="ctaCheckIcon">
                  <Check size={11} strokeWidth={3} />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button onClick={handleStartAnalysis} className="ctaBtn">
            Comecar agora
          </button>
          <p className="ctaFootnote">
            <Lock size={13} strokeWidth={2} />
            Sem cadastro. Pagamento seguro via PIX.
          </p>
        </div>
      </section>

      {/* Rodape */}
      <footer className="footer">
        <div className="footerGrid">
          <div className="footerBrand">
            <span className="logo">LaudoJuros</span>
            <p>Plataforma de analise tecnica de contratos de credito, com base nas taxas do Banco Central e na jurisprudencia do STJ.</p>
          </div>
          <div className="footerCol">
            <h4>Navegacao</h4>
            <Link to="/comparador">Comparador</Link>
            <Link to="/ranking">Ranking</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/privacidade">Privacidade (LGPD)</Link>
          </div>
          <div className="footerCol footerLegal">
            <h4>Identidade legal</h4>
            <p>
              Visorm - Vitor Cesar dos Santos Silvestre (MEI)<br />
              CNPJ 66.430.538/0001-44<br />
              Barretos/SP
            </p>
          </div>
        </div>
        <div className="footerBottom">
          <p>
            {String.fromCharCode(169)} {new Date().getFullYear()} LaudoJuros - Plataforma de analise tecnica de contratos de credito
          </p>
        </div>
      </footer>
    </div>
  )
}
