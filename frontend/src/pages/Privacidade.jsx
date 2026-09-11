import { Link } from 'react-router-dom'

const N = '#0D2137'
const O = '#E8920A'
const bg = '#F8F9FC'
const white = '#FFFFFF'
const border = '#D5E2F2'
const muted = '#566880'
const mutedDark = '#8FA3B8'
const OBorder = 'rgba(232,146,10,0.3)'
const OPale = 'rgba(232,146,10,0.15)'
const serif = "'Merriweather', Georgia, serif"
const sans = "'Manrope', system-ui, sans-serif"

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: N, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid ' + border, letterSpacing: '-0.3px' }}>
        {title}
      </h2>
      <div style={{ color: muted, fontSize: 15, lineHeight: 1.85 }}>
        {children}
      </div>
    </section>
  )
}

function Li({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: O, flexShrink: 0, marginTop: 8 }} />
      <span>{children}</span>
    </div>
  )
}

export default function Privacidade() {
  const updated = '10 de setembro de 2026'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <nav style={{ background: N, borderBottom: '1px solid ' + OBorder, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: serif, color: O, fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
            LaudoJuros
          </Link>
          <Link to="/" style={{ color: mutedDark, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            Voltar ao inicio
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: OPale, border: '1px solid ' + OBorder, borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
            <span style={{ color: O, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>LGPD</span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 700, color: N, marginBottom: 12, letterSpacing: '-1px', lineHeight: 1.15 }}>
            Politica de Privacidade
          </h1>
          <p style={{ color: muted, fontSize: 15, lineHeight: 1.7 }}>
            Esta politica descreve como a <strong style={{ color: N }}>LaudoJuros</strong> coleta, usa, armazena e protege seus dados pessoais, em conformidade com a <strong style={{ color: N }}>Lei n. 13.709/2018 (Lei Geral de Protecao de Dados — LGPD)</strong>.
          </p>
          <p style={{ color: muted, fontSize: 13, marginTop: 12 }}>Ultima atualizacao: {updated}</p>
        </div>

        {/* Destaque LGPD */}
        <div style={{ background: N, border: '1px solid ' + OBorder, borderRadius: 16, padding: '28px 32px', marginBottom: 48, display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🔒</div>
          <div>
            <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Compromisso com sua privacidade</p>
            <p style={{ color: mutedDark, fontSize: 15, lineHeight: 1.75, margin: 0 }}>
              Seus contratos e dados pessoais sao utilizados <strong style={{ color: white }}>exclusivamente</strong> para a prestacao do servico de analise. Nao vendemos nem alugamos seus dados pessoais. O compartilhamento com terceiros ocorre apenas para viabilizar o servico, processar pagamentos e medir a eficacia dos nossos anuncios, conforme detalhado nesta politica. Voce mantem controle sobre suas informacoes.
            </p>
          </div>
        </div>

        <Section title="1. Quem e o Controlador dos seus dados">
          <p style={{ marginBottom: 12 }}>O controlador responsavel pelo tratamento dos seus dados pessoais e:</p>
          <div style={{ background: '#F8F9FC', border: '1px solid ' + border, borderRadius: 12, padding: '18px 22px', marginTop: 4 }}>
            <p style={{ color: N, fontWeight: 700, marginBottom: 4 }}>LaudoJuros</p>
            <p>Servico operado por <strong style={{ color: N }}>Visorm</strong> — Vitor Cesar dos Santos Silvestre (empresario individual / MEI)</p>
            <p>CNPJ 66.430.538/0001-44 — Barretos/SP</p>
            <p>Contato: <a href="mailto:visormsolutions@outlook.com" style={{ color: O, textDecoration: 'none' }}>visormsolutions@outlook.com</a></p>
          </div>
        </Section>

        <Section title="2. Dados pessoais que coletamos">
          <p style={{ marginBottom: 14 }}>Coletamos apenas os dados estritamente necessarios para prestar o servico:</p>
          <Li><strong style={{ color: N }}>Dados de cadastro:</strong> nome, endereco de e-mail e senha (criptografada). Fornecidos voluntariamente ao criar conta.</Li>
          <Li><strong style={{ color: N }}>Dados de contato opcionais:</strong> numero de telefone (WhatsApp), para envio de notificacoes sobre a analise. Seu fornecimento e opcional.</Li>
          <Li><strong style={{ color: N }}>Documentos enviados:</strong> arquivos PDF ou imagens dos contratos de credito enviados para analise. Esses documentos podem conter dados financeiros e pessoais de terceiros.</Li>
          <Li><strong style={{ color: N }}>Dados de uso:</strong> logs de acesso, endereco IP, tipo de dispositivo e navegador. Coletados automaticamente para seguranca e melhoria do servico.</Li>
          <Li><strong style={{ color: N }}>Dados de navegacao e publicidade:</strong> identificadores de cookie (_fbp e _fbc), endereco IP e eventos de navegacao, de checkout e de compra coletados pelo Meta Pixel para medicao de anuncios e remarketing. Ver secao 8.</Li>
          <Li><strong style={{ color: N }}>Dados de pagamento:</strong> transacoes via PIX sao processadas por gateway externo (Mercado Pago). Nao armazenamos dados de cartao de credito.</Li>
        </Section>

        <Section title="3. Finalidade e base legal do tratamento">
          <p style={{ marginBottom: 14 }}>Seus dados sao tratados com as seguintes finalidades e bases legais, nos termos do art. 7 da LGPD:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {[
              { finalidade: 'Prestacao do servico de analise contratual', base: 'Execucao de contrato (art. 7, V)', icon: '⚙️' },
              { finalidade: 'Envio de resultado da analise por WhatsApp (se telefone fornecido)', base: 'Consentimento (art. 7, I)', icon: '💬' },
              { finalidade: 'Processamento de pagamento', base: 'Execucao de contrato (art. 7, V)', icon: '💳' },
              { finalidade: 'Medicao de conversao e remarketing de anuncios (Meta Pixel)', base: 'Interesse legitimo (art. 7, IX)', icon: '📊' },
              { finalidade: 'Prevencao a fraudes e seguranca da plataforma', base: 'Interesse legitimo (art. 7, IX)', icon: '🛡️' },
              { finalidade: 'Cumprimento de obrigacoes legais e fiscais', base: 'Obrigacao legal (art. 7, II)', icon: '⚖️' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#F8F9FC', border: '1px solid ' + border, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ color: N, fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.finalidade}</p>
                  <p style={{ color: muted, fontSize: 12 }}>Base legal: {item.base}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>Quando o tratamento se apoia em legitimo interesse (art. 7, IX), voce pode se opor a ele a qualquer momento, nos termos do paragrafo 2 do art. 18 da LGPD, pelo e-mail de contato indicado na secao 11.</p>
        </Section>

        <Section title="4. Compartilhamento de dados">
          <p style={{ marginBottom: 14 }}>Seus dados <strong style={{ color: N }}>nao sao vendidos</strong> nem alugados. O compartilhamento ocorre apenas nos seguintes casos:</p>
          <Li><strong style={{ color: N }}>Inteligencia artificial (Anthropic / Claude):</strong> o conteudo dos contratos e processado por modelo de linguagem hospedado pela Anthropic, em servidores nos Estados Unidos, para gerar a analise. Os dados sao tratados conforme a politica de privacidade da Anthropic e nao sao usados para treinar modelos.</Li>
          <Li><strong style={{ color: N }}>Processamento de pagamento (Mercado Pago):</strong> dados minimos de transacao compartilhados para confirmacao de pagamento.</Li>
          <Li><strong style={{ color: N }}>Provedor de API de mensageria (WhatsApp):</strong> se voce forneceu telefone, o resultado da analise e enviado por meio de provedor terceirizado de envio de mensagens. Nenhum dado adicional e compartilhado.</Li>
          {/* PENDENTE: confirmar provedor de mensageria WhatsApp */}
          <Li><strong style={{ color: N }}>Meta Platforms, Inc. / Meta Platforms Ireland Ltd.:</strong> por meio do Meta Pixel presente no site, a Meta recebe identificadores de cookie (_fbp e _fbc), endereco IP e eventos de navegacao, de checkout e de compra (incluindo valor da transacao e identificador da analise), para medicao de conversao de anuncios e remarketing. Ver secao 8.</Li>
          <Li><strong style={{ color: N }}>Provedor de infraestrutura:</strong> empresa de hospedagem do servidor (VPS) onde a aplicacao e o banco de dados sao executados, atuando como operador de dados sob nossas instrucoes.</Li>
          <Li><strong style={{ color: N }}>Autoridades competentes:</strong> quando exigido por lei, ordem judicial ou regulamentacao aplicavel.</Li>
        </Section>

        <Section title="5. Retencao e exclusao dos dados">
          <p style={{ marginBottom: 12 }}>Os dados sao retidos pelos seguintes prazos:</p>
          <Li><strong style={{ color: N }}>Documentos enviados (contratos):</strong> armazenados pelo prazo necessario para entrega do servico e, em seguida, excluidos automaticamente em ate 90 dias apos a conclusao da analise.</Li>
          <Li><strong style={{ color: N }}>Dados de conta:</strong> mantidos enquanto a conta estiver ativa. Ao solicitar exclusao, os dados sao eliminados em ate 30 dias, salvo obrigacao legal de retencao.</Li>
          <Li><strong style={{ color: N }}>Logs de acesso:</strong> retidos por ate 6 meses, conforme o Marco Civil da Internet (Lei 12.965/2014, art. 15).</Li>
          <Li><strong style={{ color: N }}>Dados de pagamento:</strong> registros fiscais retidos por 5 anos, conforme legislacao tributaria.</Li>
        </Section>

        <Section title="6. Seus direitos como titular dos dados">
          <p style={{ marginBottom: 14 }}>Nos termos dos arts. 17 a 22 da LGPD, voce tem os seguintes direitos, exerciveis a qualquer momento:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 4 }}>
            {[
              { direito: 'Confirmar tratamento', desc: 'Saber se tratamos seus dados' },
              { direito: 'Acessar seus dados', desc: 'Obter copia dos dados que temos' },
              { direito: 'Correcao', desc: 'Corrigir dados incompletos ou errados' },
              { direito: 'Anonimizacao ou exclusao', desc: 'Eliminar dados desnecessarios' },
              { direito: 'Portabilidade', desc: 'Receber seus dados em formato estruturado' },
              { direito: 'Revogacao de consentimento', desc: 'Retirar consentimento a qualquer tempo' },
              { direito: 'Oposicao', desc: 'Opor-se a tratamento baseado em legitimo interesse' },
              { direito: 'Informacao sobre compartilhamento', desc: 'Saber com quem seus dados sao compartilhados' },
              { direito: 'Peticao a ANPD', desc: 'Reclamar a Autoridade Nacional de Protecao de Dados' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#F8F9FC', border: '1px solid ' + border, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: O, flexShrink: 0 }} />
                  <p style={{ color: N, fontWeight: 700, fontSize: 13, margin: 0 }}>{item.direito}</p>
                </div>
                <p style={{ color: muted, fontSize: 12, margin: 0, paddingLeft: 14 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>Para exercer qualquer direito, entre em contato pelo e-mail <a href="mailto:visormsolutions@outlook.com" style={{ color: O, textDecoration: 'none' }}>visormsolutions@outlook.com</a>. Respondemos em ate 15 dias.</p>
        </Section>

        <Section title="7. Seguranca dos dados">
          <p style={{ marginBottom: 12 }}>Adotamos medidas tecnicas e organizacionais para proteger seus dados:</p>
          <Li>Transmissao criptografada via HTTPS/TLS em todas as comunicacoes</Li>
          <Li>Senhas armazenadas com hash bcrypt — nunca em texto simples</Li>
          <Li>Tokens de acesso JWT com expiracao automatica</Li>
          <Li>Aplicacao e banco de dados PostgreSQL hospedados em servidor privado virtual (VPS) contratado junto a provedor de infraestrutura, com acesso restrito por chave SSH, firewall e comunicacao cifrada</Li>
          {/* PENDENTE: confirmar país do data center */}
          <Li>Acesso aos dados limitado aos sistemas e equipe estritamente necessarios</Li>
          <Li>Monitoramento de acessos e logs de auditoria</Li>
        </Section>

        <Section title="8. Cookies e tecnologias de rastreamento">
          <p style={{ marginBottom: 12 }}>Utilizamos cookies estritamente necessarios para o funcionamento da plataforma (autenticacao e preferencias de sessao).</p>
          <p style={{ marginBottom: 12 }}>Alem disso, o site utiliza o <strong style={{ color: N }}>Meta Pixel (Facebook Pixel)</strong>, tecnologia da <strong style={{ color: N }}>Meta Platforms, Inc.</strong> (Estados Unidos) e da <strong style={{ color: N }}>Meta Platforms Ireland Ltd.</strong> (Irlanda):</p>
          <Li><strong style={{ color: N }}>O que e:</strong> trecho de codigo que carrega o script fbevents.js a partir de connect.facebook.net e grava os cookies _fbp e _fbc no seu navegador.</Li>
          <Li><strong style={{ color: N }}>Finalidade:</strong> medicao de conversao das nossas campanhas de publicidade e remarketing (exibicao de anuncios da LaudoJuros nas plataformas da Meta).</Li>
          <Li><strong style={{ color: N }}>Dados coletados:</strong> identificadores dos cookies _fbp e _fbc, endereco IP, dados do navegador e do dispositivo, paginas visitadas e eventos de checkout e de compra, incluindo o valor da transacao e o identificador da analise.</Li>
          <Li><strong style={{ color: N }}>Base legal:</strong> legitimo interesse em divulgar o servico e medir a eficacia dos anuncios (art. 7, IX da LGPD). Voce pode se opor a esse tratamento a qualquer momento, nos termos do paragrafo 2 do art. 18 da LGPD.</Li>
          <Li><strong style={{ color: N }}>Transferencia internacional:</strong> os dados sao transmitidos a servidores da Meta nos Estados Unidos e na Irlanda (ver secao 9).</Li>
          <p style={{ marginTop: 14, marginBottom: 8 }}><strong style={{ color: N }}>Como recusar (opt-out):</strong></p>
          <Li>Configure o seu navegador para bloquear cookies de terceiros ou utilize uma extensao de bloqueio de rastreadores.</Li>
          <Li>Ajuste as suas preferencias de anuncios diretamente na Meta em <a href="https://www.facebook.com/adpreferences/ad_settings" target="_blank" rel="noopener noreferrer" style={{ color: O, textDecoration: 'none' }}>facebook.com/adpreferences/ad_settings</a>.</Li>
          <Li>Envie um pedido de oposicao para <a href="mailto:visormsolutions@outlook.com" style={{ color: O, textDecoration: 'none' }}>visormsolutions@outlook.com</a> e trataremos a sua solicitacao.</Li>
          <p style={{ marginTop: 12 }}>Nao utilizamos outras ferramentas de analytics de terceiros alem do Meta Pixel.</p>
        </Section>

        <Section title="9. Transferencia internacional de dados">
          <p style={{ marginBottom: 12 }}>Alguns tratamentos envolvem transferencia de dados para fora do Brasil:</p>
          <Li><strong style={{ color: N }}>Anthropic (Claude):</strong> o conteudo dos contratos e enviado a servidores da Anthropic, nos Estados Unidos, para gerar a analise. A Anthropic nao utiliza os dados para treinar modelos.</Li>
          <Li><strong style={{ color: N }}>Meta Platforms:</strong> os dados de navegacao e de eventos coletados pelo Meta Pixel sao transmitidos a servidores da Meta nos Estados Unidos e na Irlanda, para medicao de anuncios e remarketing.</Li>
          <p style={{ marginTop: 12 }}>Essas transferencias se apoiam em clausulas contratuais adequadas firmadas com os respectivos fornecedores e na necessidade de execucao do contrato e no legitimo interesse, nos termos do art. 33 da LGPD.</p>
        </Section>

        <Section title="10. Alteracoes a esta politica">
          <p>Esta politica pode ser atualizada periodicamente. Alteracoes relevantes serao comunicadas por e-mail aos usuarios cadastrados com pelo menos 15 dias de antecedencia. A versao vigente sempre estara disponivel nesta pagina.</p>
        </Section>

        <Section title="11. Contato e Encarregado (DPO)">
          <p style={{ marginBottom: 12 }}>Para duvidas, solicitacoes ou para exercer seus direitos previstos na LGPD:</p>
          <div style={{ background: '#F8F9FC', border: '1px solid ' + border, borderRadius: 12, padding: '18px 22px' }}>
            <p style={{ color: N, fontWeight: 700, marginBottom: 4 }}>Canal de privacidade</p>
            <p>E-mail: <a href="mailto:visormsolutions@outlook.com" style={{ color: O, textDecoration: 'none' }}>visormsolutions@outlook.com</a></p>
            <p style={{ marginTop: 8, fontSize: 13, color: muted }}>Prazo de resposta: ate 15 dias corridos, conforme art. 19 da LGPD.</p>
          </div>
        </Section>

        {/* Footer da pagina */}
        <div style={{ borderTop: '1px solid ' + border, paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: muted, fontSize: 13 }}>Ultima atualizacao: {updated}</p>
          <Link to="/" style={{ color: O, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Voltar ao inicio</Link>
        </div>

      </main>
    </div>
  )
}
