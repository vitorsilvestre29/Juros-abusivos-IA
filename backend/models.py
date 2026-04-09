from sqlalchemy import String, Integer, Float, DateTime, Text, Boolean, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime, date


# ──────────────────────────────────────────────
# Limites por plano — budget mensal em USD
#
# Baseline real (cenário pesado = padrão):
#   2 contratos escaneados + 20 msgs chat + 3 docs ≈ $0,30 USD/caso
#
#   Trial:        3 casos   ≈ $0,90  → budget $1,50  (folga para variação)
#   Básico:       30 casos  ≈ $9,00  → budget $12,00
#   Intermediário: 120 casos ≈ $36,00 → budget $24,00
#   Profissional:  200 casos ≈ $60,00 → budget $38,00
#   Escritório:   600 casos ≈ $180,00 → budget $220,00
#   Enterprise:   1200 casos ≈ $360,00 → budget $420,00
#   Elite:        2000 casos ≈ $600,00 → budget $700,00
# ──────────────────────────────────────────────
PLAN_BUDGET_USD = {
    "trial":        1.50,
    "basico":       12.00,
    "intermediario": 24.00,
    "profissional": 38.00,
    "escritorio":   220.00,
    "enterprise":   420.00,
    "elite":        700.00,
    # Compatibilidade: mantém usuários antigos sem quebrar lookup.
    "ilimitado":    700.00,
}

# Limites de casos (fallback — prevenção contra uso absurdo)
PLAN_LIMITS = {
    "trial":        5,
    "basico":       60,       # 2x o esperado — budget é o limite real
    "intermediario": 120,
    "profissional": 200,
    "escritorio":   600,
    "enterprise":   1200,
    "elite":        2000,
    # Compatibilidade: plano legado aponta para o novo topo.
    "ilimitado":    2000,
}

PLAN_LABELS = {
    "trial":        "Trial",
    "basico":       "Básico",
    "intermediario": "Intermediário",
    "profissional": "Profissional",
    "escritorio":   "Escritório",
    "enterprise":   "Enterprise",
    "elite":        "Elite",
    "ilimitado":    "Elite (legado)",
}

PLAN_PRICE_BRL = {
    "trial":        0,
    "basico":       397,
    "intermediario": 597,
    "profissional": 797,
    "escritorio":  1597,
    "enterprise":  3997,
    "elite":       5997,
    "ilimitado":   5997,
}

# Ordem exibida para o painel/admin (sem plano legado).
PLAN_PUBLIC_IDS = ["trial", "basico", "intermediario", "profissional", "escritorio", "enterprise", "elite"]

# Texto comercial curto (usado para tela pública de planos).
PLAN_TAGLINES = {
    "trial": "Perfeito para testar",
    "basico": "Ideal para começar",
    "intermediario": "Para advogados em crescimento",
    "profissional": "Escala com produtividade",
    "escritorio": "Operação consolidada",
    "enterprise": "Alta demanda mensal",
    "elite": "Máxima capacidade do sistema",
}

# Para quem serve (copy mais descritiva).
PLAN_FOR_WHOM = {
    "trial": "Indicada para conhecer o fluxo (caso → contrato → análise → documentos) sem compromisso.",
    "basico": "Para advogado autônomo ou time pequeno com volume baixo e previsível de novos casos.",
    "intermediario": "Para quem está aumentando a carteira e precisa de folga de uso sem pular para o Profissional.",
    "profissional": "Para equipes que rodam vários atendimentos por mês e querem estabilidade de capacidade.",
    "escritorio": "Para escritórios com operação recorrente e múltiplos advogados usando diariamente.",
    "enterprise": "Para operações com volume alto mensal e necessidade de previsibilidade de entrega.",
    "elite": "Para o máximo volume permitido com a melhor disponibilidade de capacidade do sistema.",
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="advogado")  # "admin" ou "advogado"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # ── campos de plano ──
    plan: Mapped[str] = mapped_column(String(30), default="trial")           # trial | basico | intermediario | profissional | escritorio | enterprise | elite
    cases_used_this_month: Mapped[int] = mapped_column(Integer, default=0)   # contador de casos no mês
    api_cost_this_month_usd: Mapped[float] = mapped_column(Float, default=0.0)  # gasto real de API no mês (USD)
    plan_reset_at: Mapped[date | None] = mapped_column(Date, nullable=True)  # próximo reset mensal

    # ── contato ──
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ex: 5511999999999

    cases: Mapped[list["Case"]] = relationship("Case", back_populates="user")
    client_payments: Mapped[list["ClientPayment"]] = relationship("ClientPayment", back_populates="advogado")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    client_name: Mapped[str | None] = mapped_column(String(200))
    client_cpf: Mapped[str | None] = mapped_column(String(14))
    client_address: Mapped[str | None] = mapped_column(String(500))
    case_type: Mapped[str | None] = mapped_column(String(50))  # consignado, clt, saude
    status: Mapped[str] = mapped_column(String(50), default="em_andamento")
    api_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)  # custo real de API deste caso
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="cases")
    messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="case")
    contracts: Mapped[list["Contract"]] = relationship("Contract", back_populates="case")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="case")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"))
    role: Mapped[str] = mapped_column(String(20))  # user, assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="messages")


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"))
    filename: Mapped[str] = mapped_column(String(255))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    extracted_text: Mapped[str | None] = mapped_column(Text)
    analysis: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="contracts")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"))
    doc_type: Mapped[str] = mapped_column(String(50))  # parecer, procuracao, peticao
    filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="documents")


class ClientPayment(Base):
    """Registro de pagamento PIX de cliente vindo de campanha (Meta Ads)."""
    __tablename__ = "client_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    advogado_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    case_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cases.id"), nullable=True)

    # Dados do cliente (pessoa física)
    client_name: Mapped[str] = mapped_column(String(200))
    client_phone: Mapped[str] = mapped_column(String(20))
    loan_type: Mapped[str] = mapped_column(String(50))  # clt | bancario_direto | saude

    # Pagamento
    amount: Mapped[float] = mapped_column(Float, default=10.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | paid | expired
    mp_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mp_qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)       # código copia-e-cola
    mp_qr_code_base64: Mapped[str | None] = mapped_column(Text, nullable=True) # imagem base64

    # Análise
    analysis_done: Mapped[bool] = mapped_column(Boolean, default=False)
    has_issues: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    analysis_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    advogado: Mapped["User"] = relationship("User", back_populates="client_payments")
