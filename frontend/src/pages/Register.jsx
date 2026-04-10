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
      nav('/upload')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="site-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg surface-card p-7 sm:p-9">
        <div className="text-center">
          <Link to="/" className="font-['Playfair_Display'] text-3xl font-bold text-[#b6831f]">Juros Abusivos IA</Link>
          <p className="mt-2 text-sm muted">Crie sua conta para iniciar a analise</p>
        </div>

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-semibold text-[#273142]">Nome completo</label>
            <input className="input-field" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-[#273142]">Email</label>
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-[#273142]">Senha</label>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" required />
          </div>

          <button className="btn-accent w-full" type="submit" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta e continuar'}
          </button>
        </form>

        <p className="mt-5 text-xs text-center text-[#7a6a48] leading-relaxed">
          Ao seguir, voce concorda com o uso dos dados para analise tecnica do contrato, conforme LGPD.
        </p>

        <p className="mt-5 text-sm text-center muted">
          Ja tem conta? <Link to="/login" className="font-semibold text-[#9d721b]">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
