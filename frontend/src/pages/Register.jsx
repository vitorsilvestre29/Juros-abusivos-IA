import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register, login } from '../lib/api'

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      // Faz login automaticamente após cadastro
      const res = await login(form.email, form.password)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify({ name: res.data.user_name, email: res.data.user_email }))
      nav('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-900">
            <span className="text-2xl font-bold">⚖️ Juros Abusivos IA</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Crie sua conta para começar a análise</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Criar conta gratuita</h1>
          <p className="text-sm text-gray-500 mb-6">Seu histórico de análises ficará salvo aqui.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text" required value={form.name} onChange={set('name')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required value={form.email} onChange={set('email')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password" required value={form.password} onChange={set('password')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Criando conta...' : 'Criar conta e continuar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Ao criar sua conta, você concorda com os termos de uso e a política de privacidade (LGPD).
          </p>
          <p className="text-center text-sm text-gray-500 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-700 font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
