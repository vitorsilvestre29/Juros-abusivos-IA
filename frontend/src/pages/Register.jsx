import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerApi, login as loginApi } from '../lib/api'

const G = {
  dark: '#0E1117', gold: '#C9A84C', goldPale: '#F5EDD3', goldBorder: 'rgba(201,168,76,0.25)',
  text: '#1C1C28', muted: '#6B7280', white: '#FFFFFF', bg: '#F7F5F0', border: '#E8E2D9', red: '#C0392B',
}
const serif = "'Playfair Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

export default function Register() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await registerApi(name, email, password)
      const res = await loginApi(email, password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: false }))
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: `1.5px solid ${G.border}`, borderRadius: 8, fontSize: 15, outline: 'none', fontFamily: sans, background: G.bg, boxSizing: 'border-box', color: G.text }

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: sans, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Optional notice */}
        <div style={{ background: G.goldPale, border: `1px solid ${G.goldBorder}`, borderRadius: 8, padding: '10px 16px', marginBottom: 24, textAlign: 'center' }}>
          <span style={{ color: '#78600A', fontSize: 13 }}>O cadastro e opcional — </span>
          <Link to="/upload" style={{ color: G.gold, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Analisar sem cadastro</Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: serif, color: G.gold, fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Juros Abusivos</Link>
          <p style={{ color: G.muted, fontSize: 13 }}>Crie sua conta para salvar seu historico de analises</p>
        </div>

        <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 16, padding: '40px 36px', boxShadow: '0 4px 24px rgba(28,28,40,0.06)' }}>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: G.text, marginBottom: 28, textAlign: 'center' }}>Criar conta gratuita</h1>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: `3px solid ${G.red}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Seu nome', type: 'text', val: name, set: setName, ph: 'Maria Silva' },
              { label: 'Email', type: 'email', val: email, set: setEmail, ph: 'seu@email.com' },
              { label: 'Senha', type: 'password', val: password, set: setPassword, ph: 'Minimo 6 caracteres' },
            ].map(({ label, type, val, set, ph }, i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 18 : 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: G.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</label>
                <input type={type} value={val} onChange={e => set(e.target.value)} required placeholder={ph} style={inp} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? G.muted : G.dark, color: G.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: sans }}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: G.muted, marginTop: 24 }}>
            Ja tem conta?{' '}
            <Link to="/login" style={{ color: G.gold, fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
