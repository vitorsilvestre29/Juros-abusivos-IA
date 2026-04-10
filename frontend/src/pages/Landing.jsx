import { Link } from 'react-router-dom'

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
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#F3F8FF', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ background: '#10233F', borderBottom: '1px solid #1F4E79' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Juros Abusivos
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login" style={{ color: '#7E91A6', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px' }}>
              Entrar
            </Link>
            <Link to="/cadastro" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '9px 20px', borderRadius: 8 }}>
              Comecar agora
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #10233F 0%, #1F4E79 60%, #10233F 100%)', padding: '100px 24px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(201,149,42,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(201,149,42,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,149,42,0.15)', border: '1px solid rgba(201,149,42,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 28 }}>
            <span style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>Analise Tecnica Especializada</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
            Seu contrato tem<br />
            <span style={{ color: '#FF9F1C' }}>juros abusivos?</span>
          </h1>
          <p style={{ color: '#7E91A6', fontSize: 18, lineHeight: 1.7, marginBottom: 40, maxWidth: 580, margin: '0 auto 40px' }}>
            Enviamos seu contrato para analise tecnica especializada. Identificamos irregularidades, comparamos com as taxas do Banco Central e geramos um laudo tecnico completo.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/cadastro" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, display: 'inline-block' }}>
              Analisar meu contrato
            </Link>
            <span style={{ color: '#5E7085', fontSize: 13, alignSelf: 'center' }}>Laudo completo por R$ 20</span>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 36, color: '#10233F', fontWeight: 700 }}>Simples e rapido</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 16, padding: '32px 28px', position: 'relative' }}>
              <div style={{ fontFamily: "'Merriweather', serif", fontSize: 48, fontWeight: 800, color: '#F0EAD6', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#10233F', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              <div style={{ position: 'absolute', top: 28, right: 28, width: 4, height: 40, background: '#FF9F1C', borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </section>

      {/* O QUE IDENTIFICAMOS */}
      <section style={{ background: '#10233F', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Cobertura completa</p>
            <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 36, color: '#FFFFFF', fontWeight: 700 }}>O que nossa analise identifica</h2>
            <p style={{ color: '#5E7085', fontSize: 15, marginTop: 14, maxWidth: 560, margin: '14px auto 0' }}>
              Cobrimos todas as formas de abusividade em contratos de credito, com base na jurisprudencia do STJ e nas resolucoes do Banco Central.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, background: '#FF9F1C', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1', fontSize: 14 }}>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Nossos diferenciais</p>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 36, color: '#10233F', fontWeight: 700 }}>Por que usar nossa plataforma?</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10233F', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#FF9F1C', padding: '70px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 36, color: '#10233F', fontWeight: 800, marginBottom: 16 }}>
            Pronto para verificar seu contrato?
          </h2>
          <p style={{ color: '#7A4300', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
            Cadastro gratuito. Envie o contrato e receba o resultado. O laudo completo custa apenas R$ 20.
          </p>
          <Link to="/cadastro" style={{ background: '#10233F', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 16, padding: '15px 36px', borderRadius: 10, display: 'inline-block' }}>
            Comecar agora
          </Link>
        </div>
      </section>

      {/* AVISO LEGAL */}
      <section style={{ background: '#FFF4E5', borderTop: '2px solid #FF9F1C', padding: '28px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #FFB347', borderLeft: '7px solid #FF9F1C', borderRadius: 12, padding: '16px 18px', boxShadow: '0 8px 24px rgba(122,67,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <strong style={{ color: '#7A4300', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Aviso legal importante</strong>
            </div>
            <p style={{ color: '#8A4C00', fontSize: 13, lineHeight: 1.75 }}>
              <strong>Aviso legal:</strong> Os laudos gerados por esta plataforma sao de natureza tecnico-matematica e tem carater meramente informativo. A interpretacao juridica e o ajuizamento de qualquer acao revisional devem ser realizados exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94). A plataforma nao presta consultoria juridica.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#10233F', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#3B4D63', fontSize: 13 }}>
          {String.fromCharCode(169)} {new Date().getFullYear()} Juros Abusivos - Plataforma de analise tecnica de contratos de credito
        </p>
      </footer>
    </div>
  )
}

