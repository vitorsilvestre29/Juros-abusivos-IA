import { Link, useNavigate } from 'react-router-dom'
import { startGuestSession } from '../lib/api'

const steps = [
  { n: '01', title: 'Envie o contrato', desc: 'Faca upload do PDF ou foto. Aceitamos qualquer tipo de contrato de emprestimo ou financiamento.' },
  { n: '02', title: 'IA analisa ao vivo', desc: 'Cruzamos seu contrato com as taxas reais do Banco Central e jurisprudencia do STJ em tempo real.' },
  { n: '03', title: 'Laudo tecnico completo', desc: 'Receba o documento pronto para apresentar a um advogado e iniciar a revisao contratual.' },
]

const issues = [
  { text: 'Juros acima da media do Banco Central' },
  { text: 'Capitalizacao indevida de juros (anatocismo)' },
  { text: 'Tarifas nao autorizadas pelo BCB' },
  { text: 'Seguro prestamista abusivo' },
  { text: 'Comissao de permanencia irregular' },
  { text: 'Spread bancario excessivo' },
  { text: 'Cobranca de IOF irregular' },
  { text: 'Multas e encargos em duplicidade' },
]

const features = [
  { title: 'Taxas consultadas ao vivo', desc: 'Buscamos as taxas medias diretamente da API do Banco Central (BCB/SGS) a cada analise. Nenhum numero estatico.' },
  { title: 'Jurisprudencia STJ real', desc: 'A analise usa Sumula 566 STJ, REsp 1.061.530/RS e as Resolucoes BCB vigentes como referencia legal.' },
  { title: 'Laudo PDF profissional', desc: 'Documento tecnico completo, pronto para ser apresentado a um advogado para acao revisional.' },
  { title: 'Privacidade LGPD', desc: 'Seus dados e documentos sao protegidos conforme a Lei Geral de Protecao de Dados Pessoais.' },
]

const stats = [
  { val: '8', label: 'tipos de abusividade' },
  { val: 'R$9,99', label: 'laudo completo' },
  { val: '100%', label: 'dados BCB ao vivo' },
]

const G = {
  bg: '#F7F5F0',
  dark: '#0E1117',
  darkMid: '#161B27',
  gold: '#C9A84C',
  goldLight: '#E2C06B',
  goldPale: '#F5EDD3',
  goldBorder: 'rgba(201,168,76,0.25)',
  text: '#1C1C28',
  muted: '#6B7280',
  mutedDark: '#9CA3AF',
  white: '#FFFFFF',
  cream: '#FAF8F3',
  red: '#C0392B',
}

const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

export default function Landing() {
  const nav = useNavigate()

  async function handleStart() {
    const hasToken = localStorage.getItem('token')
    if (hasToken) { nav('/upload'); return }
    try {
      const res = await startGuestSession()
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: true }))
      nav('/upload')
    } catch { nav('/upload') }
  }

  return (
    <div style={{ fontFamily: sans, background: G.bg, minHeight: '100vh', color: G.text }}>

      {/* ANNOUNCEMENT BAR */}
      <div style={{ background: G.gold, padding: '9px 24px', textAlign: 'center' }}>
        <p style={{ color: G.dark, fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: 0.3 }}>
          Analise gratuita &mdash; pague apenas R$&nbsp;9,99 pelo laudo completo. Sem cadastro obrigatorio.
        </p>
      </div>

      {/* NAV */}
      <nav style={{ background: G.dark, position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: serif, color: G.gold, fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>
            Juros Abusivos
          </span>
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            {[['Comparador', '/comparador'], ['Ranking', '/ranking'], ['Blog', '/blog'], ['Entrar', '/login']].map(([label, href]) => (
              <Link key={label} to={href} style={{ color: G.mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '8px 14px', letterSpacing: 0.2 }}>
                {label}
              </Link>
            ))}
            <button onClick={handleStart} style={{ background: G.gold, color: G.dark, fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: sans, marginLeft: 8, letterSpacing: 0.3 }}>
              Analisar contrato
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: G.dark, padding: '100px 32px 96px', position: 'relative', overflow: 'hidden' }}>
        {/* subtle grid texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        {/* glow */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: `1px solid ${G.goldBorder}`, borderRadius: 4, padding: '6px 18px', marginBottom: 40, background: 'rgba(201,168,76,0.06)' }}>
            <div style={{ width: 6, height: 6, background: G.gold, borderRadius: '50%' }} />
            <span style={{ color: G.gold, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Analise Tecnica Especializada</span>
          </div>

          <h1 style={{ fontFamily: serif, color: G.white, fontSize: 'clamp(40px, 5.5vw, 70px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 28, letterSpacing: '-0.5px' }}>
            Seu contrato esconde<br />
            <span style={{ color: G.gold, fontStyle: 'italic' }}>juros abusivos?</span>
          </h1>

          <p style={{ color: G.mutedDark, fontSize: 18, lineHeight: 1.8, marginBottom: 48, maxWidth: 580, margin: '0 auto 48px' }}>
            Nossa IA cruza seu contrato com as taxas reais do Banco Central e jurisprudencia do STJ para identificar cobranças indevidas em minutos.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
            <button onClick={handleStart} style={{ background: G.gold, color: G.dark, fontWeight: 700, fontSize: 16, padding: '15px 36px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 24px rgba(201,168,76,0.3)', letterSpacing: 0.3 }}>
              Analisar meu contrato agora
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7.5" stroke="#374151"/><path d="M5 8l2 2 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color: '#4B5563', fontSize: 14 }}>Sem cadastro obrigatorio</span>
            </div>
          </div>

          {/* stats bar */}
          <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: `1px solid rgba(255,255,255,0.07)`, background: 'rgba(255,255,255,0.03)' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: '18px 36px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', textAlign: 'center' }}>
                <div style={{ fontFamily: serif, color: G.gold, fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{s.val}</div>
                <div style={{ color: '#4B5563', fontSize: 11, letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${G.gold}, transparent)` }} />

      {/* COMO FUNCIONA */}
      <section style={{ background: G.cream, padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: G.gold, fontSize: 11, fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Como funciona</p>
            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: G.text, marginBottom: 12, letterSpacing: '-0.3px' }}>Tres passos simples</h2>
            <p style={{ color: G.muted, fontSize: 16, maxWidth: 460, margin: '0 auto' }}>Para descobrir se voce esta pagando mais do que deveria</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, position: 'relative' }}>
            {/* connector */}
            <div style={{ position: 'absolute', top: 28, left: 'calc(16.6% + 16px)', right: 'calc(16.6% + 16px)', height: 1, background: `linear-gradient(90deg, ${G.gold}, rgba(201,168,76,0.15))`, zIndex: 0 }} />

            {steps.map((s, i) => (
              <div key={s.n} style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: i === 0 ? G.gold : G.white, border: i === 0 ? 'none' : `1px solid #E5E0D5`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: i === 0 ? '0 4px 20px rgba(201,168,76,0.35)' : '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                    <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 16, color: i === 0 ? G.dark : G.muted }}>{s.n}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>{s.title}</h3>
                </div>
                <div style={{ background: G.white, border: `1px solid #EAE5DC`, borderRadius: 12, padding: '24px 22px', boxShadow: '0 1px 8px rgba(28,28,40,0.05)' }}>
                  <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 52 }}>
            <button onClick={handleStart} style={{ background: G.dark, color: G.white, fontWeight: 600, fontSize: 15, padding: '13px 32px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: sans, letterSpacing: 0.2 }}>
              Comecar agora &mdash; sem cadastro
            </button>
          </div>
        </div>
      </section>

      {/* O QUE IDENTIFICAMOS */}
      <section style={{ background: G.darkMid, padding: '96px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: G.gold, fontSize: 11, fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Cobertura completa</p>
            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: G.white, marginBottom: 14, letterSpacing: '-0.3px' }}>O que nossa analise identifica</h2>
            <p style={{ color: '#4B5563', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>Todas as formas de abusividade, com base na jurisprudencia do STJ e nas resolucoes do Banco Central</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {issues.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 8, borderLeft: `3px solid ${G.gold}` }}>
                <div style={{ width: 8, height: 8, background: G.gold, borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section style={{ background: G.bg, padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: G.gold, fontSize: 11, fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Por que usar</p>
            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: G.text, letterSpacing: '-0.3px' }}>Nossa diferenca</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: G.white, border: `1px solid #EAE5DC`, borderRadius: 12, padding: '32px 28px', boxShadow: '0 2px 12px rgba(28,28,40,0.04)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${G.gold} 0%, rgba(201,168,76,0.2) 100%)` }} />
                <div style={{ width: 36, height: 36, background: G.goldPale, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <div style={{ width: 12, height: 12, background: G.gold, borderRadius: 2, transform: 'rotate(45deg)' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: G.text, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECO */}
      <section style={{ background: G.cream, padding: '0 32px 96px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ background: G.dark, borderRadius: 16, padding: '56px 52px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 60px rgba(14,17,23,0.5)' }}>
            {/* grid bg */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${G.gold}, ${G.goldLight}, ${G.gold})` }} />

            <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
              <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.1)', border: `1px solid ${G.goldBorder}`, borderRadius: 4, padding: '5px 14px', marginBottom: 24 }}>
                <span style={{ color: G.gold, fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Preco unico e transparente</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: G.mutedDark, fontSize: 22, marginTop: 12, fontWeight: 400 }}>R$</span>
                <span style={{ fontFamily: serif, fontSize: 80, fontWeight: 700, color: G.white, lineHeight: 1 }}>9,99</span>
              </div>
              <p style={{ color: G.mutedDark, fontSize: 14 }}>pagamento unico &mdash; laudo disponivel imediatamente</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36, position: 'relative' }}>
              {['Irregularidades com fundamento legal', 'Calculo do valor cobrado a mais', 'Comparacao com taxas BCB ao vivo', 'PDF pronto para o advogado', 'Orientacao para acao revisional', 'Acesso imediato via PIX'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="8" fill="rgba(201,168,76,0.15)"/>
                    <path d="M5 8l2 2 4-4" stroke={G.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ color: '#D1D5DB', fontSize: 13 }}>{item}</span>
                </div>
              ))}
            </div>

            <button onClick={handleStart} style={{ width: '100%', background: G.gold, color: G.dark, fontWeight: 700, fontSize: 16, padding: '15px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: sans, letterSpacing: 0.3, boxShadow: '0 4px 24px rgba(201,168,76,0.25)', position: 'relative' }}>
              Analisar meu contrato &mdash; R$&nbsp;9,99
            </button>
            <p style={{ textAlign: 'center', color: '#4B5563', fontSize: 12, marginTop: 14 }}>
              Sem cadastro. Pagamento seguro via PIX.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: G.dark, padding: '88px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-block', border: `1px solid ${G.goldBorder}`, borderRadius: 4, padding: '5px 16px', marginBottom: 28 }}>
            <span style={{ color: G.gold, fontSize: 10, fontWeight: 600, letterSpacing: 2 }}>PRONTO PARA COMECAR?</span>
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 42, color: G.white, fontWeight: 700, marginBottom: 16, lineHeight: 1.15, letterSpacing: '-0.3px' }}>
            Verifique seu contrato<br />agora mesmo
          </h2>
          <p style={{ color: G.mutedDark, fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
            Sem cadastro obrigatorio. O laudo completo custa apenas R$&nbsp;9,99.
          </p>
          <button onClick={handleStart} style={{ background: G.gold, color: G.dark, fontWeight: 700, fontSize: 16, padding: '15px 40px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 24px rgba(201,168,76,0.3)' }}>
            Comecar agora
          </button>
          <p style={{ color: '#374151', fontSize: 12, marginTop: 18 }}>Pagamento seguro via PIX &mdash; sem assinatura</p>
        </div>
      </section>


      {/* LGPD SECTION */}
      <section style={{ background: G.bg, padding: '64px 32px', borderTop: '1px solid ' + G.border }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: G.goldPale, border: '1px solid ' + G.goldBorder, borderRadius: 100, padding: '6px 18px', marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill={G.gold}/></svg>
              <span style={{ color: G.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: sans }}>LGPD</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: G.text, marginBottom: 10, letterSpacing: '-0.3px' }}>
              Seus dados protegidos por lei
            </h2>
            <p style={{ color: G.muted, fontSize: 15, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              Operamos em total conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018). Sua privacidade nao e opcional.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '🔒', title: 'Dados criptografados', desc: 'Toda comunicacao e transmitida com criptografia TLS. Seus contratos nunca ficam expostos.' },
              { icon: '🚫', title: 'Zero venda de dados', desc: 'Nunca vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais.' },
              { icon: '🗑️', title: 'Exclusao garantida', desc: 'Documentos enviados sao deletados automaticamente em 90 dias. Solicite exclusao a qualquer momento.' },
              { icon: '⚖️', title: 'Direitos assegurados', desc: 'Acesso, correcao, portabilidade e exclusao dos seus dados garantidos conforme arts. 17-22 da LGPD.' },
            ].map((item, i) => (
              <div key={i} style={{ background: G.white, border: '1px solid ' + G.border, borderRadius: 14, padding: '22px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                <p style={{ fontWeight: 700, color: G.text, fontSize: 14, marginBottom: 6, fontFamily: sans }}>{item.title}</p>
                <p style={{ color: G.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/privacidade" style={{ color: G.gold, textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, borderBottom: '1px solid ' + G.goldBorder, paddingBottom: 2, fontFamily: sans }}>
              Ler nossa Politica de Privacidade completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* LEGAL DISCLAIMER */}
      <div style={{ background: '#0A0D13', borderTop: `1px solid rgba(201,168,76,0.1)`, padding: '16px 32px' }}>
        <p style={{ color: '#374151', fontSize: 11, textAlign: 'center', maxWidth: 900, margin: '0 auto', lineHeight: 1.6 }}>
          <span style={{ color: G.gold }}>Aviso legal:</span> Os laudos sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94). Esta plataforma nao presta consultoria juridica.
        </p>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0A0D13', borderTop: `1px solid rgba(255,255,255,0.04)`, padding: '44px 32px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 36, paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ fontFamily: serif, color: G.gold, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Juros Abusivos</p>
              <p style={{ color: '#374151', fontSize: 13, maxWidth: 280, lineHeight: 1.7 }}>Analise tecnica de contratos de credito baseada em dados BCB e jurisprudencia STJ.</p>
            </div>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Plataforma</p>
                {[['Analisar contrato', '/upload'], ['Entrar', '/login'], ['Cadastrar', '/cadastro']].map(([l, h]) => (
                  <div key={l} style={{ marginBottom: 9 }}><Link to={h} style={{ color: '#374151', textDecoration: 'none', fontSize: 13 }}>{l}</Link></div>
                ))}
              </div>
              <div>
                <p style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Ferramentas</p>
                {[['Comparador de taxas', '/comparador'], ['Ranking', '/ranking'], ['Blog juridico', '/blog']].map(([l, h]) => (
                  <div key={l} style={{ marginBottom: 9 }}><Link to={h} style={{ color: '#374151', textDecoration: 'none', fontSize: 13 }}>{l}</Link></div>
                ))}
              </div>
              <div>
                <p style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Legal</p>
                <div style={{ marginBottom: 9 }}><Link to="/privacidade" style={{ color: '#374151', textDecoration: 'none', fontSize: 13 }}>Privacidade (LGPD)</Link></div>
                <div style={{ marginBottom: 9 }}><span style={{ color: '#374151', fontSize: 13, cursor: 'default' }}>Termos de uso</span></div>
                <div style={{ marginBottom: 9 }}><span style={{ color: '#374151', fontSize: 13, cursor: 'default' }}>Aviso legal</span></div>
              </div>
            </div>
          </div>
          <p style={{ color: '#1F2937', fontSize: 12, textAlign: 'center' }}>
            {String.fromCharCode(169)} {new Date().getFullYear()} Juros Abusivos &mdash; Nao prestamos consultoria juridica.
          </p>
        </div>
      </footer>
    </div>
  )
}
