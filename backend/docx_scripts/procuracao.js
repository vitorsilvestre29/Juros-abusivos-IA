/**
 * Gerador de Procuração Ad Judicia — formato escritório brasileiro
 * Recebe JSON via stdin, escreve .docx no stdout
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageNumber, TabStopType, TabStopPosition,
} = require('docx');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', async () => {
  const data = JSON.parse(raw);
  const {
    client_name, client_cpf, client_rg, client_address,
    client_nationality, client_marital, client_profession, date_str,
  } = data;

  const BLUE  = '003366';
  const BLACK = '000000';
  const GRAY  = '595959';
  const LINE  = 'C0C0C0';
  const BG    = 'EEF3F8';

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

  function justified(runs, indent = false) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: indent ? { firstLine: 709 } : {},
      spacing: { after: pt(4), line: 360, lineRule: 'auto' },
      children: runs,
    });
  }

  function label(txt) {
    return new TextRun({ text: txt, bold: true, size: 24, font: 'Arial', color: BLUE });
  }

  function value(txt) {
    return new TextRun({ text: txt, size: 24, font: 'Times New Roman', color: BLACK });
  }

  // ── Dados do outorgante ──────────────────────────────────────────────────────
  const nome       = client_name        || '_______________________________';
  const cpf        = client_cpf         || '___.___.___-__';
  const rg         = client_rg          || '______________';
  const nac        = client_nationality || 'brasileiro(a)';
  const ecivil     = client_marital     || '_______________';
  const prof       = client_profession  || '_______________';
  const end        = client_address     || '____________________________________________';
  const hoje       = date_str           || new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  // ── Texto da procuração em blocos ────────────────────────────────────────────
  const OUTORGANTE_BLOCK = [
    justified([label('OUTORGANTE: '), value(`${nome}, ${nac}, ${ecivil}, ${prof}, portador(a) do RG nº ${rg} e inscrito(a) no CPF sob o nº ${cpf}, residente e domiciliado(a) em ${end}.`)]),
    spacer(0.5),
  ];

  const OUTORGADO_BLOCK = [
    justified([
      label('OUTORGADO(S): '),
      value('[NOME DO ADVOGADO], [NACIONALIDADE], [ESTADO CIVIL], advogado(a), inscrito(a) na Ordem dos Advogados do Brasil, seccional [ESTADO], sob o nº [NÚMERO OAB], com escritório profissional situado à [ENDEREÇO COMPLETO DO ESCRITÓRIO], CEP [XXXXX-XXX], [CIDADE/UF].'),
    ]),
    spacer(0.5),
  ];

  const PODERES_INTRO = justified([
    label('PODERES: '),
    value('Por meio do presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui seu(sua) bastante procurador(a) o(a) OUTORGADO(A) acima qualificado(a), conferindo-lhe amplos, gerais e ilimitados poderes para o foro em geral, com a cláusula '),
    new TextRun({ text: 'AD JUDICIA ET EXTRA', size: 24, italic: true, font: 'Times New Roman' }),
    value(', podendo propor ações, contestar, reconvir, desistir, transigir, firmar compromissos ou acordos, receber e dar quitação, agir como assistente, representar o(a) Outorgante em audiências, assinar petições, termos e demais atos necessários ao bom e fiel cumprimento deste mandato, inclusive receber citações e intimações, com poderes especiais para confessar, desistir, renunciar ao direito em que se funda a ação, receber e dar quitação, firmar compromisso e transigir, podendo substabelecer com ou sem reserva de iguais poderes, notadamente para:'),
  ]);

  const PODER_ITEMS = [
    'I — Propor ação revisional de contrato bancário e/ou ação de repetição de indébito em face de instituições financeiras, com o fim de discutir a abusividade de juros, tarifas e encargos bancários, venda casada de seguros e demais irregularidades contratuais;',
    'II — Requerer tutelas provisórias de urgência, antecipadas ou cautelares, inclusive liminares, visando à suspensão imediata de descontos ou cobranças indevidas;',
    'III — Receber valores, dar quitação, transigir e firmar acordos em nome do(a) Outorgante, inclusive em fase de cumprimento de sentença;',
    'IV — Interpor recursos de qualquer natureza, inclusive perante os Tribunais Superiores (STJ e STF), e apresentar contrarrazões;',
    'V — Praticar todos os demais atos necessários ao fiel e integral desempenho deste mandato, inclusive os que exijam poderes especiais por força de lei.',
  ].map(txt =>
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: 709 },
      spacing: { after: pt(3), line: 360, lineRule: 'auto' },
      children: [new TextRun({ text: txt, size: 24, font: 'Times New Roman', color: BLACK })],
    })
  );

  // ── Header ───────────────────────────────────────────────────────────────────
  const docHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'ESCRITÓRIO JURÍDICO  •  PROCURAÇÃO AD JUDICIA', size: 16, color: GRAY, font: 'Arial' }),
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
        children: [new TextRun({ text: 'Procuração Ad Judicia et Extra — Portal Jurídico AI  |  Documento para assinatura', size: 16, color: GRAY, font: 'Arial' })],
      }),
    ],
  });

  // ── Metadados ────────────────────────────────────────────────────────────────
  function metaRow(lbl, val) {
    const mkCell = (txt, isBg) => new TableCell({
      width: { size: isBg ? 1800 : 7400, type: WidthType.DXA },
      shading: isBg ? { fill: BG, type: ShadingType.CLEAR } : {},
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      borders: Object.fromEntries(['top','bottom','left','right'].map(s => [s, { style: BorderStyle.NONE }])),
      children: [new Paragraph({ children: [new TextRun({ text: txt, size: 20, bold: isBg, font: 'Arial', color: isBg ? BLUE : BLACK })] })],
    });
    return new TableRow({ children: [mkCell(lbl, true), mkCell(val, false)] });
  }

  const metaTable = new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [1800, 7400],
    rows: [
      metaRow('OUTORGANTE', nome),
      metaRow('CPF', cpf),
      metaRow('RG', rg),
      metaRow('ENDEREÇO', end),
    ],
    borders: {
      insideH: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      insideV: { style: BorderStyle.NONE },
      top:     { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: BLUE },
      left:    { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    },
  });

  // ── Document ─────────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
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
        // Título
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(8), after: pt(2) },
          children: [new TextRun({ text: 'PROCURAÇÃO', size: 40, bold: true, color: BLUE, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(10) },
          children: [new TextRun({ text: 'AD JUDICIA ET EXTRA', size: 26, color: BLUE, font: 'Arial' })],
        }),

        hr(BLUE, 8),
        spacer(0.5),
        metaTable,
        spacer(0.5),
        hr(BLUE, 8),
        spacer(1),

        ...OUTORGANTE_BLOCK,
        ...OUTORGADO_BLOCK,
        PODERES_INTRO,
        spacer(0.5),
        ...PODER_ITEMS,
        spacer(1),

        // Local e data
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: pt(12), after: pt(2) },
          children: [new TextRun({ text: `[Cidade/UF], ${hoje}.`, size: 24, font: 'Times New Roman' })],
        }),
        spacer(3),

        // Assinatura do outorgante
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '_______________________________________________', size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(2) },
          children: [new TextRun({ text: nome, size: 24, bold: true, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `CPF: ${cpf}`, size: 22, color: GRAY, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'OUTORGANTE', size: 20, bold: true, color: BLUE, font: 'Arial' })],
        }),

        spacer(3),

        // Assinatura do outorgado
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '_______________________________________________', size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: pt(2) },
          children: [new TextRun({ text: '[NOME DO ADVOGADO]', size: 24, bold: true, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'OAB/[Estado] nº [Número]', size: 22, color: GRAY, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'OUTORGADO', size: 20, bold: true, color: BLUE, font: 'Arial' })],
        }),

        spacer(3),
        hr(),

        // Testemunhas
        new Paragraph({
          spacing: { before: pt(4), after: pt(6) },
          children: [new TextRun({ text: 'TESTEMUNHAS:', size: 22, bold: true, color: BLUE, font: 'Arial' })],
        }),

        ...['1)', '2)'].flatMap(n => [
          new Paragraph({
            children: [new TextRun({ text: `${n} Nome: _______________________________________  CPF: _______________________`, size: 22, font: 'Times New Roman' })],
            spacing: { after: pt(4) },
          }),
        ]),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  process.stdout.write(buffer);
});
