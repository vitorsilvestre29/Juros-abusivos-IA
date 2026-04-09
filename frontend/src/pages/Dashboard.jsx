import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Painel</h1>
        <p className="mt-3 text-gray-600">
          Base inicial do painel. As funcionalidades de casos e chat podem ser conectadas em seguida.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-[#003366] text-white"
          >
            Voltar para landing
          </button>
          <button
            onClick={() => navigate('/planos')}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  )
}
