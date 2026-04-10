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
    <div className="site-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">
        <section className="surface-dark p-8 sm:p-10 hidden lg:flex flex-col justify-between">
          <div>
            <div className="font-['Playfair_Display'] text-3xl font-bold text-[#c9952a]">Juros Abusivos IA</div>
            <h1 className="mt-6 font-['Playfair_Display'] text-4xl leading-tight font-bold">
              Entre para gerenciar suas analises tecnicas
            </h1>
            <p className="mt-4 text-[#c7d3e3] leading-relaxed">
              Fluxo completo de contrato, impacto financeiro e relatorio preliminar em um unico painel.
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#d3dce8]">
            <div>Comparacao com referencias de mercado</div>
            <div>Registro historico por caso</div>
            <div>Base tecnica para avaliacao juridica</div>
          </div>
        </section>

        <section className="surface-card p-7 sm:p-9">
          <div className="text-center">
            <Link to="/" className="font-['Playfair_Display'] text-2xl font-bold text-[#b6831f]">Juros Abusivos IA</Link>
            <p className="mt-2 text-sm muted">Acesse sua conta</p>
          </div>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block mb-1 text-sm font-semibold text-[#273142]">Email</label>
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold text-[#273142]">Senha</label>
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center muted">
            Nao tem conta? <Link to="/cadastro" className="font-semibold text-[#9d721b]">Criar conta gratuita</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
