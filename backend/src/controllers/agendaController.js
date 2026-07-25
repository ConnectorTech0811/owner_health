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
    const { profissional_id, data_inicio, data_fim } = req.query;
    
    // Se for medico logado e nao especificou profissional_id, usa o dele
    let targetProfissionalId = profissional_id;
    if (!targetProfissionalId || targetProfissionalId == 0 || targetProfissionalId == '0') {
      const prof = await db('profissionais').where({ usuario_id: req.user.id }).first();
      if (prof) targetProfissionalId = prof.id;
    }

    const query = db('agendas').orderBy('data', 'asc').orderBy('hora_inicio', 'asc');

    const isEmpresa = req.user.roles && req.user.roles.includes('company');
    const isCliente = req.user.roles && req.user.roles.includes('client');

    if (targetProfissionalId) {
      query.where('agendas.profissional_id', targetProfissionalId);
    } else if (isEmpresa) {
      // Se for empresa e nao especificou profissional, busca agendas dos profissionais daquela empresa
      // Aqui teríamos que fazer join com profissional_empresas.
      // Para simplificar, como o frontend atual passa o profissional_id, vamos exigir o profissional_id
      // ou retornar todas se a clinica não especificar. (O ideal é join).
      query.join('profissional_empresas', 'agendas.profissional_id', '=', 'profissional_empresas.profissional_id')
           .where('profissional_empresas.empresa_id', req.user.id);
    } else {
      return res.status(400).json({ error: 'profissional_id é obrigatório' });
    }

    if (data_inicio) query.where('agendas.data', '>=', data_inicio);
    if (data_fim) query.where('agendas.data', '<=', data_fim);

    // Selecionar os campos corretos para não conflitar os IDs no join
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
