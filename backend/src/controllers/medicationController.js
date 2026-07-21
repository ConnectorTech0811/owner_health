const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');
const nodemailer = require('nodemailer');

// ─── Medicamentos ────────────────────────────────────────────────────────────

function formatToMysqlDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const str = dateStr.trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
}

async function resolveClienteId(rawId) {
  const cId = parseInt(rawId) || 1;
  // 1) Try exact id match first
  try {
    const byId = await db('clientes').where({ id: cId }).first();
    if (byId) return byId.id;
  } catch {}
  // 2) Try usuario_id match
  try {
    const byUsuario = await db('clientes').where({ usuario_id: cId }).first();
    if (byUsuario) return byUsuario.id;
  } catch {}
  return cId;
}

const getMedications = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const realClienteId = await resolveClienteId(cliente_id);

    const meds = await db('medicamentos')
      .where({ cliente_id: realClienteId })
      .select();

    const medIds = meds.map(m => m.id);
    const effects = medIds.length > 0
      ? await db('efeitos_medicamentos').whereIn('medicamento_id', medIds).orderBy('criado_em', 'desc').select()
      : [];

    const effectMap = new Map();
    effects.forEach(e => {
      if (!effectMap.has(e.medicamento_id)) {
        effectMap.set(e.medicamento_id, e.efeito);
      }
    });

    const result = meds.map(m => ({
      ...m,
      efeitos: m.efeitos || effectMap.get(m.id) || null
    }));

    return res.json(result);
  } catch (err) {
    console.error('Erro em getMedications:', err);
    return res.status(500).json({ error: 'Erro ao buscar medicamentos' });
  }
};

const createMedication = async (req, res) => {
  const { cliente_id } = req.params;
  const { nome, posologia, horarios, data_inicio, data_fim, observacoes, email_lembrete, efeitos } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const realClienteId = await resolveClienteId(cliente_id);
    const mysqlDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const novo = {
      cliente_id: realClienteId,
      nome,
      posologia: posologia || null,
      horarios: Array.isArray(horarios) ? JSON.stringify(horarios) : (horarios || null),
      data_inicio: formatToMysqlDate(data_inicio) || new Date().toISOString().split('T')[0],
      data_fim: formatToMysqlDate(data_fim),
      observacoes: observacoes || null,
      email_lembrete: email_lembrete || null,
      efeitos: efeitos || null,
      ativo: 1,
      criado_em: mysqlDate
    };

    let insertedId;
    try {
      const [id] = await db('medicamentos').insert(novo);
      insertedId = id;
    } catch (dbErr) {
      console.warn('Fallback knex insert medicamentos:', dbErr.message);
      const resQuery = await dbHelper.query('medicamentos', 'insert', novo);
      insertedId = Array.isArray(resQuery) ? resQuery[0] : resQuery;
    }

    if (efeitos) {
      await db('efeitos_medicamentos').insert({
        medicamento_id: insertedId,
        efeito: efeitos,
        criado_em: mysqlDate
      }).catch(() => {});
    }

    if (email_lembrete) {
      sendReminderEmail(email_lembrete, nome, horarios).catch(console.error);
    }

    return res.status(201).json({ id: insertedId, ...novo });
  } catch (err) {
    console.error('Erro em createMedication:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar medicamento: ' + err.message });
  }
};

const updateMedication = async (req, res) => {
  const { id } = req.params;
  const { nome, posologia, horarios, data_inicio, data_fim, observacoes, email_lembrete, efeitos } = req.body;
  try {
    const mId = parseInt(id);
    const mysqlDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updateData = {
      nome,
      posologia: posologia || null,
      horarios: Array.isArray(horarios) ? JSON.stringify(horarios) : (horarios || null),
      data_inicio: formatToMysqlDate(data_inicio) || new Date().toISOString().split('T')[0],
      data_fim: formatToMysqlDate(data_fim),
      observacoes: observacoes || null,
      email_lembrete: email_lembrete || null,
      efeitos: efeitos || null
    };

    try {
      await db('medicamentos').where({ id: mId }).update(updateData);
    } catch (dbErr) {
      console.warn('Fallback knex update medicamentos:', dbErr.message);
      await dbHelper.query('medicamentos', 'update', { id: mId }, updateData);
    }

    if (efeitos) {
      await db('efeitos_medicamentos').insert({
        medicamento_id: mId,
        efeito: efeitos,
        criado_em: mysqlDate
      }).catch(() => {});
    }

    return res.json({ message: 'Medicamento atualizado com sucesso' });
  } catch (err) {
    console.error('Erro em updateMedication:', err);
    return res.status(500).json({ error: 'Erro ao atualizar medicamento: ' + err.message });
  }
};

const deleteMedication = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('medicamentos').where({ id }).delete();
    } catch {
      await dbHelper.query('medicamentos', 'delete', { id });
    }
    return res.json({ message: 'Medicamento removido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover medicamento' });
  }
};

// ─── Registro Diário ─────────────────────────────────────────────────────────

const getMedicationLogs = async (req, res) => {
  const { medicamento_id } = req.params;
  try {
    const logs = await dbHelper.query('registro_medicamentos', 'select', { medicamento_id });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar registros' });
  }
};

const logMedication = async (req, res) => {
  const { medicamento_id } = req.params;
  const { data, tomou, efeitos } = req.body;
  try {
    const tomouVal = tomou ? 1 : 0;
    
    // Verifica se já existe um registro para esta data e medicamento
    let existing;
    try {
      existing = await db('registro_medicamentos').where({ medicamento_id, data }).first();
    } catch {
      const existingList = await dbHelper.query('registro_medicamentos', 'select', { medicamento_id, data });
      existing = existingList && existingList.length > 0 ? existingList[0] : null;
    }

    if (existing) {
      // Atualiza o registro existente
      const updateData = { tomou: tomouVal, efeitos };
      try {
        await db('registro_medicamentos').where({ id: existing.id }).update(updateData);
        return res.json({ id: existing.id, medicamento_id, data, tomou: tomouVal, efeitos });
      } catch {
        await dbHelper.query('registro_medicamentos', 'update', { id: existing.id }, updateData);
        return res.json({ id: existing.id, medicamento_id, data, tomou: tomouVal, efeitos });
      }
    } else {
      // Insere um novo registro
      const novo = { medicamento_id, data, tomou: tomouVal, efeitos, criado_em: new Date().toISOString() };
      try {
        const [id] = await db('registro_medicamentos').insert(novo);
        return res.status(201).json({ id, ...novo });
      } catch {
        const created = await dbHelper.query('registro_medicamentos', 'insert', novo);
        return res.status(201).json(created);
      }
    }
  } catch (err) {
    console.error('Erro ao registrar log de medicamento:', err);
    return res.status(500).json({ error: 'Erro ao registrar tomada' });
  }
};

// ─── Email de Lembrete ───────────────────────────────────────────────────────

const sendReminderEmail = async (email, nomeMed, horarios) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }
  });

  const horariosStr = Array.isArray(horarios) ? horarios.join(', ') : horarios || 'conforme prescrição';

  await transporter.sendMail({
    from: `Owner Health <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `⏰ Lembrete de Medicamento — ${nomeMed}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 12px 24px; border-radius: 8px;">
            <span style="color: white; font-weight: 900; font-size: 18px; letter-spacing: 1px;">Owner Health</span>
          </div>
        </div>
        <h2 style="color: #1e3a8a; text-align: center;">⏰ Lembrete de Medicamento</h2>
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 16px;"><strong>💊 Medicamento:</strong> ${nomeMed}</p>
          <p style="margin: 8px 0 0; color: #1e40af;"><strong>🕐 Horários:</strong> ${horariosStr}</p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Este é um lembrete automático do sistema Owner Health para que você não esqueça de tomar seu medicamento nos horários prescritos.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Acesse o sistema para registrar se tomou o medicamento e anotar eventuais efeitos.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Atenciosamente, Equipe Owner Health<br/>
          Para cancelar os lembretes, acesse seu perfil e desative a opção de e-mail.
        </p>
      </div>
    `
  });
};

const sendManualReminder = async (req, res) => {
  const { email, nome, horarios } = req.body;
  if (!email || !nome) return res.status(400).json({ error: 'Email e nome são obrigatórios' });
  try {
    await sendReminderEmail(email, nome, horarios);
    return res.json({ message: 'Lembrete enviado com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar lembrete:', err);
    return res.status(500).json({ error: 'Erro ao enviar e-mail de lembrete' });
  }
};

const getMedicationEffects = async (req, res) => {
  const { medicamento_id } = req.params;
  try {
    const effects = await dbHelper.query('efeitos_medicamentos', 'select', { medicamento_id });
    return res.json(effects);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar efeitos' });
  }
};

const logMedicationEffect = async (req, res) => {
  const { medicamento_id } = req.params;
  const { efeito } = req.body;
  if (!efeito) return res.status(400).json({ error: 'Efeito é obrigatório' });
  try {
    const novo = { medicamento_id, efeito, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('efeitos_medicamentos').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('efeitos_medicamentos', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    console.error('Erro ao registrar efeito de medicamento:', err);
    return res.status(500).json({ error: 'Erro ao registrar efeito' });
  }
};

module.exports = { getMedications, createMedication, updateMedication, deleteMedication, getMedicationLogs, logMedication, sendManualReminder, getMedicationEffects, logMedicationEffect };
