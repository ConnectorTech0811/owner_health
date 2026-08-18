const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.SMTP_USER || 'suporte.sistemas@connectortech.com.br';
  const pass = process.env.SMTP_PASS || 'hswwogfqyqhpaxda';
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const isSecure = process.env.SMTP_SECURE === 'ssl' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

/**
 * Envia e-mail de primeiro acesso com credenciais temporárias.
 * @param {object} opts
 * @param {string} opts.to         - Destinatário
 * @param {string} opts.nome       - Nome do usuário
 * @param {string} opts.email      - E-mail de acesso
 * @param {string} opts.senha      - Senha temporária (em texto plano, antes do hash)
 * @param {string} opts.perfil     - Ex: 'Cliente', 'Profissional de Saúde'
 */
const sendFirstAccessEmail = async ({ to, nome, email, senha, perfil = 'Usuário' }) => {
  const sysUrl = process.env.SYSTEM_URL || process.env.FRONTEND_URL || 'https://owner-health-ktsf.vercel.app';
  const transporter = createTransporter();

  const mailOptions = {
    from: `Owner Health <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Bem-vindo(a) ao Owner Health – Seu acesso foi criado',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 30px;">
        <div style="background: linear-gradient(135deg, #1d4ed8, #1e3a8a); border-radius: 16px; padding: 30px 40px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; font-size: 26px; margin: 0; letter-spacing: -0.5px;">Owner Health</h1>
          <p style="color: #bfdbfe; font-size: 13px; margin: 8px 0 0;">Plataforma de Gestão de Saúde</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 32px 40px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.7;">
            Seu acesso à plataforma <strong>Owner Health</strong> foi criado como <strong>${perfil}</strong>.
            Abaixo estão suas credenciais de acesso temporárias:
          </p>

          <div style="background: #f1f5f9; border-radius: 10px; padding: 20px 24px; margin: 24px 0; border-left: 4px solid #2563eb;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 130px;">🔑 E-mail:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">🔒 Senha temporária:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: bold; letter-spacing: 1px;">${senha}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #92400e; margin: 0;">
              ⚠️ <strong>Por segurança, você deverá alterar sua senha no primeiro acesso.</strong><br/>
              Utilize a opção "Esqueci minha senha" ou acesse as configurações do perfil após o login.
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0 10px;">
            <a href="${sysUrl}" style="background: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
              Acessar a Plataforma
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
            Ou acesse diretamente: <a href="${sysUrl}" style="color: #2563eb;">${sysUrl}</a>
          </p>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
          Se você não esperava receber este e-mail, entre em contato com a administração.<br/>
          Atenciosamente, <strong>Equipe Owner Health</strong>
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️  E-mail de primeiro acesso enviado para: ${to}`);
  } catch (err) {
    // Não falha o cadastro por erro de e-mail — apenas loga o aviso
    console.warn(`⚠️  Falha ao enviar e-mail de primeiro acesso para ${to}:`, err.message);
  }
};

const sendAppointmentTokenEmail = async ({ to, pacienteNome, medicoNome, dataFormatada, horaStr, tokenConfirmacao }) => {
  if (!to) return;
  const sysUrl = process.env.SYSTEM_URL || process.env.FRONTEND_URL || 'https://owner-health-ktsf.vercel.app';
  const transporter = createTransporter();

  const mailOptions = {
    from: `Owner Health <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ownerhealth.com.br'}>`,
    to,
    subject: `🔑 Código de Validação de Consulta (${tokenConfirmacao}) – Owner Health`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Owner Health</h1>
          <p style="color: #e0e7ff; font-size: 13px; margin: 6px 0 0;">Confirmação e Validação de Atendimento</p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Olá, <strong>${pacienteNome}</strong>!</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Sua consulta com <strong>${medicoNome}</strong> agendada para <strong>${dataFormatada} às ${horaStr}</strong> precisa ser confirmada.
          </p>

          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; border: 2px dashed #6366f1;">
            <p style="font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase; margin: 0 0 8px;">CÓDIGO DE CONFIRMAÇÃO DO PACIENTE</p>
            <span style="font-size: 28px; font-weight: 900; color: #4338ca; letter-spacing: 3px; font-family: monospace;">${tokenConfirmacao}</span>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
            Por favor, passe este código para a secretária ou médico no momento da consulta para que seu atendimento seja concluído no sistema.
          </p>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 16px;">
          Owner Health Systems &bull; <a href="${sysUrl}" style="color: #4f46e5;">${sysUrl}</a>
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ E-mail de token de consulta enviado para: ${to}`);
  } catch (err) {
    console.warn(`⚠️ Falha ao enviar e-mail de token para ${to}:`, err.message);
  }
};

const sendAppointmentTokenWhatsApp = async ({ to, pacienteNome, medicoNome, dataFormatada, horaStr, tokenConfirmacao }) => {
  if (!to) return;
  const cleanPhone = String(to).replace(/\D/g, '');
  const messageText = `🔑 *Owner Health - Código de Validação de Atendimento*\n\nOlá *${pacienteNome}*! Para confirmar sua consulta com *${medicoNome}* em *${dataFormatada} às ${horaStr}*, forneça este código de confirmação para a secretária:\n\n👉 *${tokenConfirmacao}*\n\nhttps://owner-health-ktsf.vercel.app`;

  try {
    const waUrl = process.env.WHATSAPP_API_URL || process.env.EVOLUTION_API_URL;
    const waToken = process.env.WHATSAPP_API_TOKEN || process.env.EVOLUTION_API_KEY;

    if (waUrl && waToken) {
      await fetch(waUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': waToken,
          'Authorization': `Bearer ${waToken}`
        },
        body: JSON.stringify({
          number: cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
          text: messageText,
          message: messageText
        })
      });
      console.log(`💬 WhatsApp oficial enviado com sucesso para ${cleanPhone}`);
    } else {
      console.log(`💬 [WhatsApp Envoy] Mensagem simulada enviada para ${cleanPhone}:\n"${messageText}"`);
    }
  } catch (err) {
    console.warn(`⚠️ Falha no envio de WhatsApp para ${cleanPhone}:`, err.message);
  }
};

module.exports = { sendFirstAccessEmail, sendAppointmentTokenEmail, sendAppointmentTokenWhatsApp };
