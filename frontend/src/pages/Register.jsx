import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerApi } from '../lib/api'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

export default function Register() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await registerApi(name, email, password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: false }))
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid ' + border, borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: sans, background: '#FAFAF8', boxSizing: 'border-box', color: N }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: sans }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 8 }}>
            Juros Abusivos
          </Link>
          <p style={{ color: muted, fontSize: 14 }}>Analise tecnica de contratos de credito</p>
        </div>

        <div style={{ background: white, border: '1px solid ' + border, borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(13,33,55,0.07)' }}>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: N, marginBottom: 8, textAlign: 'center' }}>
            Criar conta gratuita
          </h1>
          <p style={{ color: muted, fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
            Salve seu historico de analises
          </p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Nome completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimo 6 caracteres" minLength={6} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? muted : N, color: white, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: sans }}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: muted, marginTop: 24 }}>
            Ja tem conta?{' '}
            <Link to="/login" style={{ color: O, fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
