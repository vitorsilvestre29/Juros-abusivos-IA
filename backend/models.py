from sqlalchemy import String, Integer, Float, DateTime, Text, Boolean, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


# Tipos de empréstimo suportados
LOAN_TYPES = {
    "consignado_inss":      "Consignado INSS",
    "consignado_clt":       "Consignado CLT (desconto em folha)",
    "credito_pessoal":      "Crédito Pessoal (bancário direto)",
    "credito_habitacional": "Crédito Habitacional / Financiamento Imobiliário",
    "cdc_veiculo":          "CDC Veículo / Financiamento de Veículo",
    "cartao_credito":       "Cartão de Crédito",
    "outros":               "Outros",
}


class AnalysisStatus:
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"


class PaymentStatus:
    PENDING   = "pending"
    PAID      = "paid"
    EXPIRED   = "expired"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    contracts: Mapped[list["Contract"]] = relationship("Contract", back_populates="user")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="user")


class Contract(Base):
    """Contrato enviado pelo usuário para análise."""
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(10))    # "pdf" ou "image"
    file_data: Mapped[bytes] = mapped_column(LargeBinary) # arquivo original em bytes
    loan_type: Mapped[str] = mapped_column(String(50), default="credito_pessoal")
    user_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)  # para notif. WhatsApp
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="contracts")
    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="contract", uselist=False)


class Analysis(Base):
    """Resultado da análise de IA de um contrato."""
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("contracts.id"), unique=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    # Status do processamento
    status: Mapped[str] = mapped_column(String(20), default=AnalysisStatus.PENDING)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resultado completo da IA em JSON
    ai_result_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Campos de acesso rápido (evita parsear JSON toda hora)
    has_issues: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    irregularities_count: Mapped[int] = mapped_column(Integer, default=0)
    impact_brl: Mapped[float] = mapped_column(Float, default=0.0)  # cobrança excessiva estimada
    bcb_rate_pct: Mapped[float] = mapped_column(Float, default=0.0)

    # Laudo PDF (gerado após pagamento confirmado)
    report_pdf: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    report_generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="analysis")
    payment: Mapped["Payment"] = relationship("Payment", back_populates="analysis", uselist=False)
    telemetry: Mapped["AnalysisTelemetry"] = relationship(
        "AnalysisTelemetry", back_populates="analysis", uselist=False
    )


class Payment(Base):
    """Pagamento PIX via Mercado Pago para liberar o laudo completo."""
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    analysis_id: Mapped[int] = mapped_column(Integer, ForeignKey("analyses.id"), unique=True)

    amount_brl: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDING)

    # Dados Mercado Pago
    mp_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    mp_qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)         # copia-e-cola PIX
    mp_qr_code_base64: Mapped[str | None] = mapped_column(Text, nullable=True)  # imagem QR base64
    mp_ticket_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="payments")
    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="payment")


class AnalysisTelemetry(Base):
    """Telemetria de custo/uso por analise para controle operacional."""
    __tablename__ = "analysis_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(Integer, ForeignKey("analyses.id"), unique=True, index=True)

    model_name: Mapped[str] = mapped_column(String(80), default="claude-sonnet-4-6")
    max_output_tokens: Mapped[int] = mapped_column(Integer, default=2000)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_cost_brl: Mapped[float] = mapped_column(Float, default=0.0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=AnalysisStatus.FAILED)
    error_type: Mapped[str | None] = mapped_column(String(80), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="telemetry")
