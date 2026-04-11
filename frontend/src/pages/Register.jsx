import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerApi, login as loginApi } from '../lib/api'

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
      await registerApi(name, email, password)
      const res = await loginApi(email, password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({
        name: res.data.user_name,
        email: res.data.user_email,
        is_guest: false,
      }))
      nav('/upload')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB' }}>

      {/* announcement bar */}
      <div style={{ background: '#FF9F1C', padding: '8px 24px', textAlign: 'center' }}>
        <p style={{ color: '#10233F', fontSize: 13, fontWeight: 700, margin: 0 }}>
          O cadastro e opcional — voce pode analisar sem criar conta
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 40px)' }}>
        {/* Lado esquerdo - decorativo (visivel em telas maiores) */}
        <div style={{ flex: 1, background: 'linear-gradient(150deg, #0C1A2E, #10233F)', display: 'none', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column' }} className="hidden md:flex">
          <div style={{ maxWidth: 380 }}>
            <p style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>Juros Abusivos</p>
            <h2 style={{ fontFamily: "'Merriweather', serif", color: '#FFFFFF', fontSize: 34, fontWeight: 700, lineHeight: 1.25, marginBottom: 16 }}>
              Salve seu historico de analises
            </h2>
            <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
              Crie sua conta gratuita para acessar todos os seus laudos tecnicos a qualquer momento.
            </p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
              {['Historico completo de analises', 'Laudos salvos permanentemente', 'Acesso em qualquer dispositivo'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 22, height: 22, background: 'rgba(255,159,28,0.15)', border: '1px solid rgba(255,159,28,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#FF9F1C', fontSize: 12 }}>✓</span>
                  </div>
                  <span style={{ color: '#94A3B8', fontSize: 14 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, background: 'rgba(255,159,28,0.08)', border: '1px solid rgba(255,159,28,0.15)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Prefere analisar sem cadastro?{' '}
                <Link to="/upload" style={{ color: '#FF9F1C', fontWeight: 700, textDecoration: 'none' }}>Clique aqui</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Lado direito - form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <Link to="/" style={{ fontFamily: "'Merriweather', serif", color: '#FF9F1C', fontSize: 22, fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                Juros Abusivos
              </Link>
              <p style={{ color: '#56677B', fontSize: 14 }}>Analise tecnica de contratos de credito</p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2EBF8', borderRadius: 24, padding: '40px 36px', boxShadow: '0 4px 28px rgba(12,26,46,0.08)' }}>
              <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, fontWeight: 700, color: '#10233F', marginBottom: 4, textAlign: 'center' }}>
                Criar conta gratuita
              </h1>
              <p style={{ color: '#56677B', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Seu historico de analises ficara salvo aqui</p>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#7F1D1D', fontSize: 14 }}>
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
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E2EBF8', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: "'Manrope', sans-serif", background: '#FAFAF8', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', background: loading ? '#94A3B8' : '#10233F', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", marginTop: 8, boxShadow: loading ? 'none' : '0 4px 16px rgba(12,26,46,0.2)' }}
                >
                  {loading ? 'Criando conta...' : 'Criar conta e continuar'}
                </button>
              </form>

              <div style={{ margin: '20px 0', borderTop: '1px solid #E2EBF8', paddingTop: 20, textAlign: 'center' }}>
                <Link to="/upload" style={{ color: '#56677B', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                  Analisar sem cadastro →
                </Link>
              </div>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                Ao criar sua conta, voce concorda com os termos de uso e a politica de privacidade (LGPD).
              </p>

              <p style={{ textAlign: 'center', fontSize: 14, color: '#56677B', marginTop: 16 }}>
                Ja tem conta?{' '}
                <Link to="/login" style={{ color: '#FF9F1C', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
