import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerApi, login as loginApi, upgradeGuestAccount } from '../lib/api'

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
      const current = localStorage.getItem('user')
      const currentUser = current ? JSON.parse(current) : null

      let res
      if (currentUser?.is_guest) {
        res = await upgradeGuestAccount(name, email, password)
      } else {
        await registerApi(name, email, password)
        res = await loginApi(email, password)
      }

      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({
        name: res.data.user_name,
        email: res.data.user_email,
        is_guest: !!res.data.is_guest,
      }))
      nav('/upload')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-safe" style={{ minHeight: '100vh', background: '#F3F8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 24, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 6 }}>
            Juros Abusivos
          </Link>
          <p style={{ color: '#56677B', fontSize: 14 }}>Analise tecnica de contratos de credito</p>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #D8E3F2', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(12,26,46,0.06)' }}>
          <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 700, color: '#10233F', marginBottom: 6, textAlign: 'center' }}>
            Criar conta gratuita
          </h1>
          <p style={{ color: '#56677B', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Seu historico de analises ficara salvo aqui</p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Nome completo', type: 'text', val: name, set: setName, ph: 'Seu nome completo' },
              { label: 'Email', type: 'email', val: email, set: setEmail, ph: 'seu@email.com' },
              { label: 'Senha', type: 'password', val: password, set: setPassword, ph: 'Minimo 6 caracteres' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  required
                  placeholder={f.ph}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D8E3F2', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: "'Manrope', sans-serif", background: '#FAFAF8', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#7E91A6' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", marginTop: 8 }}
            >
              {loading ? 'Criando conta...' : 'Criar conta e continuar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#7E8FA5', marginTop: 20, lineHeight: 1.6 }}>
            Ao criar sua conta, voce concorda com os termos de uso e a politica de privacidade (LGPD).
          </p>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#56677B', marginTop: 20 }}>
            Ja tem conta?{' '}
            <Link to="/login" style={{ color: '#FF9F1C', fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

