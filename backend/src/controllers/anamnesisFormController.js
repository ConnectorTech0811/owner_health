const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

// ─────────────────────────────────────────────
// SEÇÕES (Grupos de Perguntas)
// ─────────────────────────────────────────────

const getSections = async (req, res) => {
  const { empresa_id } = req.params;
  try {
    let sections;
    try {
      sections = await db('anamnesis_sections')
        .where({ empresa_id })
        .orderBy('ordem', 'asc')
        .select();
    } catch {
      sections = await dbHelper.query('anamnesis_sections', 'select', { empresa_id });
      sections = sections.filter(s => String(s.empresa_id) === String(empresa_id));
      sections.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }
    return res.json(sections);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar seções' });
  }
};

const createSection = async (req, res) => {
  const { empresa_id } = req.params;
  const { titulo, descricao, ordem, ativo } = req.body;
  try {
    const data = { empresa_id, titulo, descricao: descricao || '', ordem: ordem || 0, ativo: ativo !== false ? 1 : 0, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('anamnesis_sections').insert(data);
      return res.status(201).json({ id, ...data });
    } catch {
      const [id] = await dbHelper.query('anamnesis_sections', 'insert', data);
      return res.status(201).json({ id, ...data });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar seção' });
  }
};

const updateSection = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('anamnesis_sections').where({ id }).update(data);
    } catch {
      await dbHelper.query('anamnesis_sections', 'update', { id: parseInt(id) }, data);
    }
    return res.json({ message: 'Seção atualizada', id });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar seção' });
  }
};

const deleteSection = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('anamnesis_questions').where({ section_id: id }).delete();
      await db('anamnesis_sections').where({ id }).delete();
    } catch {
      const { memoryDb } = dbHelper;
      const questions = (memoryDb.anamnesis_questions || []).filter(q => String(q.section_id) === String(id));
      questions.forEach(q => {
        if (memoryDb.anamnesis_options) {
          memoryDb.anamnesis_options = memoryDb.anamnesis_options.filter(o => String(o.question_id) !== String(q.id));
        }
      });
      await dbHelper.query('anamnesis_questions', 'delete', { section_id: parseInt(id) });
      await dbHelper.query('anamnesis_sections', 'delete', { id: parseInt(id) });
    }
    return res.json({ message: 'Seção removida' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover seção' });
  }
};

const reorderSections = async (req, res) => {
  const { empresa_id } = req.params;
  const { order } = req.body; // array de { id, ordem }
  try {
    for (const item of order) {
      try {
        await db('anamnesis_sections').where({ id: item.id, empresa_id }).update({ ordem: item.ordem });
      } catch {
        await dbHelper.query('anamnesis_sections', 'update', { id: item.id }, { ordem: item.ordem });
      }
    }
    return res.json({ message: 'Ordem atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao reordenar seções' });
  }
};

// ─────────────────────────────────────────────
// PERGUNTAS
// ─────────────────────────────────────────────

const getQuestions = async (req, res) => {
  const { section_id } = req.params;
  try {
    let questions;
    try {
      questions = await db('anamnesis_questions')
        .where({ section_id })
        .orderBy('ordem', 'asc')
        .select();
    } catch {
      questions = await dbHelper.query('anamnesis_questions', 'select', { section_id: parseInt(section_id) });
      questions.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }
    return res.json(questions);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
};

const createQuestion = async (req, res) => {
  const { section_id } = req.params;
  const { texto, tipo, obrigatoria, ordem, placeholder, descricao, escala_min, escala_max, escala_label_min, escala_label_max } = req.body;
  try {
    const data = {
      section_id: parseInt(section_id),
      texto,
      tipo: tipo || 'text',
      obrigatoria: obrigatoria ? 1 : 0,
      ordem: ordem || 0,
      placeholder: placeholder || '',
      descricao: descricao || '',
      escala_min: escala_min || 1,
      escala_max: escala_max || 10,
      escala_label_min: escala_label_min || 'Mínimo',
      escala_label_max: escala_label_max || 'Máximo',
      ativo: 1,
      criado_em: new Date().toISOString()
    };
    try {
      const [id] = await db('anamnesis_questions').insert(data);
      return res.status(201).json({ id, ...data });
    } catch {
      const [id] = await dbHelper.query('anamnesis_questions', 'insert', data);
      return res.status(201).json({ id, ...data });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar pergunta' });
  }
};

const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('anamnesis_questions').where({ id }).update(data);
    } catch {
      await dbHelper.query('anamnesis_questions', 'update', { id: parseInt(id) }, data);
    }
    return res.json({ message: 'Pergunta atualizada', id });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar pergunta' });
  }
};

const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('anamnesis_options').where({ question_id: id }).delete();
      await db('anamnesis_questions').where({ id }).delete();
    } catch {
      await dbHelper.query('anamnesis_options', 'delete', { question_id: parseInt(id) });
      await dbHelper.query('anamnesis_questions', 'delete', { id: parseInt(id) });
    }
    return res.json({ message: 'Pergunta removida' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover pergunta' });
  }
};

const reorderQuestions = async (req, res) => {
  const { section_id } = req.params;
  const { order } = req.body;
  try {
    for (const item of order) {
      try {
        await db('anamnesis_questions').where({ id: item.id, section_id }).update({ ordem: item.ordem });
      } catch {
        await dbHelper.query('anamnesis_questions', 'update', { id: item.id }, { ordem: item.ordem });
      }
    }
    return res.json({ message: 'Ordem atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao reordenar perguntas' });
  }
};

// ─────────────────────────────────────────────
// OPÇÕES DE RESPOSTA
// ─────────────────────────────────────────────

const getOptions = async (req, res) => {
  const { question_id } = req.params;
  try {
    let options;
    try {
      options = await db('anamnesis_options')
        .where({ question_id })
        .orderBy('ordem', 'asc')
        .select();
    } catch {
      options = await dbHelper.query('anamnesis_options', 'select', { question_id: parseInt(question_id) });
      options.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }
    return res.json(options);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar opções' });
  }
};

const createOption = async (req, res) => {
  const { question_id } = req.params;
  const { texto, ordem } = req.body;
  try {
    const data = { question_id: parseInt(question_id), texto, ordem: ordem || 0, ativo: 1 };
    try {
      const [id] = await db('anamnesis_options').insert(data);
      return res.status(201).json({ id, ...data });
    } catch {
      const [id] = await dbHelper.query('anamnesis_options', 'insert', data);
      return res.status(201).json({ id, ...data });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar opção' });
  }
};

const updateOption = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('anamnesis_options').where({ id }).update(data);
    } catch {
      await dbHelper.query('anamnesis_options', 'update', { id: parseInt(id) }, data);
    }
    return res.json({ message: 'Opção atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar opção' });
  }
};

const deleteOption = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('anamnesis_options').where({ id }).delete();
    } catch {
      await dbHelper.query('anamnesis_options', 'delete', { id: parseInt(id) });
    }
    return res.json({ message: 'Opção removida' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover opção' });
  }
};

const updateOptions = async (req, res) => {
  const { question_id } = req.params;
  const { options } = req.body; // array de { id?, texto, ordem }
  try {
    // Remove todas as opções antigas e re-insere
    try {
      await db('anamnesis_options').where({ question_id }).delete();
      if (options && options.length) {
        const rows = options.map((o, idx) => ({
          question_id: parseInt(question_id),
          texto: o.texto,
          ordem: idx,
          ativo: 1
        }));
        await db('anamnesis_options').insert(rows);
      }
    } catch {
      const { memoryDb } = dbHelper;
      if (memoryDb.anamnesis_options) {
        memoryDb.anamnesis_options = memoryDb.anamnesis_options.filter(
          o => String(o.question_id) !== String(question_id)
        );
      }
      if (options && options.length) {
        for (let idx = 0; idx < options.length; idx++) {
          await dbHelper.query('anamnesis_options', 'insert', {
            question_id: parseInt(question_id),
            texto: options[idx].texto,
            ordem: idx,
            ativo: 1
          });
        }
      }
    }
    return res.json({ message: 'Opções atualizadas' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar opções' });
  }
};

// ─────────────────────────────────────────────
// FORMULÁRIO COMPLETO (para renderização)
// ─────────────────────────────────────────────

const getFullForm = async (req, res) => {
  const { empresa_id } = req.params;
  try {
    let sections, questions, options;

    try {
      sections = await db('anamnesis_sections')
        .where({ empresa_id, ativo: 1 })
        .orderBy('ordem', 'asc')
        .select();

      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length) {
        questions = await db('anamnesis_questions')
          .whereIn('section_id', sectionIds)
          .where({ ativo: 1 })
          .orderBy('ordem', 'asc')
          .select();

        const questionIds = questions.map(q => q.id);
        if (questionIds.length) {
          options = await db('anamnesis_options')
            .whereIn('question_id', questionIds)
            .where({ ativo: 1 })
            .orderBy('ordem', 'asc')
            .select();
        } else {
          options = [];
        }
      } else {
        questions = [];
        options = [];
      }
    } catch {
      const { memoryDb } = dbHelper;
      sections = (memoryDb.anamnesis_sections || [])
        .filter(s => String(s.empresa_id) === String(empresa_id) && s.ativo !== 0)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

      const sectionIds = sections.map(s => s.id);
      questions = (memoryDb.anamnesis_questions || [])
        .filter(q => sectionIds.includes(q.section_id) && q.ativo !== 0)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

      const questionIds = questions.map(q => q.id);
      options = (memoryDb.anamnesis_options || [])
        .filter(o => questionIds.includes(o.question_id) && o.ativo !== 0)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }

    // Montar estrutura aninhada
    const form = sections.map(section => ({
      ...section,
      questions: questions
        .filter(q => String(q.section_id) === String(section.id))
        .map(question => ({
          ...question,
          options: options.filter(o => String(o.question_id) === String(question.id))
        }))
    }));

    return res.json(form);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
};

// ─────────────────────────────────────────────
// RESPOSTAS DO PACIENTE
// ─────────────────────────────────────────────

const submitResponse = async (req, res) => {
  const { cliente_id } = req.params;
  const { empresa_id, respostas } = req.body; // respostas: [{ question_id, question_texto, tipo, valor }]
  try {
    const sessionData = {
      cliente_id: parseInt(cliente_id),
      empresa_id: parseInt(empresa_id),
      criado_em: new Date().toISOString()
    };

    let sessionId;
    try {
      const [id] = await db('anamnesis_responses').insert(sessionData);
      sessionId = id;
      if (respostas && respostas.length) {
        const items = respostas.map(r => ({
          response_id: sessionId,
          question_id: r.question_id,
          question_texto: r.question_texto,
          tipo: r.tipo,
          valor: Array.isArray(r.valor) ? r.valor.join(', ') : (r.valor || ''),
          criado_em: new Date().toISOString()
        }));
        await db('anamnesis_response_items').insert(items);
      }
    } catch {
      const [id] = await dbHelper.query('anamnesis_responses', 'insert', sessionData);
      sessionId = id;
      if (respostas && respostas.length) {
        for (const r of respostas) {
          await dbHelper.query('anamnesis_response_items', 'insert', {
            response_id: sessionId,
            question_id: r.question_id,
            question_texto: r.question_texto,
            tipo: r.tipo,
            valor: Array.isArray(r.valor) ? r.valor.join(', ') : (r.valor || ''),
            criado_em: new Date().toISOString()
          });
        }
      }
    }

    return res.status(201).json({ id: sessionId, message: 'Respostas salvas com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar respostas' });
  }
};

const getResponses = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    let responses;
    try {
      responses = await db('anamnesis_responses')
        .where({ cliente_id })
        .orderBy('criado_em', 'desc')
        .select();
    } catch {
      responses = await dbHelper.query('anamnesis_responses', 'select', { cliente_id: parseInt(cliente_id) });
      responses.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    }
    return res.json(responses);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
};

const getResponseDetail = async (req, res) => {
  const { id } = req.params;
  try {
    let session, items;
    try {
      session = await db('anamnesis_responses').where({ id }).first();
      items = await db('anamnesis_response_items')
        .where({ response_id: id })
        .orderBy('question_id', 'asc')
        .select();
    } catch {
      const { memoryDb } = dbHelper;
      session = (memoryDb.anamnesis_responses || []).find(r => String(r.id) === String(id));
      items = (memoryDb.anamnesis_response_items || []).filter(i => String(i.response_id) === String(id));
    }
    return res.json({ session, items });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar detalhe da resposta' });
  }
};

// Listar respostas de todos pacientes de uma empresa (para o painel médico)
const getCompanyResponses = async (req, res) => {
  const { empresa_id } = req.params;
  try {
    let responses;
    try {
      responses = await db('anamnesis_responses as r')
        .leftJoin('clientes as c', 'c.id', 'r.cliente_id')
        .where({ 'r.empresa_id': empresa_id })
        .orderBy('r.criado_em', 'desc')
        .select('r.*', 'c.nome as cliente_nome');
    } catch {
      const { memoryDb } = dbHelper;
      responses = (memoryDb.anamnesis_responses || [])
        .filter(r => String(r.empresa_id) === String(empresa_id))
        .map(r => {
          const cliente = (memoryDb.clientes || []).find(c => String(c.id) === String(r.cliente_id));
          return { ...r, cliente_nome: cliente ? cliente.nome : `Cliente #${r.cliente_id}` };
        })
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    }
    return res.json(responses);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar respostas da empresa' });
  }
};

module.exports = {
  getSections, createSection, updateSection, deleteSection, reorderSections,
  getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  getOptions, createOption, updateOption, deleteOption, updateOptions,
  getFullForm,
  submitResponse, getResponses, getResponseDetail, getCompanyResponses
};
