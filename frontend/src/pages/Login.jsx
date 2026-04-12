import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../lib/api'


const G = {
  dark: '#0E1117', darkMid: '#161B27', gold: '#C9A84C', goldLight: '#E2C06B',
  goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)', text: '#1C1C28',
  muted: '#6B7280', mutedDark: '#9CA3AF', white: '#FFFFFF', bg: '#F7F5F0',
  cream: '#FAF8F3', border: '#E8E2D9', red: '#C0392B',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await loginApi(email, password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: false }))
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email ou senha incorretos.')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: `1.5px solid ${G.border}`, borderRadius: 8, fontSize: 15, outline: 'none', fontFamily: sans, background: G.bg, boxSizing: 'border-box', color: G.text }

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans, display: 'flex' }}>
      {/* Left panel */}
      <div style={{ flex: 1, background: G.dark, display: 'none', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', borderRight: `1px solid rgba(201,168,76,0.1)` }}>
        <div style={{ maxWidth: 360, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -40, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
          <div style={{ fontFamily: serif, color: G.gold, fontSize: 24, fontWeight: 700, marginBottom: 40 }}>Juros Abusivos</div>
          <h2 style={{ fontFamily: serif, color: G.white, fontSize: 32, fontWeight: 700, lineHeight: 1.25, marginBottom: 18 }}>Analise tecnica especializada de contratos</h2>
          <p style={{ color: '#4B5563', fontSize: 15, lineHeight: 1.7 }}>Identifique irregularidades e descubra se voce esta pagando a mais.</p>
          <div style={{ marginTop: 40, borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 28 }}>
            {['Taxas BCB consultadas ao vivo', 'Laudo tecnico em PDF', 'Jurisprudencia do STJ'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, background: G.gold, borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#4B5563', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Juros Abusivos</Link>
            <p style={{ color: G.muted, fontSize: 13 }}>Analise tecnica de contratos de credito</p>
          </div>

          <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 16, padding: '40px 36px', boxShadow: '0 4px 24px rgba(28,28,40,0.06)' }}>
            <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: G.text, marginBottom: 28, textAlign: 'center' }}>Entrar na conta</h1>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: `3px solid ${G.red}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: G.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" style={inp} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: G.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Sua senha" style={inp} />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? G.muted : G.dark, color: G.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: sans, letterSpacing: 0.2 }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 14, color: G.muted, marginTop: 24 }}>
              Nao tem conta?{' '}
              <Link to="/cadastro" style={{ color: G.gold, fontWeight: 600, textDecoration: 'none' }}>Criar conta gratuita</Link>
            </p>
            <p style={{ textAlign: 'center', fontSize: 13, color: G.muted, marginTop: 14 }}>
              <Link to="/upload" style={{ color: G.muted, textDecoration: 'underline' }}>Analisar sem cadastro</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
