import { Link } from 'react-router-dom'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans, display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: N, boxShadow: '0 2px 12px rgba(13,33,55,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>LaudoJuros</Link>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <div style={{ fontFamily: serif, fontSize: 88, fontWeight: 700, color: O, lineHeight: 1, marginBottom: 12 }}>404</div>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: N, marginBottom: 12 }}>
            Pagina nao encontrada
          </h1>
          <p style={{ color: muted, fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
            O endereco que voce tentou acessar nao existe ou foi movido.
          </p>
          <Link to="/" style={{ background: N, color: white, textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '13px 32px', borderRadius: 12, display: 'inline-block' }}>
            Voltar ao inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
