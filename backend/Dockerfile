FROM python:3.11-slim

# Dependências do sistema: pdfplumber, Pillow, Node.js (para geração de .docx profissional)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    poppler-utils \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instala dependências Node.js para os scripts de geração de documentos
COPY docx_scripts/package.json docx_scripts/
RUN cd docx_scripts && npm install --omit=dev

# Copia o código
COPY . .

# Porta exposta
EXPOSE $PORT

# Comando de inicialização
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
