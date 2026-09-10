import { useState } from 'react'
import { Link } from 'react-router-dom'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

const ARTICLES = [
  {
    slug: 'o-que-e-juro-abusivo',
    title: 'O que e juro abusivo e como identificar no seu contrato',
    summary: 'A Lei 8.078/90 (CDC) e a jurisprudencia do STJ estabelecem limites claros para os juros cobrados por bancos e financeiras. Entenda quando a cobranca se torna ilegal.',
    category: 'Educacao Financeira',
    date: '28 Mar 2025',
    readTime: '5 min',
    icon: '\u2696\uFE0F',
    content: [
      'Juros abusivos sao aqueles cobrados em desacordo com as taxas praticadas pelo mercado ou que contrariam as normas do Banco Central do Brasil (BCB). O Superior Tribunal de Justica (STJ) ja consolidou entendimento atraves da Sumula 296 de que a mera estipulacao de juros em percentual superior ao previsto em lei nao e abusiva, mas sim aquela que foge aos parametros razoaveis de mercado.',
      'Para identificar juros abusivos em seu contrato, voce deve comparar a taxa contratada com a taxa media de mercado divulgada mensalmente pelo Banco Central. Se a taxa do seu contrato for significativamente superior (o STJ costuma considerar acima do dobro da media), ha forte indicativo de abusividade.',
      'Os tipos mais comuns de cobrancas abusivas incluem: juros compostos capitalizados diariamente, tarifas nao informadas previamente, seguros obrigatorios embutidos sem consentimento e multas acima de 2% ao mes para contratos de consumo.',
      'Nosso sistema analisa esses parametros automaticamente, comparando as clausulas do seu contrato com as taxas vigentes do BCB e a jurisprudencia do STJ, fornecendo um laudo tecnico completo em minutos.',
    ],
  },
  {
    slug: 'revisao-contratual-financiamento-veiculo',
    title: 'Revisao contratual de financiamento de veiculo: quando pedir',
    summary: 'Descubra em quais situacoes voce tem direito a revisar o contrato de financiamento do seu carro e como calcular se pagou juros acima da media do mercado.',
    category: 'Financiamento',
    date: '15 Mar 2025',
    readTime: '7 min',
    icon: '🚗',
    content: [
      'O financiamento de veiculos e um dos contratos mais frequentemente revisados pela Justica brasileira. Com taxas medias que variam entre 1,4% e 2,8% ao mes conforme o BCB, qualquer cobranca acima desse patamar pode ser questionada.',
      'A revisao contratual e cabivel quando: a taxa de juros efetiva (CET - Custo Efetivo Total) e superior ao dobro da media do mercado; ha cobranca de tarifa de abertura de credito (TAC) ou tarifa de emissao de boleto nao prevista no contrato; o seguro do veiculo e obrigatorio e embutido sem que o consumidor tenha alternativa.',
      'O prazo para ajuizar acao revisional e de 5 anos, contados a partir da data de cada parcela paga indevidamente (prescricao quinquenal). Isso significa que mesmo contratos mais antigos podem ser revisados para as ultimas 60 parcelas.',
      'Para iniciar o processo, e necessario ter o contrato original, os extratos de pagamento e um laudo tecnico que demonstre a abusividade. Nosso sistema gera exatamente esse laudo, identificando clausulas problematicas e calculando o valor do excesso cobrado.',
    ],
  },
  {
    slug: 'credito-consignado-irregularidades',
    title: 'Credito consignado: as 4 irregularidades mais comuns',
    summary: 'O emprestimo consignado atinge principalmente aposentados e servidores. Saiba quais sao as cobranças irregulares mais frequentes e como identificar se voce foi lesado.',
    category: 'Credito Pessoal',
    date: '02 Mar 2025',
    readTime: '6 min',
    icon: '📋',
    content: [
      'O credito consignado tem taxa de juros controlada pelo INSS e Banco Central, com limite maximo estabelecido periodicamente. Mesmo assim, e um dos produtos com mais reclamacoes no Procon e Banco Central.',
      'As irregularidades mais comuns sao: 1) Desconto superior a 35% da renda liquida mensal (limite legal para consignado); 2) Contratacao sem o pleno consentimento do titular, especialmente em casos de portabilidade forjada; 3) Seguros nao solicitados embutidos nas parcelas; 4) Taxa efetiva superior ao limite estabelecido pelo INSS para o mes da contratacao.',
      'O caso mais grave e o da fraude em consignado, onde o desconto aparece no contracheque sem que o beneficiario tenha contratado o emprestimo. Nesses casos, ha responsabilidade solidaria do banco e do INSS, e o valor pode ser recuperado integralmente.',
      'Nosso sistema identifica essas irregularidades automaticamente ao analisar o contrato, cruzando as clausulas com os limites vigentes do INSS e BCB na data da contratacao.',
    ],
  },
  {
    slug: 'como-calcular-juro-real',
    title: 'Como calcular o juro real do seu emprestimo',
    summary: 'A taxa nominal e a taxa efetiva sao muito diferentes. Aprenda a calcular o Custo Efetivo Total (CET) e entenda o que voce realmente paga em cada emprestimo.',
    category: 'Educacao Financeira',
    date: '18 Fev 2025',
    readTime: '4 min',
    icon: '📊',
    content: [
      'O Custo Efetivo Total (CET) e o indicador mais importante para comparar emprestimos, pois inclui juros, tarifas, seguros e todos os encargos. A Resolucao 3.517 do Banco Central obriga as instituicoes financeiras a informar o CET antes da contratacao.',
      'Para calcular o CET manualmente: some todas as parcelas que voce pagara, subtraia o valor que recebeu, divida pelo valor recebido e pelo prazo em anos. Multiplique por 100 para obter a taxa anual.',
      'Um emprestimo de R$ 10.000 em 24 parcelas de R$ 580 representa um total pago de R$ 13.920. O excesso de R$ 3.920 sobre dois anos equivale a aproximadamente 38,4% ao ano de CET, muito acima da taxa Selic.',
      'Nossa ferramenta faz esse calculo automaticamente a partir do contrato, comparando com a taxa media BCB vigente na data da contratacao e identificando se ha excesso cobrado.',
    ],
  },
]

export default function Blog() {
  const [selected, setSelected] = useState(null)

  const article = selected ? ARTICLES.find(a => a.slug === selected) : null

  if (article) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
        <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
              LaudoJuros
            </Link>
            <button onClick={() => setSelected(null)} style={{ color: '#94A3B8', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
              Voltar ao blog
            </button>
          </div>
        </nav>
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF4E5', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 100, padding: '6px 14px', marginBottom: 24 }}>
            <span style={{ fontSize: 16 }}>{article.icon}</span>
            <span style={{ color: '#FF9F1C', fontSize: 12, fontWeight: 700, letterSpacing: 1.2 }}>{article.category.toUpperCase()}</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 32, fontWeight: 700, color: '#10233F', marginBottom: 16, lineHeight: 1.35 }}>
            {article.title}
          </h1>
          <div style={{ display: 'flex', gap: 16, marginBottom: 36, color: '#94A3B8', fontSize: 14 }}>
            <span>{article.date}</span>
            <span>\u2022</span>
            <span>{article.readTime} de leitura</span>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 20, padding: '40px 40px', boxShadow: '0 2px 16px rgba(12,26,46,0.05)' }}>
            {article.content.map((para, i) => (
              <p key={i} style={{ color: '#374151', fontSize: 16, lineHeight: 1.8, marginBottom: i < article.content.length - 1 ? 24 : 0 }}>
                {para}
              </p>
            ))}
          </div>
          <div style={{ marginTop: 40, background: 'linear-gradient(135deg, #10233F, #1E3A5F)', borderRadius: 20, padding: '36px 32px', textAlign: 'center' }}>
            <h3 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
              Verifique o seu contrato agora
            </h3>
            <p style={{ color: '#94A3B8', fontSize: 15, marginBottom: 24 }}>Analise tecnica com base no BCB e jurisprudencia do STJ por apenas R$ 4,99</p>
            <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '12px 28px', borderRadius: 10, display: 'inline-block' }}>
              Analisar meu contrato
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>
      <nav style={{ background: '#10233F', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
            LaudoJuros
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/ranking" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Ranking</Link>
            <Link to="/comparador" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Comparador</Link>
            <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '8px 18px', borderRadius: 8 }}>
              Analisar contrato
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: '#FFF4E5', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Educacao juridica</span>
          </div>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 38, fontWeight: 700, color: '#10233F', marginBottom: 14 }}>
            Blog Juridico
          </h1>
          <p style={{ color: '#56677B', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
            Artigos sobre direito bancario, juros abusivos e seus direitos como consumidor
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
          {ARTICLES.map(a => (
            <article
              key={a.slug}
              onClick={() => setSelected(a.slug)}
              style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(12,26,46,0.05)', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(12,26,46,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(12,26,46,0.05)' }}
            >
              <div style={{ background: 'linear-gradient(135deg, #10233F, #1E3A5F)', padding: '28px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 36 }}>{a.icon}</div>
                <div style={{ background: 'rgba(255,159,28,0.2)', borderRadius: 100, padding: '4px 12px', display: 'inline-block' }}>
                  <span style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700 }}>{a.category.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                <h2 style={{ fontFamily: "'Merriweather', serif", fontSize: 18, fontWeight: 700, color: '#10233F', marginBottom: 12, lineHeight: 1.4 }}>
                  {a.title}
                </h2>
                <p style={{ color: '#56677B', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  {a.summary}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#94A3B8', fontSize: 13 }}>{a.date} \u2022 {a.readTime}</div>
                  <span style={{ color: '#FF9F1C', fontSize: 14, fontWeight: 700 }}>Ler artigo \u2192</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* SEO CTA */}
        <div style={{ marginTop: 56, background: 'linear-gradient(135deg, #10233F, #1E3A5F)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
            Ja sabe que tem direito. Agora comprove.
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            Nosso laudo tecnico com base no BCB e jurisprudencia do STJ e o primeiro passo para revisao contratual.
          </p>
          <Link to="/upload" style={{ background: '#FF9F1C', color: '#10233F', textDecoration: 'none', fontSize: 16, fontWeight: 700, padding: '14px 36px', borderRadius: 12, display: 'inline-block' }}>
            Analisar meu contrato — R$ 4,99
          </Link>
        </div>
      </main>
    </div>
  )
}
