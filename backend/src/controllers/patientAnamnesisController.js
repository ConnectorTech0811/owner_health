const db = require('../../knexfile');

// ─── Helper: clona seções personalizadas para um request ──────────────────────
async function cloneCustomSections(sections, requestId) {
  const oldToNewOptionsMap = {};

  for (const sec of sections) {
    const secData = {
      request_id: requestId,
      titulo: sec.titulo,
      descricao: sec.descricao || '',
      ordem: sec.ordem || 0,
      ativo: 1
    };
    const [newSecId] = await db('patient_anamnesis_sections').insert(secData);

    const questions = sec.questions || [];
    const questionObjects = [];

    for (const q of questions) {
      const qData = {
        section_id: newSecId,
        texto: q.texto,
        tipo: q.tipo,
        obrigatoria: q.obrigatoria ? 1 : 0,
        ordem: q.ordem || 0,
        placeholder: q.placeholder || '',
        descricao: q.descricao || '',
        escala_min: q.escala_min || null,
        escala_max: q.escala_max || null,
        escala_label_min: q.escala_label_min || '',
        escala_label_max: q.escala_label_max || '',
        parent_option_id: null, // será atualizado após inserir as opções
        ativo: 1
      };
      const [newQId] = await db('patient_anamnesis_questions').insert(qData);
      questionObjects.push({ original: q, newId: newQId });

      const options = q.options || [];
      for (const opt of options) {
        const optData = {
          question_id: newQId,
          texto: opt.texto,
          ordem: opt.ordem || 0,
          next_section_id: null
        };
        const [newOptId] = await db('patient_anamnesis_options').insert(optData);
        oldToNewOptionsMap[opt.id] = newOptId;
      }
    }

    // Segunda passagem: atualiza parent_option_id com os novos IDs
    for (const { original, newId } of questionObjects) {
      if (original.parent_option_id && oldToNewOptionsMap[original.parent_option_id]) {
        await db('patient_anamnesis_questions')
          .where({ id: newId })
          .update({ parent_option_id: oldToNewOptionsMap[original.parent_option_id] });
      }
    }
  }
}

// ─── Helper: notificar paciente ─────────────────────────────────────────────
async function notificarPaciente(clienteId, medicoId, requestId) {
  try {
    const cliente = await db('clientes').where({ id: clienteId }).first();
    if (!cliente || !cliente.usuario_id) return;

    let medicoNome = 'A clínica';
    if (medicoId) {
      const prof = await db('profissionais').where({ id: medicoId }).first();
      if (prof) medicoNome = `O(a) Dr(a). ${prof.nome}`;
    }

    await db('notificacoes_usuarios').insert({
      usuario_id: cliente.usuario_id,
      mensagem: `Nova Anamnese: ${medicoNome} enviou um formulário para você preencher.`,
      tipo: 'aviso',
      referencia_id: requestId
    });
  } catch (e) {
    console.error('Erro ao notificar paciente:', e.message);
  }
}

// ─── Helper: notificar médico quando paciente responde ───────────────────────
async function notificarMedico(requestId) {
  try {
    const request = await db('patient_anamnesis_requests').where({ id: requestId }).first();
    if (!request || !request.medico_id) return;

    const prof = await db('profissionais').where({ id: request.medico_id }).first();
    const cliente = await db('clientes').where({ id: request.cliente_id }).first();
    if (!prof || !prof.usuario_id || !cliente) return;

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    await db('notificacoes_usuarios').insert({
      usuario_id: prof.usuario_id,
      mensagem: `Anamnese Concluída: ${cliente.nome} respondeu o formulário em ${dataFormatada} às ${horaFormatada}.`,
      tipo: 'aviso',
      referencia_id: requestId
    });
  } catch (e) {
    console.error('Erro ao notificar médico:', e.message);
  }
}

// ─── POST /empresa/:empresa_id/request  (template padrão da clínica) ─────────
const createPatientRequest = async (req, res) => {
  const { empresa_id } = req.params;
  const { cliente_id, medico_id } = req.body;

  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });

  try {
    const requestData = {
      empresa_id: parseInt(empresa_id),
      cliente_id: parseInt(cliente_id),
      medico_id: medico_id ? parseInt(medico_id) : null,
      status: 'aguardando',
      criado_em: new Date().toISOString()
    };

    const [requestId] = await db('patient_anamnesis_requests').insert(requestData);

    // Clonar template da empresa (anamnesis_sections → anamnesis_questions → anamnesis_options)
    const sections = await db('anamnesis_sections').where({ empresa_id }).select();
    for (const sec of sections) {
      const secData = { request_id: requestId, titulo: sec.titulo, descricao: sec.descricao || '', ordem: sec.ordem, ativo: sec.ativo };
      const [newSecId] = await db('patient_anamnesis_sections').insert(secData);

      const questions = await db('anamnesis_questions').where({ section_id: sec.id }).select();
      const oldToNewOptionsMap = {};

      for (const q of questions) {
        const qData = {
          section_id: newSecId,
          texto: q.texto,
          tipo: q.tipo,
          obrigatoria: q.obrigatoria,
          ordem: q.ordem,
          placeholder: q.placeholder || '',
          descricao: q.descricao || '',
          escala_min: q.escala_min,
          escala_max: q.escala_max,
          escala_label_min: q.escala_label_min || '',
          escala_label_max: q.escala_label_max || '',
          parent_option_id: null,
          ativo: q.ativo
        };
        const [newQId] = await db('patient_anamnesis_questions').insert(qData);
        q.new_id = newQId;

        const options = await db('anamnesis_options').where({ question_id: q.id }).select();
        for (const opt of options) {
          const optData = { question_id: newQId, texto: opt.texto, ordem: opt.ordem };
          const [newOptId] = await db('patient_anamnesis_options').insert(optData);
          oldToNewOptionsMap[opt.id] = newOptId;
        }
      }

      for (const q of questions) {
        if (q.parent_option_id && oldToNewOptionsMap[q.parent_option_id]) {
          await db('patient_anamnesis_questions')
            .where({ id: q.new_id })
            .update({ parent_option_id: oldToNewOptionsMap[q.parent_option_id] });
        }
      }
    }

    const actualMedicoId = medico_id ? parseInt(medico_id) : (req.user ? (await db('profissionais').where({ usuario_id: req.user.id }).first())?.id : null);
    await notificarPaciente(cliente_id, actualMedicoId, requestId);

    return res.status(201).json({ message: 'Solicitação criada', request_id: requestId });
  } catch (err) {
    console.error('Erro em createPatientRequest:', err);
    return res.status(500).json({ error: 'Erro ao criar solicitação de anamnese' });
  }
};

// ─── POST /empresa/:empresa_id/request/custom  (formulário personalizado) ─────
const createCustomPatientRequest = async (req, res) => {
  const { empresa_id } = req.params;
  const { cliente_id, medico_id, sections } = req.body;

  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });
  if (!sections || !Array.isArray(sections)) return res.status(400).json({ error: 'sections é obrigatório' });

  try {
    const requestData = {
      empresa_id: parseInt(empresa_id),
      cliente_id: parseInt(cliente_id),
      medico_id: medico_id ? parseInt(medico_id) : null,
      status: 'aguardando',
      criado_em: new Date().toISOString()
    };

    const [requestId] = await db('patient_anamnesis_requests').insert(requestData);
    await cloneCustomSections(sections, requestId);

    const actualMedicoId = medico_id ? parseInt(medico_id) : null;
    await notificarPaciente(cliente_id, actualMedicoId, requestId);

    return res.status(201).json({ message: 'Solicitação personalizada criada', request_id: requestId });
  } catch (err) {
    console.error('Erro em createCustomPatientRequest:', err);
    return res.status(500).json({ error: 'Erro ao criar solicitação de anamnese personalizada' });
  }
};

// ─── GET /cliente/:cliente_id/requests ─────────────────────────────────────
const getClientRequests = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const requests = await db('patient_anamnesis_requests')
      .where({ cliente_id })
      .orderBy('criado_em', 'desc')
      .select();
    return res.json(requests);
  } catch (err) {
    console.error('Erro em getClientRequests:', err);
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

async function checkRequestOwnership(requestId, reqUser) {
  if (!reqUser) return true;
  try {
    const requestItem = await db('patient_anamnesis_requests').where({ id: requestId }).first();
    if (!requestItem) return false;

    if (reqUser.eh_empresa || reqUser.tipo_profissional || reqUser.tipo === 'medico') return true;

    const activeClientId = reqUser.cliente_id || reqUser.id;
    if (requestItem.cliente_id === activeClientId) return true;

    const clientObj = await db('clientes').where({ id: requestItem.cliente_id }).first();
    if (clientObj && (clientObj.id === activeClientId || clientObj.usuario_id === reqUser.id)) return true;

    return false;
  } catch (e) {
    return true;
  }
}

// ─── GET /request/:request_id/form ─────────────────────────────────────────
const getRequestForm = async (req, res) => {
  const { request_id } = req.params;
  try {
    const isAllowed = await checkRequestOwnership(request_id, req.user);
    if (!isAllowed) {
      return res.status(403).json({ error: 'Acesso não autorizado: Esta solicitação de anamnese pertence a outro usuário.' });
    }

    const sections = await db('patient_anamnesis_sections')
      .where({ request_id })
      .orderBy('ordem', 'asc')
      .select();

    for (const s of sections) {
      s.questions = await db('patient_anamnesis_questions')
        .where({ section_id: s.id })
        .orderBy('ordem', 'asc')
        .select();

      for (const q of s.questions) {
        q.options = await db('patient_anamnesis_options')
          .where({ question_id: q.id })
          .orderBy('ordem', 'asc')
          .select();
      }
    }

    return res.json(sections);
  } catch (err) {
    console.error('Erro em getRequestForm:', err);
    return res.status(500).json({ error: 'Erro ao buscar formulário detalhado' });
  }
};

// ─── POST /request/:request_id/submit ──────────────────────────────────────
const submitClientAnswers = async (req, res) => {
  const { request_id } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Respostas inválidas' });
  }

  try {
    const keys = Object.keys(answers);
    for (const qId of keys) {
      let val = answers[qId];
      if (Array.isArray(val)) {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      await db('patient_anamnesis_answers').insert({
        request_id: parseInt(request_id),
        question_id: parseInt(qId),
        resposta: val
      });
    }

    await db('patient_anamnesis_requests')
      .where({ id: request_id })
      .update({ status: 'concluido', respondido_em: new Date().toISOString() });

    await notificarMedico(request_id);

    return res.json({ message: 'Respostas salvas com sucesso' });
  } catch (err) {
    console.error('Erro em submitClientAnswers:', err);
    return res.status(500).json({ error: 'Erro ao salvar respostas' });
  }
};

// ─── GET /request/:request_id/answers ────────────────────────────────────────
const getRequestAnswers = async (req, res) => {
  const { request_id } = req.params;
  try {
    const answers = await db('patient_anamnesis_answers')
      .where({ request_id })
      .select('question_id', 'resposta', 'criado_em');
    return res.json(answers);
  } catch (err) {
    console.error('Erro em getRequestAnswers:', err);
    return res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
};

module.exports = {
  createPatientRequest,
  createCustomPatientRequest,
  getClientRequests,
  getRequestForm,
  getRequestAnswers,
  submitClientAnswers
};
