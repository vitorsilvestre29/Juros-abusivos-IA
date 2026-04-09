import { useParams, useNavigate } from 'react-router-dom'

export default function ChatCase() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Chat do Caso #{caseId}</h1>
        <p className="mt-3 text-gray-600">
          Tela base criada para estabilizar o deploy. O fluxo completo de chat pode ser conectado agora.
        </p>

        <button
          onClick={() => navigate('/app')}
          className="mt-8 px-4 py-2 rounded-xl bg-[#003366] text-white"
        >
          Voltar ao painel
        </button>
      </div>
    </div>
  )
}
