/**
 * Gerador de Parecer Técnico Jurídico — formato escritório brasileiro
 * Recebe JSON via stdin, escreve .docx no stdout
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType,
  HeadingLevel, PageNumber, TabStopType, TabStopPosition,
  LevelFormat, NumberFormat,
} = require('docx');
const fs = require('fs');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', async () => {
  const data = JSON.parse(raw);
  const { client_name, client_cpf, client_address, case_type, parecer_text, date_str } = data;

  // ── helpers ─────────────────────────────────────────────────────────────────
  const BLUE  = '003366';
  const BLACK = '000000';
  const GRAY  = '595959';
  const LINE  = 'C0C0C0';
  const BG    = 'EEF3F8';

  const pt = n => n * 20; // half-points → pt in docx-js

  function hr(color = LINE) {
    return new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color } },
      spacing: { before: 80, after: 80 },
      children: [],
    });
  }

  function spacer(lines = 1) {
    return new Paragraph({ children: [new TextRun('')], spacing: { after: pt(lines * 6) } });
  }

  function heading(text, level = 1) {
    const sizes = { 1: 28, 2: 24, 3: 22 };
    return new Paragraph({
      spacing: { before: pt(10), after: pt(4) },
      children: [new TextRun({
        text,
        bold: true,
        size: sizes[level] || 24,
        color: BLUE,
        font: 'Arial',
      })],
    });
  }

  function body(text) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 709 }, // ~1.25 cm
      spacing: { after: pt(4), line: 360, lineRule: 'auto' },
      children: [new TextRun({ text, size: 24, font: 'Times New Roman', color: BLACK })],
    });
  }

  function bold_body(text) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: pt(3), line: 360, lineRule: 'auto' },
      children: [new TextRun({ text, size: 24, bold: true, font: 'Times New Roman', color: BLACK })],
    });
  }

  // ── parse AI text into paragraphs ────────────────────────────────────────────
  const ROMANO = /^(I{1,3}V?|IV|VI{0,3}|VII|VIII|IX|X{1,3})(\.[0-9]+)?\s*[—\-–\.]\s*\S/i;
  const ARABIC  = /^[0-9]{1,2}[\.)] [A-ZÁÀÉÊÍÓÕÚ]/;

  function parseParecer(text) {
    const lines = text.split('\n');
    const paragraphs = [];
    for (const line of lines) {
      const s = line.trim();
      if (!s) { paragraphs.push(spacer(0.5)); continue; }

      const letters = s.replace(/[^a-záàéêíóõúüça-z]/gi, '');
      const allCaps = letters.length > 0 && letters === letters.toUpperCase() && s.length < 100;

      if (ROMANO.test(s)) {
        paragraphs.push(heading(s, 2));
      } else if (allCaps && s.length < 80) {
        paragraphs.push(heading(s, 1));
      } else if (ARABIC.test(s)) {
        paragraphs.push(bold_body(s));
      } else {
        paragraphs.push(body(s));
      }
    }
    return paragraphs;
  }

  // ── metadata table ──────────────────────────────────────────────────────────
  function metaRow(label, value) {
    const cell = (txt, bg = null, bold = false) => new TableCell({
      width: { size: bg ? 2000 : 7200, type: WidthType.DXA },
      shading: bg ? { fill: bg, type: ShadingType.CLEAR } : {},
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      children: [new Paragraph({
        children: [new TextRun({ text: txt, size: 20, bold, font: 'Arial', color: bold ? BLUE : BLACK })],
      })],
    });
    return new TableRow({ children: [cell(label, BG, true), cell(value)] });
  }

  const metaTable = new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [2000, 7200],
    rows: [
      metaRow('CLIENTE', client_name || 'Não informado'),
      metaRow('CPF', client_cpf || 'Não informado'),
      metaRow('ENDEREÇO', client_address || 'Não informado'),
      metaRow('TIPO DE CASO', (case_type || 'N/I').toUpperCase()),
      metaRow('DATA', date_str || new Date().toLocaleDateString('pt-BR')),
    ],
    borders: {
      insideH: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      insideV: { style: BorderStyle.NONE },
      top:     { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      left:    { style: BorderStyle.NONE },
      right:   { style: BorderStyle.NONE },
    },
  });

  // ── header ───────────────────────────────────────────────────────────────────
  const docHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'ESCRITÓRIO JURÍDICO  •  DIREITO DO CONSUMIDOR BANCÁRIO', size: 16, color: GRAY, font: 'Arial' }),
          new TextRun({ children: ['\t', PageNumber.CURRENT], size: 16, color: GRAY, font: 'Arial' }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
        spacing: { after: 160 },
      }),
    ],
  });

  // ── footer ───────────────────────────────────────────────────────────────────
  const docFooter = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
        spacing: { before: 100 },
        children: [
          new TextRun({ text: 'Parecer Técnico Jurídico — gerado via Portal Jurídico AI  |  Documento confidencial', size: 16, color: GRAY, font: 'Arial' }),
        ],
      }),
    ],
  });

  // ── document ─────────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },    // A4
          margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 }, // 3cm top/left, 2cm bot/right
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [
        // Título principal
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(8), after: pt(4) },
          children: [new TextRun({ text: 'PARECER TÉCNICO JURÍDICO', size: 36, bold: true, color: BLUE, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(12) },
          children: [new TextRun({ text: 'Direito do Consumidor Bancário  —  Análise de Abusividade Contratual', size: 20, italic: true, color: GRAY, font: 'Arial' })],
        }),

        hr(BLUE),
        spacer(0.5),
        metaTable,
        spacer(0.5),
        hr(BLUE),
        spacer(1),

        // Conteúdo gerado pela IA
        ...parseParecer(parecer_text || ''),

        spacer(2),
        hr(),

        // Bloco de assinatura
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: pt(12) },
          children: [new TextRun({ text: `[Cidade/UF], ${date_str || new Date().toLocaleDateString('pt-BR')}`, size: 22, font: 'Times New Roman' })],
        }),
        spacer(2),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '_______________________________________________', size: 24, font: 'Times New Roman' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(2) },
          children: [new TextRun({ text: '[Nome do Advogado Responsável]', size: 22, bold: true, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'OAB/[Estado] nº [Número]', size: 20, color: GRAY, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Advogado Especialista em Direito Bancário e do Consumidor', size: 20, italic: true, color: GRAY, font: 'Arial' })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  process.stdout.write(buffer);
});
