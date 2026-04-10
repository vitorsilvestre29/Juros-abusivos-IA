import { useNavigate, Link } from 'react-router-dom'

const STEPS = [
  { icon: '📤', title: 'Envie o contrato', desc: 'Faça upload do PDF ou foto do contrato de empréstimo ou financiamento.' },
  { icon: '🔍', title: 'Analise especializada', desc: 'Nosso sistema verifica todas as clausulas e compara as taxas com as medias do Banco Central.' },
  { icon: '📊', title: 'Receba o resultado', desc: 'Veja se há irregularidades e qual o impacto financeiro estimado.' },
  { icon: '📄', title: 'Baixe o laudo', desc: 'Pague o laudo técnico completo em PDF e leve para um advogado especializado.' },
]

const FEATURES = [
  { icon: '🏦', title: 'Taxas comparadas com o BCB', desc: 'Consultamos as taxas médias de mercado diretamente da API do Banco Central, atualizadas a cada 12 horas.' },
  { icon: '⚖️', title: 'Baseado em jurisprudência real', desc: 'A análise usa Súmula 566 STJ, REsp 1.061.530/RS e as Resoluções BCB vigentes como referência.' },
  { icon: '🔒', title: 'Protegido pela LGPD', desc: 'Seus dados são processados de forma segura e anônima, conforme a Lei Geral de Proteção de Dados.' },
  { icon: '⚡', title: 'Resultado em minutos', desc: 'A análise completa leva entre 30 segundos e 2 minutos — muito mais rápido que qualquer análise manual.' },
]

const IRREGULARITIES = [
  'Juros acima da média do Banco Central',
  'Seguro prestamista não autorizado (venda casada)',
  'Capitalização de juros — anatocismo',
  'IOF acima dos limites legais',
  'Tarifas indevidas cobradas no contrato',
  'Dados bancários incompletos (violação BCB)',
  'CET (Custo Efetivo Total) abusivo',
]

export default function Landing() {
  const nav = useNavigate()
  const isLogged = !!localStorage.getItem('token')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-blue-900 font-bold text-xl">⚖️ Juros Abusivos IA</span>
          <div className="flex items-center gap-3">
            {isLogged ? (
              <button onClick={() => nav('/app')} className="bg-blue-900 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-blue-800 transition">
                Minha conta
              </button>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 text-sm hover:text-gray-800">Entrar</Link>
                <Link to="/cadastro" className="bg-blue-900 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-blue-800 transition">
                  Começar grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-300 text-sm font-medium mb-4 uppercase tracking-wider">Analise tecnica especializada de contratos</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Seu contrato de empréstimo<br />tem juros abusivos?
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Nosso sistema analisa seu contrato em minutos, identifica irregularidades e compara as taxas com as medias do Banco Central. Descubra se você está pagando a mais.
          </p>
          <button
            onClick={() => nav(isLogged ? '/upload' : '/cadastro')}
            className="bg-white text-blue-900 font-bold text-lg px-10 py-4 rounded-2xl hover:bg-blue-50 transition shadow-lg"
          >
            🔍 Analisar meu contrato
          </button>
          <p className="text-blue-300 text-sm mt-4">Cadastro gratuito • Análise em minutos • Laudo por R$ 20</p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Como funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <div className="text-4xl mb-3">{s.icon}</div>
                <div className="text-xs font-bold text-blue-600 mb-2">PASSO {i + 1}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Irregularidades que identificamos */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">O que nossa analise identifica</h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">
            A análise cobre todas as formas conhecidas de abusividade em contratos de crédito, com base na jurisprudência do STJ e nas resoluções do Banco Central.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IRREGULARITIES.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <span className="text-red-500 font-bold text-lg">⚠️</span>
                <span className="text-gray-700 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Por que usar nossa plataforma?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aviso legal */}
      <section className="py-10 px-4 bg-yellow-50 border-t border-yellow-200">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-yellow-800">
            <strong>⚖️ Aviso legal:</strong> Os laudos gerados por esta plataforma são de natureza técnico-matemática e têm caráter meramente informativo. A interpretação jurídica e o ajuizamento de qualquer ação revisional devem ser realizados exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94). A plataforma não presta consultoria jurídica.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 bg-blue-900 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para verificar seu contrato?</h2>
        <p className="text-blue-200 mb-8 max-w-xl mx-auto">
          Faça o cadastro gratuito, envie o contrato e receba o resultado em minutos. O laudo completo custa apenas R$ 20.
        </p>
        <button
          onClick={() => nav(isLogged ? '/upload' : '/cadastro')}
          className="bg-white text-blue-900 font-bold text-lg px-10 py-4 rounded-2xl hover:bg-blue-50 transition"
        >
          Começar agora →
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-sm py-8 px-4 text-center">
        <p>© {new Date().getFullYear()} Juros Abusivos IA — Plataforma de análise técnica de contratos de crédito</p>
        <p className="mt-1">Todos os direitos reservados. Não prestamos consultoria jurídica.</p>
      </footer>
    </div>
  )
}
