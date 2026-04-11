"""
Geração do Laudo Técnico em PDF usando ReportLab.
"""
from __future__ import annotations

import io
import os
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# Cores da plataforma
COLOR_PRIMARY   = colors.HexColor("#1E3A5F")  # Azul escuro
COLOR_ACCENT    = colors.HexColor("#E53E3E")  # Vermelho (alerta)
COLOR_SUCCESS   = colors.HexColor("#276749")  # Verde
COLOR_LIGHT     = colors.HexColor("#EBF4FF")  # Azul claro (fundo)
COLOR_GRAY      = colors.HexColor("#718096")
COLOR_BORDER    = colors.HexColor("#CBD5E0")

WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER", "5511999999999")
REPORT_PRICE    = float(os.getenv("REPORT_PRICE", "9.99"))


def _styles():
    base = getSampleStyleSheet()

    title = ParagraphStyle(
        "ReportTitle", parent=base["Normal"],
        fontSize=18, textColor=COLOR_PRIMARY, fontName="Helvetica-Bold",
        alignment=TA_CENTER, spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "ReportSubtitle", parent=base["Normal"],
        fontSize=11, textColor=COLOR_GRAY, fontName="Helvetica",
        alignment=TA_CENTER, spaceAfter=4,
    )
    section = ParagraphStyle(
        "Section", parent=base["Normal"],
        fontSize=12, textColor=COLOR_PRIMARY, fontName="Helvetica-Bold",
        spaceBefore=14, spaceAfter=6,
    )
    body = ParagraphStyle(
        "Body", parent=base["Normal"],
        fontSize=9.5, fontName="Helvetica",
        leading=14, alignment=TA_JUSTIFY, spaceAfter=4,
    )
    label = ParagraphStyle(
        "Label", parent=base["Normal"],
        fontSize=8.5, textColor=COLOR_GRAY, fontName="Helvetica",
    )
    alert = ParagraphStyle(
        "Alert", parent=base["Normal"],
        fontSize=9.5, textColor=COLOR_ACCENT, fontName="Helvetica-Bold",
    )
    disclaimer = ParagraphStyle(
        "Disclaimer", parent=base["Normal"],
        fontSize=8, textColor=COLOR_GRAY, fontName="Helvetica-Oblique",
        alignment=TA_JUSTIFY, leading=12,
    )
    return {
        "title": title, "subtitle": subtitle, "section": section,
        "body": body, "label": label, "alert": alert, "disclaimer": disclaimer,
    }


def _table_style(header_color=COLOR_PRIMARY) -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 8.5),
        ("GRID",       (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ])


async def generate_report_pdf(
    ai_result: dict[str, Any],
    loan_type: str,
    bcb_rate_pct: float,
    impact_brl: float,
) -> bytes:
    """
    Gera o laudo técnico em PDF e retorna os bytes.
    """
    from models import LOAN_TYPES
    st = _styles()
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=2.2 * cm, bottomMargin=2.2 * cm,
    )

    story: list = []
    W = A4[0] - 4.4 * cm  # largura útil

    # ── CABEÇALHO ────────────────────────────────────────────────────
    story.append(Paragraph("LAUDO TÉCNICO DE ANÁLISE DE CONTRATO", st["title"]))
    story.append(Paragraph("Identificação de Abusividades em Contrato de Crédito", st["subtitle"]))
    story.append(Paragraph(
        f"Data de emissão: {datetime.now().strftime('%d/%m/%Y')} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Tipo de contrato: {LOAN_TYPES.get(loan_type, loan_type)}",
        st["subtitle"],
    ))
    story.append(HRFlowable(width=W, thickness=2, color=COLOR_PRIMARY, spaceAfter=12))

    # ── AVISO LEGAL ───────────────────────────────────────────────────
    legal_box = Table(
        [[Paragraph(
            "<b>⚖️ AVISO IMPORTANTE:</b> Este laudo é de natureza técnico-matemática e tem caráter "
            "meramente informativo. Identifica discrepâncias matemáticas entre as condições contratuais "
            "e as taxas médias de mercado divulgadas pelo Banco Central do Brasil. A interpretação "
            "jurídica das irregularidades e o ajuizamento de ação revisional devem ser realizados "
            "exclusivamente por advogado habilitado, conforme o Estatuto da OAB (Lei 8.906/94).",
            st["disclaimer"],
        )]],
        colWidths=[W],
    )
    legal_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5F5")),
        ("BOX", (0, 0), (-1, -1), 1, COLOR_ACCENT),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(legal_box)
    story.append(Spacer(1, 10))

    # ── DADOS DO CONTRATO ─────────────────────────────────────────────
    story.append(Paragraph("1. DADOS DO CONTRATO", st["section"]))

    contract_rows = [
        ["Campo", "Valor identificado"],
        ["Banco / Instituição", ai_result.get("banco_identificado", "Não identificado")],
        ["Nº do Contrato",       ai_result.get("numero_contrato", "—")],
        ["Data do Contrato",     ai_result.get("data_contrato", "—")],
        ["Valor Liberado",       ai_result.get("valor_emprestimo", "—")],
        ["Taxa Mensal",          ai_result.get("taxa_mensal", "—")],
        ["Taxa Anual",           ai_result.get("taxa_anual", "—")],
        ["CET Mensal",           ai_result.get("cet_mensal", "—")],
        ["CET Anual",            ai_result.get("cet_anual", "—")],
        ["Nº de Parcelas",       ai_result.get("numero_parcelas", "—")],
        ["Valor da Parcela",     ai_result.get("valor_parcela", "—")],
        ["Total a Pagar",        ai_result.get("valor_total_devido", "—")],
        ["Taxa Média BCB",       f"{bcb_rate_pct:.2f}% a.m. (referência de mercado)"],
    ]

    # Dados do cliente
    cliente = ai_result.get("dados_cliente", {})
    if cliente.get("nome"):
        contract_rows.append(["Nome do Contratante", cliente.get("nome", "—")])
    if cliente.get("cpf"):
        contract_rows.append(["CPF", cliente.get("cpf", "—")])

    t = Table(contract_rows, colWidths=[W * 0.38, W * 0.62])
    t.setStyle(_table_style())
    story.append(t)
    story.append(Spacer(1, 10))

    # ── IRREGULARIDADES ───────────────────────────────────────────────
    story.append(Paragraph("2. IRREGULARIDADES IDENTIFICADAS", st["section"]))

    irregularidades = ai_result.get("irregularidades", [])
    if not irregularidades:
        story.append(Paragraph(
            "Nenhuma irregularidade significativa identificada neste contrato.",
            st["body"],
        ))
    else:
        for i, irr in enumerate(irregularidades, 1):
            gravidade = irr.get("gravidade", "media").lower()
            cor = COLOR_ACCENT if gravidade == "alta" else colors.HexColor("#D97706")
            tag = "🔴 ALTA" if gravidade == "alta" else "🟡 MÉDIA"

            irr_block = [
                [Paragraph(
                    f"<b>#{i} — {irr.get('tipo', 'Irregularidade')}</b> &nbsp; "
                    f"<font color='#{cor.hexval()[2:]}'>Gravidade: {tag}</font>",
                    st["body"],
                )],
                [Paragraph(irr.get("descricao", ""), st["body"])],
            ]

            if irr.get("trecho_contrato"):
                irr_block.append([Paragraph(
                    f"<b>Trecho do contrato:</b> <i>\"{irr.get('trecho_contrato', '')}\"</i>",
                    st["disclaimer"],
                )])
            if irr.get("fundamento_legal"):
                irr_block.append([Paragraph(
                    f"<b>Fundamento legal:</b> {irr.get('fundamento_legal', '')}",
                    st["label"],
                )])
            if irr.get("valor_cobrado"):
                irr_block.append([Paragraph(
                    f"<b>Valor identificado:</b> {irr.get('valor_cobrado', '')}",
                    st["alert"],
                )])

            box = Table(irr_block, colWidths=[W])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5F5") if gravidade == "alta" else colors.HexColor("#FFFBEB")),
                ("BOX",        (0, 0), (-1, -1), 0.5, cor),
                ("LEFTPADDING",  (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING",   (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
            ]))
            story.append(KeepTogether(box))
            story.append(Spacer(1, 6))

    story.append(Spacer(1, 4))

    # ── IMPACTO FINANCEIRO ────────────────────────────────────────────
    story.append(Paragraph("3. CÁLCULO DO IMPACTO FINANCEIRO ESTIMADO", st["section"]))
    story.append(Paragraph(
        "Comparação entre o custo total com a taxa contratada e o custo com a taxa média "
        "de mercado divulgada pelo Banco Central. A diferença representa o valor "
        "estimado de cobrança excessiva ao contratante.",
        st["body"],
    ))
    story.append(Spacer(1, 6))

    impact_rows = [
        ["Descrição", "Valor"],
        ["Taxa contratada (ao mês)", ai_result.get("taxa_mensal", "—")],
        ["Taxa média BCB para a modalidade", f"{bcb_rate_pct:.2f}% a.m."],
        ["Cobrança excessiva estimada", f"R$ {impact_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")],
    ]

    t2 = Table(impact_rows, colWidths=[W * 0.65, W * 0.35])
    t2.setStyle(_table_style(COLOR_SUCCESS))
    story.append(t2)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>Metodologia:</b> Cálculo pelo sistema Price (tabela de amortização francesa), "
        "comparando parcelas com a taxa contratada versus a taxa média BCB. "
        "Valores adicionados à cobrança de tarifas e seguros identificados como indevidos. "
        "Valores aproximados — cálculo exato deve ser realizado por perito contábil.",
        st["disclaimer"],
    ))
    story.append(Spacer(1, 10))

    # ── RESUMO E RECOMENDAÇÃO ─────────────────────────────────────────
    story.append(Paragraph("4. RESUMO E RECOMENDAÇÃO", st["section"]))

    resumo = ai_result.get("resumo_para_cliente", "")
    recomendacao = ai_result.get("recomendacao", "")

    if resumo:
        story.append(Paragraph(f"<b>Conclusão da análise:</b> {resumo}", st["body"]))
        story.append(Spacer(1, 6))

    if recomendacao:
        rec_box = Table(
            [[Paragraph(f"<b>Recomendação:</b> {recomendacao}", st["body"])]],
            colWidths=[W],
        )
        rec_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT),
            ("BOX",        (0, 0), (-1, -1), 1, COLOR_PRIMARY),
            ("LEFTPADDING",  (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING",   (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ]))
        story.append(rec_box)
    story.append(Spacer(1, 10))

    # ── CTA ADVOGADO ──────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=1, color=COLOR_BORDER, spaceAfter=10))

    wa_link = f"https://wa.me/{WHATSAPP_NUMBER}?text=Olá!%20Recebi%20meu%20laudo%20técnico%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20ação%20revisional."
    cta_box = Table(
        [[Paragraph(
            f"<b>📱 Fale com um advogado especializado</b><br/>"
            f"Este laudo identificou possíveis irregularidades no seu contrato. "
            f"Um advogado especialista pode avaliar a viabilidade de uma ação revisional "
            f"para reduzir os juros e recuperar os valores cobrados indevidamente.<br/><br/>"
            f"<b>Entre em contato via WhatsApp:</b> wa.me/{WHATSAPP_NUMBER}",
            st["body"],
        )]],
        colWidths=[W],
    )
    cta_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FFF4")),
        ("BOX",        (0, 0), (-1, -1), 1.5, COLOR_SUCCESS),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ]))
    story.append(cta_box)
    story.append(Spacer(1, 10))

    # ── RODAPÉ LEGAL ─────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=0.5, color=COLOR_BORDER, spaceAfter=6))
    story.append(Paragraph(
        "Este laudo foi gerado automaticamente pela plataforma Juros Abusivos IA com base na análise "
        "de inteligência artificial e nas taxas médias de mercado do Banco Central do Brasil. "
        "Não constitui parecer jurídico, consultoria ou orientação legal. "
        "A interpretação jurídica e quaisquer medidas legais devem ser conduzidas por advogado "
        "regularmente inscrito na OAB, conforme exige o art. 1º, I da Lei 8.906/94 (Estatuto da OAB). "
        f"Emitido em {datetime.now().strftime('%d/%m/%Y às %H:%M')}.",
        st["disclaimer"],
    ))

    doc.build(story)
    return buf.getvalue()
