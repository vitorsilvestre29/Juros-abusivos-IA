import { Link, useNavigate } from 'react-router-dom'
import { startGuestSession } from '../lib/api'

const steps = [
  { n: '01', title: 'Envie o contrato', desc: 'Faca upload do PDF ou foto do contrato de emprestimo ou financiamento.' },
  { n: '02', title: 'Analise especializada', desc: 'Nosso sistema verifica clausulas, taxas e compara com as medias do Banco Central.' },
  { n: '03', title: 'Acesse o laudo', desc: 'Pague o laudo tecnico completo e leve para um advogado especializado.' },
]

const issues = [
  { icon: '📈', text: 'Juros acima da media do Banco Central' },
  { icon: '🔄', text: 'Capitalizacao indevida de juros (anatocismo)' },
  { icon: '🏦', text: 'Tarifas nao autorizadas pelo BCB' },
  { icon: '🛡️', text: 'Seguro prestamista abusivo' },
  { icon: '⛔', text: 'Comissao de permanencia irregular' },
  { icon: '📉', text: 'Spread bancario excessivo' },
  { icon: '💸', text: 'Cobranca de IOF irregular' },
  { icon: '⚠️', text: 'Multas e encargos em duplicidade' },
]

const features = [
  { icon: '📊', title: 'Taxas comparadas com o BCB', desc: 'Consultamos as taxas medias de mercado diretamente da API do Banco Central, atualizadas a cada 12 horas.' },
  { icon: '⚖️', title: 'Baseado em jurisprudencia real', desc: 'A analise usa Sumula 566 STJ, REsp 1.061.530/RS e as Resolucoes BCB vigentes como referencia.' },
  { icon: '📄', title: 'Laudo em PDF profissional', desc: 'Documento tecnico completo, pronto para ser apresentado a um advogado para acao revisional.' },
  { icon: '🔒', title: 'Privacidade garantida (LGPD)', desc: 'Seus dados e documentos sao protegidos conforme a Lei Geral de Protecao de Dados.' },
]

const stats = [
  { val: '8', label: 'tipos de abusividade verificados' },
  { val: 'R$ 9,99', label: 'laudo tecnico completo' },
  { val: '100%', label: 'baseado em normas BCB/STJ' },
]

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
    } catch {
      nav('/upload')
    }
  }

  const navBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#F0F4FB', minHeight: '100vh' }}>

      {/* ANNOUNCEMENT BAR */}
      <div style={{ background: '#FF9F1C', padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ color: '#10233F', fontSize: 13, fontWeight: 700, margin: 0 }}>
          Analise gratuita — pague apenas R$ 9,99 pelo laudo completo, sem cadastro obrigatorio
        </p>
      </div>

      {/* NAV */}
      <nav style={{ background: '#10233F', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(0,0,0,0.18)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 22, fontWeight: 700 }}>
            Juros Abusivos
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link to="/comparador" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 12px' }}>Comparador</Link>
            <Link to="/ranking" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 12px' }}>Ranking</Link>
            <Link to="/blog" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 12px' }}>Blog</Link>
            <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 12px' }}>Entrar</Link>
            <button
              onClick={handleStart}
              style={{ ...navBtn, background: '#FF9F1C', color: '#10233F', fontSize: 14, fontWeight: 700, padding: '9px 22px', borderRadius: 8, marginLeft: 4 }}
            >
              Analisar contrato
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(150deg, #0C1A2E 0%, #10233F 40%, #1A3A5C 100%)', padding: '90px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: 340, height: 340, background: 'radial-gradient(circle, rgba(255,159,28,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-80px', width: 280, height: 280, background: 'radial-gradient(circle, rgba(255,159,28,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative' }}>
          {/* badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,159,28,0.12)', border: '1px solid rgba(255,159,28,0.25)', borderRadius: 100, padding: '7px 20px', marginBottom: 32 }}>
            <div style={{ width: 7, height: 7, background: '#FF9F1C', borderRadius: '50%' }} />
            <span style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Analise Tecnica Especializada</span>
          </div>

          <h1 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 'clamp(38px, 6vw, 66px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 24 }}>
            Seu contrato tem<br />
            <span style={{ color: '#FF9F1C' }}>juros abusivos?</span>
          </h1>

          <p style={{ color: '#94A3B8', fontSize: 18, lineHeight: 1.75, marginBottom: 44, maxWidth: 600, margin: '0 auto 44px' }}>
            Enviamos seu contrato para analise tecnica especializada. Identificamos irregularidades, comparamos com as taxas do Banco Central e geramos um laudo tecnico completo.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            <button
              onClick={handleStart}
              style={{ ...navBtn, background: '#FF9F1C', color: '#10233F', fontWeight: 800, fontSize: 17, padding: '15px 36px', borderRadius: 12, boxShadow: '0 4px 20px rgba(255,159,28,0.35)' }}
            >
              Analisar meu contrato agora
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
              <span style={{ color: '#64748B', fontSize: 14 }}>Sem cadastro obrigatorio</span>
            </div>
          </div>

          {/* stats bar */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 32px', maxWidth: 640, margin: '0 auto 32px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '0 20px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                <p style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{s.val}</p>
                <p style={{ color: '#64748B', fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* legal disclaimer */}
          <div style={{ background: 'rgba(255,244,229,0.08)', border: '1px solid rgba(255,159,28,0.2)', borderLeft: '4px solid #FF9F1C', borderRadius: 10, padding: '12px 16px', textAlign: 'left', maxWidth: 640, margin: '0 auto' }}>
            <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: '#FF9F1C' }}>Aviso legal:</strong> Os laudos sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado (Lei 8.906/94). A plataforma nao presta consultoria juridica.
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '88px 24px', maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, color: '#10233F', fontWeight: 700, marginBottom: 12 }}>Simples e rapido</h2>
          <p style={{ color: '#56677B', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>Tres passos para descobrir se voce esta pagando mais do que deveria</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
          {/* connector line */}
          <div style={{ position: 'absolute', top: 48, left: '16.6%', right: '16.6%', height: 2, background: 'linear-gradient(90deg, #FF9F1C 0%, rgba(255,159,28,0.2) 100%)', zIndex: 0 }} />

          {steps.map((s, i) => (
            <div key={s.n} style={{ position: 'relative', zIndex: 1, padding: '0 20px', textAlign: 'center' }}>
              {/* step number circle */}
              <div style={{ width: 56, height: 56, background: i === 0 ? '#FF9F1C' : '#FFFFFF', border: i === 0 ? 'none' : '2px solid #D8E3F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: i === 0 ? '0 4px 20px rgba(255,159,28,0.4)' : '0 2px 8px rgba(0,0,0,0.06)' }}>
                <span style={{ fontFamily: "'Merriweather', serif", fontWeight: 800, fontSize: 18, color: i === 0 ? '#10233F' : '#94A3B8' }}>{s.n}</span>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 18, padding: '28px 24px', boxShadow: '0 2px 12px rgba(12,26,46,0.05)', minHeight: 120 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button
            onClick={handleStart}
            style={{ ...navBtn, background: '#10233F', color: '#FFFFFF', fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 10 }}
          >
            Comecar agora — sem cadastro
          </button>
        </div>
      </section>

      {/* O QUE IDENTIFICAMOS */}
      <section style={{ background: 'linear-gradient(160deg, #0C1A2E, #10233F)', padding: '88px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>Cobertura completa</p>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, color: '#FFFFFF', fontWeight: 700, marginBottom: 14 }}>O que nossa analise identifica</h2>
            <p style={{ color: '#64748B', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
              Cobrimos todas as formas de abusividade em contratos de credito, com base na jurisprudencia do STJ e nas resolucoes do Banco Central.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {issues.map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.2s' }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,159,28,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section style={{ padding: '88px 24px', maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>Nossos diferenciais</p>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, color: '#10233F', fontWeight: 700 }}>Por que usar nossa plataforma?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 18, padding: '32px 28px', boxShadow: '0 2px 16px rgba(12,26,46,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #FF9F1C, rgba(255,159,28,0.3))' }} />
              <div style={{ width: 52, height: 52, background: '#FFF4E5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRECO */}
      <section style={{ background: '#F0F4FB', padding: '0 24px 88px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 24, padding: '48px 44px', boxShadow: '0 4px 32px rgba(12,26,46,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #FF9F1C, #F5C842)' }} />
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <p style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>Preco unico e transparente</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                <span style={{ color: '#56677B', fontSize: 20, marginTop: 10, fontWeight: 600 }}>R$</span>
                <span style={{ fontFamily: "'Merriweather', serif", fontSize: 72, fontWeight: 800, color: '#10233F', lineHeight: 1 }}>9,99</span>
              </div>
              <p style={{ color: '#56677B', fontSize: 15 }}>pagamento unico — laudo disponivel imediatamente</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
              {[
                'Irregularidades com fundamento legal',
                'Calculo do valor cobrado a mais',
                'Comparacao com taxas do BCB',
                'PDF pronto para apresentar ao advogado',
                'Orientacao para acao revisional',
                'Acesso imediato via PIX',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, background: '#FFF4E5', border: '1.5px solid #FF9F1C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700 }}>✓</span>
                  </div>
                  <span style={{ color: '#374151', fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              style={{ ...navBtn, width: '100%', background: '#10233F', color: '#FFFFFF', fontWeight: 700, fontSize: 16, padding: '15px', borderRadius: 12, boxShadow: '0 4px 16px rgba(12,26,46,0.2)' }}
            >
              Analisar meu contrato — R$ 9,99
            </button>
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 14 }}>
              Sem cadastro obrigatorio. Pagamento seguro via PIX.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: 'linear-gradient(135deg, #FF9F1C 0%, #F5B942 100%)', padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 300, height: 300, background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: 240, height: 240, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 40, color: '#10233F', fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
            Pronto para verificar seu contrato?
          </h2>
          <p style={{ color: '#7A4300', fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
            Sem cadastro obrigatorio. Envie o contrato e receba o resultado. O laudo completo custa apenas R$ 9,99.
          </p>
          <button
            onClick={handleStart}
            style={{ ...navBtn, background: '#10233F', color: '#FFFFFF', fontWeight: 800, fontSize: 16, padding: '16px 40px', borderRadius: 12, boxShadow: '0 6px 24px rgba(12,26,46,0.3)' }}
          >
            Comecar agora
          </button>
          <p style={{ color: '#8A5500', fontSize: 13, marginTop: 18 }}>Pagamento seguro via PIX — sem assinatura</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0C1A2E', padding: '40px 24px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Juros Abusivos</p>
              <p style={{ color: '#475569', fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>Plataforma de analise tecnica de contratos de credito baseada em normas do BCB e jurisprudencia do STJ.</p>
            </div>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Plataforma</p>
                {[['Analisar contrato', '/upload'], ['Entrar', '/login'], ['Cadastrar', '/cadastro']].map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <Link to={href} style={{ color: '#475569', textDecoration: 'none', fontSize: 14 }}>{label}</Link>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Ferramentas</p>
                {[['Comparador de taxas', '/comparador'], ['Ranking de abusividade', '/ranking'], ['Blog juridico', '/blog']].map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <Link to={href} style={{ color: '#475569', textDecoration: 'none', fontSize: 14 }}>{label}</Link>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Legal</p>
                {['Aviso legal', 'Privacidade (LGPD)', 'Termos de uso'].map(label => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <span style={{ color: '#475569', fontSize: 14 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{ color: '#334155', fontSize: 13, textAlign: 'center' }}>
            {String.fromCharCode(169)} {new Date().getFullYear()} Juros Abusivos — Analise tecnica de contratos de credito. Nao prestamos consultoria juridica.
          </p>
        </div>
      </footer>
    </div>
  )
}
