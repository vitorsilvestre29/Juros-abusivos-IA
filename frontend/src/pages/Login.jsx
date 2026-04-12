import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../lib/api'

const N = '#0D2137'
const O = '#E8920A'
const OL = '#FEF3E2'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginApi(email, password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email, is_guest: res.data.is_guest === true }))
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid ' + border, borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: sans, background: '#FAFAF8', boxSizing: 'border-box', color: N }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', fontFamily: sans }}>

      {/* Lado esquerdo - decorativo */}
      <div style={{ flex: 1, background: 'linear-gradient(160deg, ' + N + ', #163552)', display: 'none', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column' }} className="hidden md:flex">
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontFamily: serif, color: O, fontSize: 28, fontWeight: 700, marginBottom: 40 }}>LaudoJuros</div>
          <h2 style={{ fontFamily: serif, color: white, fontSize: 36, fontWeight: 700, lineHeight: 1.25, marginBottom: 20 }}>
            Analise tecnica especializada de contratos
          </h2>
          <p style={{ color: '#5E7085', fontSize: 15, lineHeight: 1.7 }}>
            Identifique irregularidades e descubra se voce esta pagando a mais no seu emprestimo ou financiamento.
          </p>
          <div style={{ marginTop: 48, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32 }}>
            {['Comparacao com taxas do Banco Central', 'Laudo tecnico em PDF', 'Baseado em jurisprudencia do STJ'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, background: O, borderRadius: '50%' }} />
                <span style={{ color: '#7E91A6', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito - form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 8 }}>
              LaudoJuros
            </Link>
            <p style={{ color: muted, fontSize: 14 }}>Analise tecnica de contratos de credito</p>
          </div>

          <div style={{ background: white, border: '1px solid ' + border, borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(13,33,55,0.07)' }}>
            <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: N, marginBottom: 28, textAlign: 'center' }}>
              Entrar na conta
            </h1>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: N, marginBottom: 6 }}>Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Sua senha" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? muted : N, color: white, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: sans }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 14, color: muted, marginTop: 24 }}>
              Nao tem conta?{' '}
              <Link to="/cadastro" style={{ color: O, fontWeight: 600, textDecoration: 'none' }}>Criar conta gratuita</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
