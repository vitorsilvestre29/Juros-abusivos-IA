import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await login(email, password)
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify({
        name: response.data.user_name,
        email: response.data.user_email,
        role: response.data.user_role
      }))
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email ou senha incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001428] via-[#002855] to-[#003366]">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2 text-white">
          <div className="bg-white/10 rounded-xl p-2">
            <Scale className="w-5 h-5" />
          </div>
          <span className="font-semibold">Portal Jurídico AI</span>
        </div>
        <button
          onClick={() => navigate('/planos')}
          className="hidden sm:inline-flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl px-4 py-2 transition-colors"
        >
          Planos
          <ExternalLink className="w-4 h-4 opacity-90" />
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Lado marketing */}
          <div className="text-white lg:py-8">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-blue-50 text-xs font-semibold px-3 py-2 rounded-full">
              <Sparkles className="w-4 h-4" />
              Acesso ao portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 leading-tight">
              Entre para atender casos com mais velocidade e controle
            </h1>
            <p className="text-blue-200 mt-4 leading-relaxed max-w-xl">
              Analise contratos em PDF, converse por caso e gere documentos com padrão do escritório — com budget mensal de IA e previsibilidade.
            </p>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { t: 'Análise de contrato', d: 'Extração + visão quando necessário.' },
                { t: 'Chat por caso', d: 'Histórico e contexto sempre.' },
                { t: 'Documentos', d: 'Parecer, procuração e petição.' },
                { t: 'Controle de custos', d: 'Budget + limite de casos.' },
              ].map((c) => (
                <div key={c.t} className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-100" />
                    <div className="font-semibold">{c.t}</div>
                  </div>
                  <div className="text-sm text-blue-200 mt-2">{c.d}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 inline-flex items-center gap-2 text-xs text-blue-200">
              <ShieldCheck className="w-4 h-4" />
              Sessão autenticada via token (JWT). Acesso restrito ao escritório.
            </div>
          </div>

          {/* Card login */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-8 sm:p-10">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Fazer login</h2>
            <p className="text-sm text-gray-600 mt-2">
              Use seu e-mail e senha cadastrados para acessar o portal.
            </p>

            {error ? (
              <div className="mt-5 bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 text-sm">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10 rounded-xl"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base rounded-2xl">
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

              <div className="text-xs text-gray-500 text-center pt-2">
                Precisa de um plano?{' '}
                <button type="button" onClick={() => navigate('/planos')} className="text-[#003366] font-semibold hover:underline">
                  Ver planos
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
