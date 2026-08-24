const db = require('../../knexfile');

exports.createAgenda = async (req, res) => {
  try {
    const { profissional_id, slots } = req.body;
    const criado_por = req.user.id;

    let targetId = profissional_id;
    if (!targetId || targetId == 0 || targetId == '0') {
      const prof = await db('profissionais').where({ usuario_id: req.user.id }).first();
      if (prof) targetId = prof.id;
    }

    if (!targetId || !slots || !slots.length) {
      return res.status(400).json({ error: 'profissional_id and slots are required' });
    }

    // Verificar se o mês de alguma das datas está bloqueado/fechado
    const bloqueios = await db('agenda_bloqueios')
      .where({ profissional_id: targetId, status: 'bloqueado' })
      .select('mes', 'ano');

    const blockedSet = new Set(bloqueios.map(b => `${b.ano}-${String(b.mes).padStart(2, '0')}`));

    const isDateStringBlocked = (dateStr) => {
      if (!dateStr) return false;
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length < 2) return false;
      const y = parts[0];
      const m = parts[1];
      return blockedSet.has(`${y}-${m}`);
    };

    const blockedSlot = slots.find(s => isDateStringBlocked(s.data));
    if (blockedSlot) {
      const parts = String(blockedSlot.data).split('T')[0].split('-');
      return res.status(400).json({ 
        error: `A agenda de ${parts[1]}/${parts[0]} está fechada/bloqueada para novas marcações.` 
      });
    }

    const dates = [...new Set(slots.map(s => s.data))];
    let existingSlots = [];
    if (dates.length > 0) {
      existingSlots = await db('agendas')
        .where({ profissional_id: targetId })
        .whereIn('data', dates)
        .select('data', 'hora_inicio');
    }

    const insertData = [];
    for (const slot of slots) {
      const exists = existingSlots.some(ex => {
        const exDateStr = (ex.data instanceof Date) 
          ? ex.data.toISOString().split('T')[0] 
          : String(ex.data).split('T')[0];
        return exDateStr === slot.data && ex.hora_inicio.substring(0, 5) === slot.hora_inicio.substring(0, 5);
      });
      
      if (!exists) {
        insertData.push({
          profissional_id: targetId,
          data: slot.data,
          hora_inicio: slot.hora_inicio,
          hora_fim: slot.hora_fim,
          criado_por,
          status: 'livre'
        });
      }
    }

    if (insertData.length > 0) {
      await db('agendas').insert(insertData);
    }

    res.status(201).json({ message: 'Agendas processadas com sucesso', count: insertData.length });
  } catch (error) {
    console.error('Erro ao criar agendas:', error);
    res.status(500).json({ error: 'Erro interno ao criar agendas' });
  }
};

exports.getAgendas = async (req, res) => {
  try {
    const { profissional_id, cliente_id, data_inicio, data_fim, my_appointments } = req.query;
    
    const isCliente = req.user && req.user.roles && req.user.roles.includes('client');

    // Se solicitou exames do próprio cliente/paciente ou se é cliente navegando sem profissional_id:
    if (cliente_id || my_appointments === 'true' || (isCliente && !profissional_id)) {
      // Obter todos os perfis de cliente vinculados ao usuário logado
      const clientProfiles = await db('clientes').where({ usuario_id: req.user.id }).select('id', 'nome');
      const clientIds = clientProfiles.map(c => c.id);

      if (cliente_id) {
        const parsedId = parseInt(cliente_id);
        if (!isNaN(parsedId) && !clientIds.includes(parsedId)) {
          clientIds.push(parsedId);
        }
      }

      const clientNames = clientProfiles.map(c => c.nome).filter(Boolean);

      const query = db('agendas')
        .join('profissionais', 'agendas.profissional_id', '=', 'profissionais.id')
        .select(
          'agendas.*',
          'profissionais.nome as profissional_nome',
          'profissionais.especialidade as profissional_especialidade',
          'profissionais.numero_conselho as profissional_conselho'
        )
        .where(function() {
          if (clientIds.length > 0) {
            this.whereIn('agendas.cliente_id', clientIds);
          }
          if (clientNames.length > 0) {
            clientNames.forEach(nome => {
              this.orWhere('agendas.paciente_nome', 'like', `%${nome}%`);
            });
          }
        })
        .orderBy('agendas.data', 'asc')
        .orderBy('agendas.hora_inicio', 'asc');

      if (data_inicio) query.where('agendas.data', '>=', data_inicio);
      if (data_fim) query.where('agendas.data', '<=', data_fim);

      const agendas = await query;
      return res.json(agendas);
    }

    // Se for medico logado e nao especificou profissional_id, usa o dele
    let targetProfissionalId = profissional_id;
    if (!targetProfissionalId || targetProfissionalId == 0 || targetProfissionalId == '0') {
      const prof = await db('profissionais').where({ usuario_id: req.user.id }).first();
      if (prof) targetProfissionalId = prof.id;
    }

    const query = db('agendas').orderBy('data', 'asc').orderBy('hora_inicio', 'asc');

    const isEmpresa = req.user && req.user.roles && req.user.roles.includes('company');

    if (targetProfissionalId) {
      query.where('agendas.profissional_id', targetProfissionalId);
    } else if (isEmpresa) {
      query.join('profissional_empresas', 'agendas.profissional_id', '=', 'profissional_empresas.profissional_id')
           .where('profissional_empresas.empresa_id', req.user.id);
    } else {
      return res.status(400).json({ error: 'profissional_id é obrigatório' });
    }

    if (data_inicio) query.where('agendas.data', '>=', data_inicio);
    if (data_fim) query.where('agendas.data', '<=', data_fim);

    query.select('agendas.*');

    if (isCliente) {
      query.where('agendas.status', 'livre');
    }

    const agendas = await query;
    res.json(agendas);
  } catch (error) {
    console.error('Erro ao buscar agendas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar agendas' });
  }
};

const ensureAgendaColumns = async (db) => {
  const hasToken = await db.schema.hasColumn('agendas', 'token_confirmacao').catch(() => false);
  if (!hasToken) {
    await db.schema.alterTable('agendas', table => {
      table.string('token_confirmacao').nullable();
    }).catch(() => {});
  }
  const hasConcluidoEm = await db.schema.hasColumn('agendas', 'concluido_em').catch(() => false);
  if (!hasConcluidoEm) {
    await db.schema.alterTable('agendas', table => {
      table.timestamp('concluido_em').nullable();
    }).catch(() => {});
  }
};

const { sendAppointmentTokenEmail, sendAppointmentTokenWhatsApp } = require('../utils/mailer');

const formatDatePtBR = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const day = String(dateVal.getUTCDate()).padStart(2, '0');
    const month = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
    const year = dateVal.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = parsed.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
};

const formatDoctorName = (name) => {
  if (!name) return 'Médico da Clínica';
  let clean = name.trim();
  if (/^dr\(a\)\./i.test(clean) || /^dr\./i.test(clean) || /^dra\./i.test(clean)) {
    return clean;
  }
  return `Dr(a). ${clean}`;
};

exports.requestAgendaToken = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAgendaColumns(db);

    const agenda = await db('agendas').where({ id }).first();
    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    let tokenConfirmacao = agenda.token_confirmacao;
    if (!tokenConfirmacao) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      tokenConfirmacao = `CONF-${randomCode}`;
      await db('agendas').where({ id }).update({ token_confirmacao: tokenConfirmacao });
    }

    const prof = await db('profissionais').where({ id: agenda.profissional_id }).first();
    const medicoNome = formatDoctorName(prof ? prof.nome : 'Médico da Clínica');

    let cliente = null;
    if (agenda.cliente_id) {
      cliente = await db('clientes').where({ id: agenda.cliente_id }).first();
    }

    const pacienteNome = agenda.paciente_nome || (cliente ? cliente.nome : 'Paciente');
    const pacienteCelular = cliente ? cliente.celular : '(11) 94583-1201';
    const pacienteEmail = cliente ? cliente.email : 'cliente@teste.com';
    const dataFormatada = formatDatePtBR(agenda.data);
    const horaStr = agenda.hora_inicio ? agenda.hora_inicio.substring(0, 5) : '09:00';

    // Disparar notificação oficial ao paciente com o código de confirmação
    if (cliente && cliente.usuario_id) {
      try {
        const mensagem = `🔑 Seu Código de Validação de Atendimento na Owner Health: Para validar sua consulta com ${medicoNome} em ${dataFormatada} às ${horaStr}, passe o token para o médico: ${tokenConfirmacao}`;

        const hasNotifTable = await db.schema.hasTable('notificacoes_usuarios');
        if (!hasNotifTable) {
          await db.schema.createTable('notificacoes_usuarios', table => {
            table.increments('id').primary();
            table.integer('usuario_id').notNullable();
            table.text('mensagem').notNullable();
            table.boolean('lida').defaultTo(false);
            table.timestamp('criado_em').defaultTo(db.fn.now());
          });
        }

        await db('notificacoes_usuarios').insert({
          usuario_id: cliente.usuario_id,
          mensagem,
          tipo: 'confirmacao_consulta',
          referencia_id: parseInt(id),
          lida: 0,
          criado_em: new Date().toISOString()
        });
      } catch (notifErr) {
        console.warn('Aviso ao registrar notificação de token:', notifErr.message);
      }
    }

    // Envio por E-mail ao paciente
    sendAppointmentTokenEmail({
      to: pacienteEmail,
      pacienteNome,
      medicoNome,
      dataFormatada,
      horaStr,
      tokenConfirmacao
    }).catch(err => console.warn('Erro no envio de e-mail:', err.message));

    return res.json({
      success: true,
      message: `Código de confirmação enviado para o paciente via E-mail (${pacienteEmail}) e Notificação no Sistema.`,
      agenda_id: parseInt(id),
      paciente: {
        nome: pacienteNome,
        email: pacienteEmail
      }
    });
  } catch (error) {
    console.error('Erro em requestAgendaToken:', error);
    return res.status(500).json({ error: 'Erro ao gerar e enviar código de validação ao paciente' });
  }
};

exports.completeAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Por favor, informe o Token de Confirmação fornecido pelo paciente.' });
    }

    await ensureAgendaColumns(db);

    const agenda = await db('agendas').where({ id }).first();
    if (!agenda) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const cleanInput = token.trim().toUpperCase().replace(/^CONF-/, '');
    const cleanStored = agenda.token_confirmacao ? agenda.token_confirmacao.trim().toUpperCase().replace(/^CONF-/, '') : '';

    if (!cleanStored || cleanInput !== cleanStored) {
      return res.status(400).json({ error: 'Token de confirmação incorreto! Solicite ao paciente o código enviado no WhatsApp/E-mail.' });
    }

    const concluidoEm = new Date().toISOString();
    await db('agendas').where({ id }).update({
      status: 'concluido',
      concluido_em: concluidoEm
    });

    return res.json({
      success: true,
      message: 'Consulta concluída e validada com sucesso com o token do paciente!'
    });
  } catch (error) {
    console.error('Erro ao concluir consulta:', error);
    return res.status(500).json({ error: 'Erro interno ao concluir consulta' });
  }
};

exports.updateAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paciente_nome } = req.body;
    const updaterId = req.user.id;
    const isEmpresa = req.user.roles && req.user.roles.includes('company');

    // Buscar agenda atual
    const agenda = await db('agendas').where({ id }).first();
    if (!agenda) {
      return res.status(404).json({ error: 'Agenda não encontrada' });
    }

    await db('agendas').where({ id }).update({ status, paciente_nome });

    // Regra de Notificação: Se quem atualizou foi a secretária (empresa) 
    // e quem criou a agenda foi o médico (ou seja, criado_por != updaterId), notificar.
    // Para ser mais preciso, vamos verificar se quem criou tem eh_profissional = 1,
    // mas a regra "se a secretária editou, notifica o médico" basta:
    if (isEmpresa && agenda.criado_por !== updaterId) {
      // Criar notificação para o médico
      const dataFormatada = new Date(agenda.data).toLocaleDateString('pt-BR');
      const mensagem = `A secretária alterou sua agenda do dia ${dataFormatada} às ${agenda.hora_inicio}.`;
      
      const prof = await db('profissionais').where({ id: agenda.profissional_id }).first();
      if (prof) {
        await db('notificacoes_usuarios').insert({
          usuario_id: prof.usuario_id,
          mensagem
        });
      }
    }

    res.json({ message: 'Agenda atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar agenda:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar agenda' });
  }
};

exports.deleteAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const updaterId = req.user.id;
    const isEmpresa = req.user.roles && req.user.roles.includes('company');

    const agenda = await db('agendas').where({ id }).first();
    if (!agenda) {
      return res.status(404).json({ error: 'Agenda não encontrada' });
    }

    await db('agendas').where({ id }).del();

    if (isEmpresa && agenda.criado_por !== updaterId) {
       const dataFormatada = new Date(agenda.data).toLocaleDateString('pt-BR');
       const mensagem = `A secretária excluiu seu horário do dia ${dataFormatada} às ${agenda.hora_inicio}.`;
       
       const prof = await db('profissionais').where({ id: agenda.profissional_id }).first();
       if (prof) {
         await db('notificacoes_usuarios').insert({
           usuario_id: prof.usuario_id,
           mensagem
         });
       }
    }

    res.json({ message: 'Agenda excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agenda:', error);
    res.status(500).json({ error: 'Erro interno ao excluir agenda' });
  }
};

exports.bookAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_id } = req.body;
    const usuarioId = req.user.id;
    const isCliente = req.user.roles && req.user.roles.includes('client');

    if (!isCliente) {
      return res.status(403).json({ error: 'Apenas pacientes podem usar esta rota' });
    }

    if (!cliente_id) {
      return res.status(400).json({ error: 'cliente_id é obrigatório no corpo da requisição' });
    }

    // Buscar o cliente para pegar o nome
    let cliente;
    try {
      cliente = await db('clientes').where({ id: cliente_id, usuario_id: usuarioId }).first();
    } catch {
      const allClientes = await dbHelper.query('clientes', 'select', { id: parseInt(cliente_id), usuario_id: usuarioId });
      cliente = Array.isArray(allClientes) && allClientes.length > 0 ? allClientes[0] : null;
    }
    
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a este usuário' });

    // Buscar agenda
    let agenda;
    try {
      agenda = await db('agendas').where({ id }).first();
    } catch {
      const allAgendas = await dbHelper.query('agendas', 'select', { id: parseInt(id) });
      agenda = Array.isArray(allAgendas) && allAgendas.length > 0 ? allAgendas[0] : null;
    }

    if (!agenda) return res.status(404).json({ error: 'Horário não encontrado' });
    if (agenda.status !== 'livre') return res.status(400).json({ error: 'Horário já preenchido ou indisponível' });

    const updateData = {
      status: 'agendado',
      cliente_id: cliente.id,
      paciente_nome: cliente.nome
    };

    try {
      await db('agendas').where({ id }).update(updateData);
    } catch {
      await dbHelper.query('agendas', 'update', { id: parseInt(id) }, updateData);
    }

    // Notificar o médico
    const dataFormatada = new Date(agenda.data).toLocaleDateString('pt-BR');
    const mensagem = `Novo agendamento: O paciente ${cliente.nome} marcou consulta no dia ${dataFormatada} às ${agenda.hora_inicio.substring(0,5)}.`;
    
    const prof = await db('profissionais').where({ id: agenda.profissional_id }).first();
    if (prof) {
      await db('notificacoes_usuarios').insert({
        usuario_id: prof.usuario_id,
        mensagem
      });
    }

    res.json({ message: 'Agendamento confirmado com sucesso!' });
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    res.status(500).json({ error: 'Erro interno ao agendar consulta' });
  }
};
