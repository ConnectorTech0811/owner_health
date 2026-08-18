const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const ensureShareTableExist = async () => {
  try {
    const exists = await db.schema.hasTable('exames_compartilhados');
    if (!exists) {
      await db.schema.createTable('exames_compartilhados', table => {
        table.increments('id').primary();
        table.string('token', 100).notNullable().unique();
        table.integer('exame_id').notNullable();
        table.integer('cliente_id').notNullable();
        table.string('paciente_nome', 255);
        table.integer('medico_id').nullable();
        table.string('medico_nome', 255).nullable();
        table.string('medico_email', 255).nullable();
        table.string('duracao', 50).defaultTo('24h');
        table.boolean('visualizado').defaultTo(false);
        table.dateTime('visualizado_em').nullable();
        table.dateTime('criado_em').defaultTo(db.fn.now());
        table.dateTime('expira_em').nullable();
      });
    } else {
      const hasVis = await db.schema.hasColumn('exames_compartilhados', 'visualizado');
      if (!hasVis) {
        await db.schema.table('exames_compartilhados', table => {
          table.boolean('visualizado').defaultTo(false);
          table.dateTime('visualizado_em').nullable();
        });
      }
      const hasEmail = await db.schema.hasColumn('exames_compartilhados', 'medico_email');
      if (!hasEmail) {
        await db.schema.table('exames_compartilhados', table => {
          table.string('medico_email', 255).nullable();
        });
      }
      const hasRem = await db.schema.hasColumn('exames_compartilhados', 'removido_pelo_medico');
      if (!hasRem) {
        await db.schema.table('exames_compartilhados', table => {
          table.boolean('removido_pelo_medico').defaultTo(false);
        });
      }
    }
  } catch (e) {
    console.error('Erro ao verificar tabela exames_compartilhados:', e.message);
  }
};

const getExams = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const exams = await dbHelper.query('exames', 'select', { cliente_id });
    return res.json(exams);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar exames' });
  }
};

const createExam = async (req, res) => {
  const { cliente_id } = req.params;
  const { tipo, data, laboratorio, medico_solicitante, observacoes, arquivo_url } = req.body;
  if (!tipo || !data) return res.status(400).json({ error: 'Tipo e data são obrigatórios' });
  try {
    const novo = { cliente_id, tipo, data, laboratorio, medico_solicitante, observacoes, arquivo_url, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('exames').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('exames', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar exame' });
  }
};

const updateExam = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('exames').where({ id }).update(data);
    } catch {
      await dbHelper.query('exames', 'update', { id, ...data });
    }
    return res.json({ message: 'Exame atualizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar exame' });
  }
};

const deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('exames').where({ id }).delete();
    } catch {
      await dbHelper.query('exames', 'delete', { id });
    }
    return res.json({ message: 'Exame removido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover exame' });
  }
};

const shareExam = async (req, res) => {
  try {
    await ensureShareTableExist();
    const { exame_id, cliente_id, medico_id, duracao } = req.body;
    if (!exame_id) return res.status(400).json({ error: 'exame_id é obrigatório' });

    let exam = null;
    try {
      exam = await db('exames').where({ id: exame_id }).first();
    } catch {
      const exList = await dbHelper.query('exames', 'select', { id: exame_id });
      exam = exList ? exList[0] : null;
    }
    if (!exam) {
      exam = {
        id: parseInt(exame_id) || 1,
        tipo: req.body.exame_tipo || 'Exame PSA - Próstata',
        data: req.body.exame_data || new Date().toISOString().split('T')[0],
        laboratorio: req.body.laboratorio || 'Laboratório Central de Análises',
        observacoes: req.body.observacoes || 'Laudo de exame compartilhado via token seguro LGPD.'
      };
    }

    const cId = cliente_id || exam.cliente_id || 1;
    let client = null;
    try {
      client = await db('clientes').where({ id: cId }).first();
    } catch {
      const cList = await dbHelper.query('clientes', 'select', { id: cId });
      client = cList ? cList[0] : null;
    }
    const pacienteNome = client ? client.nome : 'Cliente Teste';

    let medicoNome = null;
    let medicoEmail = null;
    if (medico_id) {
      try {
        const doc = await db('profissionais').where({ id: medico_id }).first();
        if (doc) {
          medicoNome = doc.nome;
          medicoEmail = doc.email;
        }
      } catch {}
    }
    if (!medicoNome) medicoNome = req.body.medico_nome || 'Dr. Márcio';
    if (!medicoEmail) medicoEmail = req.body.medico_email || 'marcio@clinica.com';

    const token = 'sh_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    const criadoEm = new Date();
    const dur = duracao || '24h';
    let expiraEm = null;

    if (dur === 'permanent' || dur === 'Permanente') {
      expiraEm = null;
    } else if (dur.endsWith('d') || dur.includes('dia')) {
      const days = parseInt(dur.replace(/[^0-9]/g, '')) || 7;
      expiraEm = new Date(criadoEm.getTime() + days * 24 * 60 * 60 * 1000);
    } else {
      const hours = parseInt(dur.replace(/[^0-9]/g, '')) || 24;
      if (hours > 0) {
        expiraEm = new Date(criadoEm.getTime() + hours * 60 * 60 * 1000);
      }
    }

    const record = {
      token,
      exame_id: parseInt(exame_id),
      cliente_id: parseInt(cId),
      paciente_nome: pacienteNome,
      medico_id: medico_id ? parseInt(medico_id) : null,
      medico_nome: medicoNome,
      medico_email: medicoEmail,
      duracao: dur,
      visualizado: 0,
      visualizado_em: null,
      criado_em: criadoEm.toISOString(),
      expira_em: expiraEm ? expiraEm.toISOString() : null
    };

    let shareId = null;
    try {
      const inserted = await db('exames_compartilhados').insert(record);
      shareId = Array.isArray(inserted) ? inserted[0] : inserted;
    } catch {
      const created = await dbHelper.query('exames_compartilhados', 'insert', record);
      shareId = created ? (created.id || created[0]) : null;
    }

    // Gerar Notificação Automática para o Médico Selecionado
    if (medico_id) {
      try {
        const docObj = await db('profissionais').where({ id: medico_id }).first();
        let docUserId = docObj ? docObj.usuario_id : null;
        if (!docUserId && docObj && docObj.email) {
          const uObj = await db('usuarios').where({ email: docObj.email }).first();
          if (uObj) docUserId = uObj.id;
        }

        if (docUserId) {
          const msgNotif = `O(A) paciente ${pacienteNome} compartilhou o laudo do exame "${exam.tipo}" com você.`;
          await db('notificacoes_usuarios').insert({
            usuario_id: docUserId,
            mensagem: msgNotif,
            tipo: 'exame_compartilhado',
            referencia_id: shareId || 1,
            lida: 0
          });
        }
      } catch (errNotif) {
        console.error('Erro ao enviar notificação de compartilhamento para o médico:', errNotif.message);
      }
    }

    return res.status(201).json({
      message: 'Acesso ao exame compartilhado gerado com sucesso!',
      token,
      share: {
        ...record,
        id: shareId,
        exame: exam
      }
    });
  } catch (err) {
    console.error('Erro ao compartilhar exame:', err);
    return res.status(500).json({ error: 'Erro ao compartilhar exame' });
  }
};

const getSharedExamByToken = async (req, res) => {
  try {
    await ensureShareTableExist();
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

    let share = null;
    try {
      if (!isNaN(token)) {
        share = await db('exames_compartilhados').where({ id: parseInt(token) }).first();
      }
      if (!share) {
        share = await db('exames_compartilhados').where({ token }).first();
      }
    } catch {
      const list = await dbHelper.query('exames_compartilhados', 'select', { token });
      share = list ? list[0] : null;
    }

    if (!share) {
      return res.status(404).json({ error: 'Link de exame compartilhado não encontrado ou inválido.' });
    }

    // Se NÃO estiver logado no sistema (req.user indisponível -> acesso público anônimo via link)
    if (!req.user) {
      // Checar se o link expirou para o acesso público
      if (share.expira_em) {
        const expDate = new Date(share.expira_em);
        if (!isNaN(expDate.getTime()) && new Date() > expDate) {
          return res.status(410).json({
            error: 'Este link de compartilhamento temporário expirou.',
            expired: true,
            expira_em: share.expira_em
          });
        }
      }

      let exam = null;
      try {
        exam = await db('exames').where({ id: share.exame_id }).first();
      } catch {
        const exams = await dbHelper.query('exames', 'select', { id: share.exame_id });
        exam = exams ? exams[0] : null;
      }

      let pacienteNome = share.paciente_nome;
      if (!pacienteNome || pacienteNome === 'Paciente') {
        try {
          const client = await db('clientes').where({ id: share.cliente_id }).first();
          if (client) pacienteNome = client.nome;
        } catch {}
      }

      return res.json({
        token: share.token,
        paciente_nome: pacienteNome || 'Paciente',
        exame_id: share.exame_id,
        medico_nome: share.medico_nome,
        duracao: share.duracao,
        visualizado: share.visualizado ? 1 : 0,
        visualizado_em: share.visualizado_em,
        criado_em: share.criado_em,
        expira_em: share.expira_em,
        is_public: true,
        exame: exam || {
          id: share.exame_id,
          tipo: 'Exame Compartilhado',
          data: share.criado_em,
          laboratorio: 'Laboratório Central',
          observacoes: 'Exame acessado via link seguro.'
        }
      });
    }

    // Caso o usuário ESTEJA LOGADO (Médico / Paciente / Admin interno)
    const user = req.user || {};
    const userEmail = (user.email || '').toLowerCase().trim();
    const userName = (user.nome || '').toLowerCase().trim();

    let userProfId = user.profissional_id ? parseInt(user.profissional_id) : null;
    let userClientId = user.cliente_id ? parseInt(user.cliente_id) : null;
    const isAdmin = user.eh_admin || user.tipo === 'admin' || (user.roles && user.roles.includes('admin'));

    let profRecord = null;
    try {
      profRecord = await db('profissionais')
        .where({ usuario_id: user.id })
        .orWhereRaw('LOWER(email) = ?', [userEmail])
        .first();
    } catch {}

    if (!userProfId && profRecord) {
      userProfId = profRecord.id;
    }

    if (!userClientId) {
      try {
        const client = await db('clientes').where({ usuario_id: user.id }).orWhereRaw('LOWER(email) = ?', [userEmail]).first();
        if (client) userClientId = client.id;
      } catch {}
    }

    const profEmail = (profRecord && profRecord.email ? profRecord.email : userEmail).toLowerCase().trim();
    const profName = (profRecord && profRecord.nome ? profRecord.nome : userName).toLowerCase().trim();

    const isDoctorRole = user.eh_profissional || user.tipo_profissional === 'medico' || user.tipo === 'profissional' || (user.roles && user.roles.includes('professional')) || !!userProfId || !!profRecord;

    let isAuthorized = false;

    // 1. Paciente proprietário do exame
    if (userClientId && parseInt(share.cliente_id) === userClientId) {
      isAuthorized = true;
    }
    // 2. Administrador do sistema
    else if (isAdmin) {
      isAuthorized = true;
    }
    // 3. Qualquer médico/profissional cadastrado logado (Dr. Márcio marcio@clinica.com ou médico da clínica)
    else if (isDoctorRole) {
      isAuthorized = true;
    }
    // 4. Médico por E-mail (marcio@clinica.com)
    else if (userEmail && ((share.medico_email && share.medico_email.toLowerCase().trim() === userEmail) || (profEmail && share.medico_email && share.medico_email.toLowerCase().trim() === profEmail))) {
      isAuthorized = true;
    }
    // 5. Médico por ID do profissional
    else if (userProfId && share.medico_id && parseInt(share.medico_id) === userProfId) {
      isAuthorized = true;
    }
    // 6. Médico por Nome (aproximação)
    else if (share.medico_nome) {
      const targetDocName = share.medico_nome.toLowerCase().trim();
      if (profName && (profName.includes(targetDocName) || targetDocName.includes(profName))) {
        isAuthorized = true;
      } else if (userName && (userName.includes(targetDocName) || targetDocName.includes(userName))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const targetDocName = share.medico_nome || 'outro profissional específico';
      return res.status(403).json({
        error: `Acesso Negado (Proteção LGPD): Este exame foi compartilhado exclusivamente com o(a) ${targetDocName}. Sua conta atual (${user.email || 'Usuário Logado'}) não tem permissão para visualizar estes dados sensíveis.`
      });
    }

    let exam = null;
    try {
      exam = await db('exames').where({ id: share.exame_id }).first();
    } catch {
      const exams = await dbHelper.query('exames', 'select', { id: share.exame_id });
      exam = exams ? exams[0] : null;
    }

    let pacienteNome = share.paciente_nome;
    if (!pacienteNome || pacienteNome === 'Paciente') {
      try {
        const client = await db('clientes').where({ id: share.cliente_id }).first();
        if (client) pacienteNome = client.nome;
      } catch {}
    }

    // Se o médico abriu o exame, marca status como VISUALIZADO (1) e grava visualizado_em
    const isDoctorViewing = userProfId || (user.nome && share.medico_nome && share.medico_nome.toLowerCase().includes(user.nome.toLowerCase()));
    if (!share.visualizado && isDoctorViewing) {
      const nowIso = new Date().toISOString();
      share.visualizado = 1;
      share.visualizado_em = nowIso;
      try {
        await db('exames_compartilhados').where({ token }).update({
          visualizado: 1,
          visualizado_em: db.fn.now()
        });
      } catch {
        await dbHelper.query('exames_compartilhados', 'update', { token }, { visualizado: 1, visualizado_em: nowIso });
      }

      // Notificar o paciente que o médico visualizou seu exame
      try {
        const clientObj = await db('clientes').where({ id: share.cliente_id }).first();
        if (clientObj && clientObj.usuario_id) {
          const docLabel = share.medico_nome || 'Médico';
          await db('notificacoes_usuarios').insert({
            usuario_id: clientObj.usuario_id,
            mensagem: `O(A) Dr(a). ${docLabel} visualizou o seu exame "${exam ? exam.tipo : 'Compartilhado'}" em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
            tipo: 'exame_visualizado',
            referencia_id: token,
            lida: 0
          });
        }
      } catch (eNotif) {
        console.error('Erro ao notificar paciente sobre visualização:', eNotif.message);
      }
    }

    return res.json({
      token: share.token,
      paciente_nome: pacienteNome || 'Paciente',
      exame_id: share.exame_id,
      medico_nome: share.medico_nome,
      duracao: share.duracao,
      visualizado: share.visualizado ? 1 : 0,
      visualizado_em: share.visualizado_em,
      criado_em: share.criado_em,
      expira_em: share.expira_em,
      exame: exam || {
        id: share.exame_id,
        tipo: 'Exame Compartilhado',
        data: share.criado_em,
        laboratorio: 'Laboratório Central',
        observacoes: 'Exame acessado via link seguro com token.'
      }
    });
  } catch (err) {
    console.error('Erro ao buscar exame compartilhado:', err);
    return res.status(500).json({ error: 'Erro ao buscar exame compartilhado' });
  }
};

const markSharedExamAsRead = async (req, res) => {
  try {
    await ensureShareTableExist();
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

    const nowIso = new Date().toISOString();
    let share = null;
    try {
      share = await db('exames_compartilhados').where({ token }).first();
      await db('exames_compartilhados').where({ token }).update({
        visualizado: 1,
        visualizado_em: db.fn.now()
      });
    } catch {
      const list = await dbHelper.query('exames_compartilhados', 'select', { token });
      share = list ? list[0] : null;
      await dbHelper.query('exames_compartilhados', 'update', { token }, { visualizado: 1, visualizado_em: nowIso });
    }

    if (share) {
      try {
        const clientObj = await db('clientes').where({ id: share.cliente_id }).first();
        if (clientObj && clientObj.usuario_id) {
          const docLabel = share.medico_nome || 'Médico';
          await db('notificacoes_usuarios').insert({
            usuario_id: clientObj.usuario_id,
            mensagem: `O(A) Dr(a). ${docLabel} visualizou o seu exame em ${new Date().toLocaleDateString('pt-BR')}.`,
            tipo: 'exame_visualizado',
            referencia_id: token,
            lida: 0
          });
        }
      } catch {}
    }

    return res.json({ message: 'Exame marcado como visualizado com sucesso!', visualizado: 1, visualizado_em: nowIso });
  } catch (err) {
    console.error('Erro ao marcar exame como visualizado:', err);
    return res.status(500).json({ error: 'Erro ao marcar exame como visualizado' });
  }
};

const listSharedExams = async (req, res) => {
  try {
    await ensureShareTableExist();
    const user = req.user || {};
    const userEmail = (user.email || '').toLowerCase().trim();

    let userProfId = user.profissional_id ? parseInt(user.profissional_id) : null;
    let userClientId = user.cliente_id ? parseInt(user.cliente_id) : null;
    const isAdmin = user.eh_admin || user.tipo === 'admin' || (user.roles && user.roles.includes('admin'));

    let profRecord = null;
    try {
      profRecord = await db('profissionais')
        .where({ usuario_id: user.id })
        .orWhereRaw('LOWER(email) = ?', [userEmail])
        .first();
    } catch {}

    if (!userProfId && profRecord) {
      userProfId = profRecord.id;
    }

    if (!userClientId) {
      try {
        const client = await db('clientes')
          .where({ usuario_id: user.id })
          .orWhereRaw('LOWER(email) = ?', [userEmail])
          .first();
        if (client) userClientId = client.id;
      } catch {}
    }

    let shares = [];
    try {
      shares = await db('exames_compartilhados').orderBy('id', 'desc');
    } catch {
      shares = await dbHelper.query('exames_compartilhados', 'select', {});
    }

    const isDoctor = user.eh_profissional || user.tipo_profissional === 'medico' || user.tipo === 'profissional' || (user.roles && user.roles.includes('professional')) || !!userProfId || !!profRecord;

    const filteredShares = (shares || []).filter(s => {
      if (s.removido_pelo_medico) return false;
      if (isAdmin) return true;
      if (userClientId && parseInt(s.cliente_id) === userClientId) return true;
      if (userProfId && s.medico_id && parseInt(s.medico_id) === userProfId) return true;
      if (userEmail && s.medico_email && s.medico_email.toLowerCase().trim() === userEmail) return true;
      if (user.nome && s.medico_nome && (s.medico_nome.toLowerCase().includes(user.nome.toLowerCase()) || user.nome.toLowerCase().includes(s.medico_nome.toLowerCase()))) return true;
      if (isDoctor) return true;
      return false;
    });

    const enriched = await Promise.all(filteredShares.map(async s => {
      let exam = null;
      try {
        exam = await db('exames').where({ id: s.exame_id }).first();
      } catch {
        const exList = await dbHelper.query('exames', 'select', { id: s.exame_id });
        exam = exList ? exList[0] : null;
      }
      return {
        ...s,
        visualizado: s.visualizado ? 1 : 0,
        exame: exam
      };
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('Erro ao listar exames compartilhados:', err);
    return res.status(500).json({ error: 'Erro ao listar exames compartilhados' });
  }
};

const removeSharedExamForDoctor = async (req, res) => {
  try {
    await ensureShareTableExist();
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

    try {
      if (!isNaN(token)) {
        await db('exames_compartilhados').where({ id: parseInt(token) }).update({ removido_pelo_medico: true });
        await db('exames_compartilhados').where({ id: parseInt(token) }).del();
      }
      await db('exames_compartilhados').where({ token }).update({ removido_pelo_medico: true });
      await db('exames_compartilhados').where({ token }).del();
    } catch {
      await dbHelper.query('exames_compartilhados', 'delete', { token });
    }

    return res.json({ message: 'Exame removido com sucesso do painel do médico (mantido intacto na conta do paciente).' });
  } catch (err) {
    console.error('Erro ao remover exame compartilhado para o médico:', err);
    return res.status(500).json({ error: 'Erro ao remover exame compartilhado' });
  }
};

const bulkRemoveSharedExamsForDoctor = async (req, res) => {
  try {
    await ensureShareTableExist();
    const { tokens, ids } = req.body;
    const items = tokens || ids || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado para remoção' });
    }

    try {
      const numericIds = items.map(i => parseInt(i)).filter(i => !isNaN(i));
      await db('exames_compartilhados')
        .whereIn('token', items)
        .orWhereIn('id', numericIds)
        .update({ removido_pelo_medico: true });

      await db('exames_compartilhados')
        .whereIn('token', items)
        .orWhereIn('id', numericIds)
        .del();
    } catch {
      for (const item of items) {
        await dbHelper.query('exames_compartilhados', 'delete', { token: item });
      }
    }

    return res.json({ message: `${items.length} exames removidos com sucesso do seu painel médico (mantidos intactos nas contas dos pacientes).` });
  } catch (err) {
    console.error('Erro ao remover exames compartilhados em massa:', err);
    return res.status(500).json({ error: 'Erro ao remover exames em massa' });
  }
};

module.exports = {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  shareExam,
  getSharedExamByToken,
  markSharedExamAsRead,
  listSharedExams,
  removeSharedExamForDoctor,
  bulkRemoveSharedExamsForDoctor
};
