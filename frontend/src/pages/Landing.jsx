import { Link, useNavigate } from 'react-router-dom'
import { startGuestSession } from '../lib/api'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

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

const features = [
  { icon: '📊', title: 'Taxas comparadas com o BCB', desc: 'Consultamos as taxas medias de mercado diretamente da API do Banco Central, atualizadas a cada 12 horas.' },
  { icon: '⚖️', title: 'Baseado em jurisprudencia real', desc: 'A analise usa Sumula 566 STJ, REsp 1.061.530/RS e as Resolucoes BCB vigentes como referencia.' },
  { icon: '📄', title: 'Laudo em PDF profissional', desc: 'Documento tecnico completo, pronto para ser apresentado a um advogado para acao revisional.' },
  { icon: '🔒', title: 'Privacidade garantida (LGPD)', desc: 'Seus dados e documentos sao protegidos conforme a Lei Geral de Protecao de Dados.' },
]

export default function Landing() {
  const nav = useNavigate()

  async function handleStartAnalysis() {
    const hasToken = localStorage.getItem('token')
    if (hasToken) { nav('/upload'); return }
    try {
      const res = await startGuestSession()
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: res.data.is_guest === true }))
      nav('/upload')
    } catch { nav('/login') }
  }

  return (
    <div style={{ fontFamily: sans, background: bg, minHeight: '100vh' }}>

      {/* LGPD BAR */}
      <div style={{ background: '#0A2010', padding: '7px 24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#4CAF50"/></svg>
        <p style={{ color: '#A8D5A2', fontSize: 11, fontWeight: 600, margin: 0, letterSpacing: 0.4 }}>
          Seus dados sao protegidos pela <strong style={{ color: white }}>LGPD (Lei 13.709/2018)</strong>. Documentos excluidos automaticamente em 90 dias.{' '}
          <Link to="/privacidade" style={{ color: '#7BC47A', textDecoration: 'none', fontWeight: 700 }}>Saiba mais</Link>
        </p>
      </div>

      {/* NAV */}
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: serif, color: O, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>Juros Abusivos</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/comparador" style={{ color: '#7E9BB5', textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 12px' }}>Comparador</Link>
            <Link to="/ranking" style={{ color: '#7E9BB5', textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 12px' }}>Ranking</Link>
            <Link to="/blog" style={{ color: '#7E9BB5', textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 12px' }}>Blog</Link>
            <Link to="/login" style={{ color: '#7E9BB5', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px' }}>Entrar</Link>
            <Link to="/cadastro" style={{ background: O, color: N, textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '9px 20px', borderRadius: 8 }}>Comecar agora</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #0D2137 0%, #163552 55%, #0D2137 100%)', padding: '100px 24px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(232,146,10,0.07) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(232,146,10,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(232,146,10,0.15)', border: '1px solid rgba(232,146,10,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 28 }}>
            <span style={{ color: O, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>Analise Tecnica Especializada</span>
          </div>
          <h1 style={{ fontFamily: serif, color: white, fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Seu contrato tem<br /><span style={{ color: O }}>juros abusivos?</span>
          </h1>
          <p style={{ color: '#8FA3B8', fontSize: 17, lineHeight: 1.75, marginBottom: 10, maxWidth: 580, margin: '0 auto 10px' }}>
            Nosso sistema cruza seu contrato com as taxas reais do Banco Central e jurisprudencia do STJ para identificar cobranças indevidas em minutos.
          </p>
          <p style={{ color: '#5E7085', fontSize: 15, lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            Identificamos irregularidades, comparamos com as taxas do Banco Central e geramos um laudo tecnico completo.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <button onClick={handleStartAnalysis} style={{ background: O, color: N, fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 16px rgba(232,146,10,0.35)' }}>
              Analisar meu contrato
            </button>
            <span style={{ color: '#5E7085', fontSize: 13, alignSelf: 'center' }}>Laudo completo por R$ 9,99</span>
          </div>
          <div style={{ background: 'rgba(255,244,229,0.95)', border: '1px solid rgba(232,146,10,0.4)', borderLeft: '5px solid ' + O, borderRadius: 10, padding: '12px 16px', textAlign: 'left', maxWidth: 680, margin: '0 auto' }}>
            <p style={{ color: '#7A4300', fontSize: 12, lineHeight: 1.65, margin: 0 }}>
              <strong>Aviso legal:</strong> Os laudos gerados por esta plataforma sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94). A plataforma nao presta consultoria juridica.
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
          <h2 style={{ fontFamily: serif, fontSize: 36, color: N, fontWeight: 700 }}>Simples e rapido</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: white, border: '1px solid ' + border, borderRadius: 16, padding: '32px 28px', position: 'relative', boxShadow: '0 2px 12px rgba(13,33,55,0.06)' }}>
              <div style={{ fontFamily: serif, fontSize: 48, fontWeight: 800, color: '#EAF0F8', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ color: muted, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              <div style={{ position: 'absolute', top: 28, right: 28, width: 4, height: 40, background: O, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </section>

      {/* O QUE IDENTIFICAMOS */}
      <section style={{ background: N, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Cobertura completa</p>
            <h2 style={{ fontFamily: serif, fontSize: 36, color: white, fontWeight: 700 }}>O que nossa analise identifica</h2>
            <p style={{ color: '#5E7085', fontSize: 15, marginTop: 14, maxWidth: 560, margin: '14px auto 0' }}>
              Cobrimos todas as formas de abusividade em contratos de credito, com base na jurisprudencia do STJ e nas resolucoes do Banco Central.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, background: O, borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1', fontSize: 14 }}>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por que usar</p>
          <h2 style={{ fontFamily: serif, fontSize: 36, color: N, fontWeight: 700 }}>Nossa diferenca</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: white, border: '1px solid ' + border, borderTop: '3px solid ' + O, borderRadius: 14, padding: '28px 24px', boxShadow: '0 2px 12px rgba(13,33,55,0.06)' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: muted, fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LGPD */}
      <section style={{ background: '#F0F8F0', padding: '72px 24px', borderTop: '1px solid #C8E6C9', borderBottom: '1px solid #C8E6C9' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 100, padding: '5px 14px', marginBottom: 18 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#2E7D32"/></svg>
            <span style={{ color: '#2E7D32', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>LGPD</span>
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 32, color: N, fontWeight: 700, marginBottom: 12 }}>Seus dados protegidos por lei</h2>
          <p style={{ color: muted, fontSize: 15, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Operamos em total conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018). Sua privacidade nao e opcional.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { icon: '🔒', title: 'Dados criptografados', desc: 'Transmissao com criptografia TLS em todas as comunicacoes.' },
              { icon: '🚫', title: 'Zero venda de dados', desc: 'Nunca vendemos ou compartilhamos seus dados com terceiros.' },
              { icon: '🗑️', title: 'Exclusao garantida', desc: 'Documentos excluidos automaticamente em 90 dias.' },
              { icon: '⚖️', title: 'Direitos assegurados', desc: 'Acesso, correcao e exclusao garantidos pela LGPD.' },
            ].map((item, i) => (
              <div key={i} style={{ background: white, border: '1px solid #C8E6C9', borderRadius: 14, padding: '22px 18px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                <p style={{ fontWeight: 700, color: N, fontSize: 14, marginBottom: 6 }}>{item.title}</p>
                <p style={{ color: muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/privacidade" style={{ color: '#2E7D32', textDecoration: 'none', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #A5D6A7', paddingBottom: 2 }}>
            Ler nossa Politica de Privacidade completa →
          </Link>
        </div>
      </section>

      {/* CTA + PRECO */}
      <section style={{ background: O, padding: '70px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: serif, fontSize: 36, color: N, fontWeight: 800, marginBottom: 16 }}>
            Pronto para verificar seu contrato?
          </h2>
          <p style={{ color: '#7A4300', fontSize: 16, marginBottom: 12, lineHeight: 1.6 }}>
            Sem cadastro obrigatorio. Envie o contrato e receba o resultado.
          </p>
          <div style={{ display: 'inline-block', background: 'rgba(13,33,55,0.12)', border: '1px solid rgba(13,33,55,0.15)', borderRadius: 12, padding: '10px 24px', marginBottom: 32 }}>
            <span style={{ color: N, fontSize: 13, fontWeight: 700 }}>Pagamento unico e transparente — </span>
            <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 800, color: N }}> R$ 9,99</span>
            <span style={{ color: N, fontSize: 12, fontWeight: 600 }}> pelo laudo completo</span>
          </div>
          <div style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 480, margin: '0 auto 32px', textAlign: 'left' }}>
            {['Irregularidades com fundamento legal', 'Calculo do valor cobrado a mais', 'Comparacao com taxas BCB ao vivo', 'PDF pronto para o advogado', 'Orientacao para acao revisional', 'Acesso imediato via PIX'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, background: N, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: O, fontSize: 10, fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ color: N, fontSize: 13, fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
          <button onClick={handleStartAnalysis} style={{ background: N, color: white, fontWeight: 700, fontSize: 16, padding: '15px 40px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 16px rgba(13,33,55,0.3)' }}>
            Comecar agora
          </button>
          <p style={{ color: '#8A5800', fontSize: 12, marginTop: 14 }}>Sem cadastro. Pagamento seguro via PIX.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: N, padding: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: '#3B4D63', fontSize: 13, margin: 0 }}>
            {String.fromCharCode(169)} {new Date().getFullYear()} Juros Abusivos — Plataforma de analise tecnica de contratos de credito
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/privacidade" style={{ color: '#5E7085', fontSize: 12, textDecoration: 'none' }}>Privacidade (LGPD)</Link>
            <Link to="/blog" style={{ color: '#5E7085', fontSize: 12, textDecoration: 'none' }}>Blog</Link>
            <Link to="/comparador" style={{ color: '#5E7085', fontSize: 12, textDecoration: 'none' }}>Comparador</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
