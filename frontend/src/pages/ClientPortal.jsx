import { useParams, useNavigate } from 'react-router-dom'

export default function ClientPortal() {
  const { advogadoId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Portal do Cliente</h1>
        <p className="mt-3 text-gray-600">
          Link do advogado: {advogadoId}
        </p>

        <button
          onClick={() => navigate('/')}
          className="mt-8 px-4 py-2 rounded-xl bg-[#003366] text-white"
        >
          Ir para início
        </button>
      </div>
    </div>
  )
}
