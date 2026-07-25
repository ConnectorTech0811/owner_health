const db = require('../../knexfile');

// Garantir que a tabela exista
const ensureTable = async () => {
  try {
    const exists = await db.schema.hasTable('medico_paciente_anamnese_customizada');
    if (!exists) {
      await db.schema.createTable('medico_paciente_anamnese_customizada', table => {
        table.increments('id').primary();
        table.integer('medico_id').notNullable();
        table.integer('cliente_id').notNullable();
        table.integer('empresa_id');
        table.string('nome_paciente');
        table.string('titulo');
        table.text('sections_data', 'longtext');
        table.string('status').defaultTo('enviado');
        table.string('criado_em');
        table.string('enviado_em');
      });
    }
  } catch (e) {
    console.error('Erro ao verificar tabela medico_paciente_anamnese_customizada:', e);
  }
};

const { cloneCustomSections, notificarPaciente } = require('./patientAnamnesisController');

ensureTable();

// Criar novo formulário personalizado para o paciente
const createCustomAnamnesis = async (req, res) => {
  const { medico_id, cliente_id, empresa_id, nome_paciente, titulo, sections_data, conteudo } = req.body;
  try {
    const sectionsJson = sections_data 
      ? (typeof sections_data === 'string' ? sections_data : JSON.stringify(sections_data))
      : (conteudo ? (typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo)) : '[]');

    const nowISO = new Date().toISOString();

    let targetDoctorId = parseInt(medico_id);
    if (!targetDoctorId || isNaN(targetDoctorId)) {
      const prof = await db('profissionais').where({ usuario_id: req.user.id }).first();
      if (prof) targetDoctorId = prof.id;
    }

    const data = {
      medico_id: targetDoctorId || parseInt(medico_id),
      cliente_id: parseInt(cliente_id),
      empresa_id: empresa_id ? parseInt(empresa_id) : 1,
      nome_paciente: nome_paciente || `Paciente #${cliente_id}`,
      titulo: titulo || `Anamnese Personalizada - ${nome_paciente || cliente_id}`,
      sections_data: sectionsJson,
      status: 'enviado',
      criado_em: nowISO,
      enviado_em: nowISO
    };

    const [id] = await db('medico_paciente_anamnese_customizada').insert(data);

    let parsedSections;
    try { parsedSections = typeof sections_data === 'string' ? JSON.parse(sections_data) : (sections_data || []); } catch { parsedSections = []; }

    // Criar requisição real no Portal do Paciente + Notificação
    try {
      const requestData = {
        empresa_id: data.empresa_id,
        cliente_id: data.cliente_id,
        medico_id: data.medico_id,
        status: 'aguardando',
        criado_em: nowISO
      };

      const [requestId] = await db('patient_anamnesis_requests').insert(requestData);

      if (parsedSections && parsedSections.length > 0) {
        await cloneCustomSections(parsedSections, requestId);
      }

      await notificarPaciente(data.cliente_id, data.medico_id, requestId, req.user);
    } catch (e) {
      console.error('Erro ao registrar requisição do paciente:', e);
    }

    return res.status(201).json({ id, ...data, sections_data: parsedSections });
  } catch (err) {
    console.error('Erro em createCustomAnamnesis:', err);
    return res.status(500).json({ error: 'Erro ao criar anamnese personalizada para o paciente' });
  }
};

// Listar formulários personalizados criados por um médico específico (PRIVADO DO MÉDICO)
const getDoctorCustomAnamnesis = async (req, res) => {
  const { medico_id } = req.params;
  try {
    const docInput = parseInt(medico_id);
    let doctor = await db('profissionais').where({ id: docInput }).first();
    if (!doctor) {
      doctor = await db('profissionais').where({ usuario_id: docInput }).first();
    }
    const targetDoctorId = doctor ? doctor.id : docInput;

    const list = await db('medico_paciente_anamnese_customizada')
      .where({ medico_id: targetDoctorId })
      .orderBy('criado_em', 'desc')
      .select();

    const parsed = await Promise.all(list.map(async item => {
      try {
        if (typeof item.sections_data === 'string') item.sections_data = JSON.parse(item.sections_data);
      } catch {}

      // Buscar nome do médico solicitante
      let prof = await db('profissionais').where({ id: item.medico_id }).first();
      if (!prof) {
        prof = await db('profissionais').where({ usuario_id: item.medico_id }).first();
      }
      item.nome_medico = prof ? (prof.tipo_profissional === 'medico' ? `Dr. ${prof.nome.replace(/^Dr\.\s*/i, '')}` : prof.nome) : 'Médico';

      // Buscar se há respostas do paciente
      const reqItem = await db('patient_anamnesis_requests')
        .where({ cliente_id: item.cliente_id, medico_id: item.medico_id })
        .orderBy('criado_em', 'desc')
        .first();

      if (reqItem) {
        item.status = reqItem.status;
        item.request_id = reqItem.id;
        item.respondido_em = reqItem.respondido_em;

        if (reqItem.status === 'concluido' || reqItem.status === 'respondido') {
          item.answers = await db('patient_anamnesis_answers')
            .where({ request_id: reqItem.id })
            .select();
        }
      }

      return item;
    }));

    return res.json(parsed);
  } catch (err) {
    console.error('Erro em getDoctorCustomAnamnesis:', err);
    return res.status(500).json({ error: 'Erro ao buscar formulários personalizados do médico' });
  }
};

// Listar todos os formulários personalizados para visualização da Clínica / Administrativo / Secretária
const getAllCustomAnamnesis = async (req, res) => {
  try {
    const list = await db('medico_paciente_anamnese_customizada')
      .orderBy('criado_em', 'desc')
      .select();

    const parsed = await Promise.all(list.map(async item => {
      try {
        if (typeof item.sections_data === 'string') item.sections_data = JSON.parse(item.sections_data);
      } catch {}

      let prof = await db('profissionais').where({ id: item.medico_id }).first();
      if (!prof) {
        prof = await db('profissionais').where({ usuario_id: item.medico_id }).first();
      }
      item.nome_medico = prof ? (prof.tipo_profissional === 'medico' ? `Dr. ${prof.nome.replace(/^Dr\.\s*/i, '')}` : prof.nome) : 'Médico';

      const reqItem = await db('patient_anamnesis_requests')
        .where({ cliente_id: item.cliente_id, medico_id: item.medico_id })
        .orderBy('criado_em', 'desc')
        .first();

      if (reqItem) {
        item.status = reqItem.status;
        item.request_id = reqItem.id;
        item.respondido_em = reqItem.respondido_em;

        if (reqItem.status === 'concluido' || reqItem.status === 'respondido') {
          item.answers = await db('patient_anamnesis_answers')
            .where({ request_id: reqItem.id })
            .select();
        }
      }

      return item;
    }));

    return res.json(parsed);
  } catch (err) {
    console.error('Erro em getAllCustomAnamnesis:', err);
    return res.status(500).json({ error: 'Erro ao buscar envios dos médicos' });
  }
};

// Obter detalhes de um formulário personalizado
const getCustomAnamnesisDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await db('medico_paciente_anamnese_customizada').where({ id: parseInt(id) }).first();
    if (!item) return res.status(404).json({ error: 'Formulário personalizado não encontrado' });

    try {
      if (typeof item.sections_data === 'string') item.sections_data = JSON.parse(item.sections_data);
    } catch {}

    return res.json(item);
  } catch (err) {
    console.error('Erro em getCustomAnamnesisDetail:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhe da anamnese personalizada' });
  }
};

// Excluir formulário personalizado
const deleteCustomAnamnesis = async (req, res) => {
  const { id } = req.params;
  try {
    await db('medico_paciente_anamnese_customizada').where({ id: parseInt(id) }).del();
    return res.json({ message: 'Formulário personalizado removido com sucesso' });
  } catch (err) {
    console.error('Erro em deleteCustomAnamnesis:', err);
    return res.status(500).json({ error: 'Erro ao remover formulário personalizado' });
  }
};

module.exports = {
  createCustomAnamnesis,
  getDoctorCustomAnamnesis,
  getAllCustomAnamnesis,
  getCustomAnamnesisDetail,
  deleteCustomAnamnesis
};
