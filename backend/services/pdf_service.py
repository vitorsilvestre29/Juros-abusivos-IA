import pdfplumber
import io
import base64
from typing import Optional


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extrai texto de um PDF usando pdfplumber.
    Retorna o texto completo com marcadores de página e tabelas.
    """
    text_parts = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_texts = []

                # Extrai texto com tolerância maior para layouts complexos
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text and text.strip():
                    page_texts.append(text)

                # Se pouco texto, tenta extrair por palavras (melhor para tabelas e colunas)
                if not text or len(text.strip()) < 50:
                    words = page.extract_words(
                        x_tolerance=5,
                        y_tolerance=5,
                        keep_blank_chars=False,
                        use_text_flow=True
                    )
                    if words:
                        word_text = " ".join(w["text"] for w in words)
                        if len(word_text.strip()) > len((text or "").strip()):
                            page_texts = [word_text]

                # Extrai tabelas separadamente
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        table_text = "\n[TABELA]\n"
                        for row in table:
                            if row:
                                row_cells = [str(cell).strip() if cell else "" for cell in row]
                                row_text = " | ".join(row_cells)
                                if row_text.strip(" |"):
                                    table_text += row_text + "\n"
                        page_texts.append(table_text)

                if page_texts:
                    combined = "\n".join(page_texts)
                    text_parts.append(f"--- Página {page_num} ---\n{combined}")

        full_text = "\n\n".join(text_parts)
        return full_text if full_text.strip() else ""

    except Exception as e:
        return f"Erro ao processar PDF: {str(e)}"


def extract_pages_as_images(file_bytes: bytes, max_pages: int = 20, dpi: int = 100) -> list:
    """
    Converte páginas do PDF em imagens base64 para enviar ao Claude Vision.
    Usado quando o texto extraído é insuficiente (PDFs escaneados/digitalizados).

    - max_pages: máximo de páginas (Claude aceita até 20 imagens por requisição)
    - dpi=100: resolução reduzida para economizar tokens mas ainda legível
    - Retorna lista de strings base64 de imagens JPEG (menor que PNG).
    """
    images_b64 = []
    try:
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(
            file_bytes,
            dpi=dpi,
            first_page=1,
            last_page=max_pages,
            fmt="jpeg"
        )
        for page_img in pages:
            buf = io.BytesIO()
            # JPEG com qualidade 75 reduz bastante o tamanho sem perder legibilidade
            page_img.save(buf, format="JPEG", quality=75, optimize=True)
            buf.seek(0)
            images_b64.append(base64.standard_b64encode(buf.read()).decode("utf-8"))
    except ImportError:
        pass  # pdf2image não instalado
    except Exception:
        pass
    return images_b64


def get_pdf_info(file_bytes: bytes) -> dict:
    """Retorna informações básicas do PDF."""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return {
                "pages": len(pdf.pages),
                "metadata": pdf.metadata or {}
            }
    except Exception:
        return {"pages": 0, "metadata": {}}


def needs_vision(extracted_text: str, min_chars: int = 300) -> bool:
    """
    Retorna True se o texto extraído for insuficiente e o documento
    precisar ser analisado via imagem (PDF escaneado ou digitalizado).
    """
    if not extracted_text or not extracted_text.strip():
        return True
    clean = extracted_text.replace("--- Página", "").replace("---", "").strip()
    return len(clean) < min_chars
