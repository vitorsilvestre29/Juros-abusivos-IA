/**
 * Gerador de Petição Inicial — formato escritório brasileiro
 * Recebe JSON via stdin, escreve .docx no stdout
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageNumber, TabStopType, TabStopPosition, LevelFormat,
} = require('docx');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', async () => {
  const data = JSON.parse(raw);
  const { client_name, client_cpf, client_address, case_type, peticao_text, date_str } = data;

  const BLUE  = '003366';
  const BLACK = '000000';
  const GRAY  = '595959';
  const LINE  = 'C0C0C0';
  const BG    = 'EEF3F8';
  const RED   = '8B0000';

  const pt = n => n * 20;

  function hr(color = LINE, size = 6) {
    return new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size, color } },
      spacing: { before: 80, after: 160 },
      children: [],
    });
  }

  function spacer(n = 1) {
    return new Paragraph({ children: [new TextRun('')], spacing: { after: pt(n * 6) } });
  }

  // ── Parsers de linha ─────────────────────────────────────────────────────────
  const ROMANO      = /^(I{1,3}V?|IV|VI{0,3}|VII|VIII|IX|X{1,3})(\.[0-9]+)?\s*[—\-–\.]\s*\S/i;
  const ARABIC_NUM  = /^[0-9]{1,2}[\.)] /;
  const EXMO_LINE   = /^excelent[ií]ssim/i;
  const ACAO_LINE   = /^a[çc][aã]o\s/i;
  const DOS_PEDIDOS = /^(dos pedidos|pedidos)/i;

  function parsePeticao(text) {
    const lines = text.split('\n');
    const paragraphs = [];

    for (const line of lines) {
      const s = line.trim();
      if (!s) { paragraphs.push(spacer(0.3)); continue; }

      const letters = s.replace(/[^a-záàéêíóõúüça-z]/gi, '');
      const allCaps = letters.length > 0 && letters === letters.toUpperCase() && s.length < 120;

      // Endereçamento ao juiz
      if (EXMO_LINE.test(s)) {
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(6), after: pt(3) },
          children: [new TextRun({ text: s.toUpperCase(), size: 24, bold: true, color: BLUE, font: 'Arial' })],
        }));
        continue;
      }

      // Título da ação (AÇÃO REVISIONAL...)
      if (allCaps && (ACAO_LINE.test(s) || s.includes('AÇ') || s.includes('REQUER')) && s.length < 100) {
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(6), after: pt(6), line: 360 },
          children: [new TextRun({ text: s, size: 26, bold: true, color: BLUE, font: 'Arial' })],
        }));
        continue;
      }

      // Seção romana (I —, II —, II.1 —)
      if (ROMANO.test(s)) {
        paragraphs.push(new Paragraph({
          spacing: { before: pt(10), after: pt(4) },
          children: [new TextRun({ text: s, size: 25, bold: true, color: BLUE, font: 'Arial' })],
        }));
        continue;
      }

      // Título em maiúsculas curto
      if (allCaps && s.length > 4 && s.length < 90) {
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: pt(8), after: pt(4) },
          children: [new TextRun({ text: s, size: 24, bold: true, color: BLUE, font: 'Arial' })],
        }));
        continue;
      }

      // Pedidos numerados
      if (ARABIC_NUM.test(s) && DOS_PEDIDOS.test(paragraphs.slice(-10).map(p =>
        p.children?.[0]?.text || '').join(''))) {
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 709, hanging: 360 },
          spacing: { after: pt(3), line: 360, lineRule: 'auto' },
          children: [new TextRun({ text: s, size: 24, font: 'Times New Roman', color: BLACK })],
        }));
        continue;
      }

      // Parágrafo normal com recuo
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 709 },
        spacing: { after: pt(4), line: 360, lineRule: 'auto' },
        children: [new TextRun({ text: s, size: 24, font: 'Times New Roman', color: BLACK })],
      }));
    }

    return paragraphs;
  }

  // ── Metadata box ─────────────────────────────────────────────────────────────
  function metaRow(lbl, val) {
    const mkCell = (txt, isBg) => new TableCell({
      width: { size: isBg ? 2200 : 7000, type: WidthType.DXA },
      shading: isBg ? { fill: BG, type: ShadingType.CLEAR } : {},
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      borders: Object.fromEntries(['top','bottom','left','right'].map(s => [s, { style: BorderStyle.NONE }])),
      children: [new Paragraph({ children: [new TextRun({ text: txt, size: 20, bold: isBg, font: 'Arial', color: isBg ? BLUE : BLACK })] })],
    });
    return new TableRow({ children: [mkCell(lbl, true), mkCell(val, false)] });
  }

  const metaTable = new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [2200, 7000],
    rows: [
      metaRow('REQUERENTE', client_name || 'Não informado'),
      metaRow('CPF', client_cpf || 'Não informado'),
      metaRow('ENDEREÇO', client_address || 'Não informado'),
      metaRow('TIPO DE AÇÃO', (case_type || 'N/I').toUpperCase()),
      metaRow('AUTUAÇÃO', date_str || new Date().toLocaleDateString('pt-BR')),
    ],
    borders: {
      insideH: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      insideV: { style: BorderStyle.NONE },
      top:     { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      left:    { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    },
  });

  // ── Header & Footer ──────────────────────────────────────────────────────────
  const docHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'PETIÇÃO INICIAL  •  DIREITO DO CONSUMIDOR BANCÁRIO', size: 16, color: GRAY, font: 'Arial' }),
          new TextRun({ children: ['\t', PageNumber.CURRENT], size: 16, color: GRAY, font: 'Arial' }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
        spacing: { after: 160 },
      }),
    ],
  });

  const docFooter = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
        spacing: { before: 100 },
        children: [new TextRun({ text: 'Petição Inicial — gerada via Portal Jurídico AI  |  Documento sujeito à revisão do advogado', size: 16, color: GRAY, font: 'Arial' })],
      }),
    ],
  });

  // ── Document ─────────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    numbering: {
      config: [{
        reference: 'pedidos',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 },
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [
        // Barra de identificação do processo
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(4), after: pt(2) },
          children: [new TextRun({ text: 'PETIÇÃO INICIAL', size: 36, bold: true, color: BLUE, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(10) },
          children: [new TextRun({
            text: 'Ação Revisional de Contrato Bancário c/c Repetição de Indébito e Indenização por Danos Morais',
            size: 20, italic: true, color: GRAY, font: 'Arial',
          })],
        }),

        hr(BLUE, 8),
        spacer(0.5),
        metaTable,
        spacer(0.5),
        hr(BLUE, 8),
        spacer(1),

        // Conteúdo gerado pela IA
        ...parsePeticao(peticao_text || ''),

        spacer(2),
        hr(),

        // Bloco de assinatura
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: pt(12), after: pt(2) },
          children: [new TextRun({ text: `[Cidade/UF], ${date_str || new Date().toLocaleDateString('pt-BR')}`, size: 22, font: 'Times New Roman' })],
        }),
        spacer(3),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '_______________________________________________', size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(2) },
          children: [new TextRun({ text: '[Nome do Advogado]', size: 24, bold: true, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'OAB/[Estado] nº [Número]', size: 22, color: GRAY, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Advogado(a) do(a) Requerente', size: 20, italic: true, color: GRAY, font: 'Arial' })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  process.stdout.write(buffer);
});
