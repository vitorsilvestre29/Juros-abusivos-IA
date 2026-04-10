import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../lib/api'

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
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F8FF', display: 'flex' }}>

      {/* Lado esquerdo - decorativo */}
      <div style={{ flex: 1, background: 'linear-gradient(160deg, #10233F, #1F4E79)', display: 'none', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column' }} className="hidden md:flex">
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>
            Juros Abusivos
          </div>
          <h2 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 36, fontWeight: 700, lineHeight: 1.25, marginBottom: 20 }}>
            Analise tecnica especializada de contratos
          </h2>
          <p style={{ color: '#5E7085', fontSize: 15, lineHeight: 1.7 }}>
            Identifique irregularidades e descubra se voce esta pagando a mais no seu emprestimo ou financiamento.
          </p>
          <div style={{ marginTop: 48, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32 }}>
            {['Comparacao com taxas do Banco Central', 'Laudo tecnico em PDF', 'Baseado em jurisprudencia do STJ'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, background: '#FF9F1C', borderRadius: '50%' }} />
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
            <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 8 }}>
              Juros Abusivos
            </Link>
            <p style={{ color: '#56677B', fontSize: 14 }}>Analise tecnica de contratos de credito</p>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(12,26,46,0.06)' }}>
            <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 700, color: '#10233F', marginBottom: 28, textAlign: 'center' }}>
              Entrar na conta
            </h1>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D8E3F2', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: "'Manrope', sans-serif", background: '#FAFAF8', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D8E3F2', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: "'Manrope', sans-serif", background: '#FAFAF8', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? '#7E91A6' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif" }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#56677B', marginTop: 24 }}>
              Nao tem conta?{' '}
              <Link to="/cadastro" style={{ color: '#FF9F1C', fontWeight: 600, textDecoration: 'none' }}>Criar conta gratuita</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

