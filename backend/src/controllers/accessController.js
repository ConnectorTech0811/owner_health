const db = require('../../knexfile');

// Função auxiliar para garantir que as tabelas necessárias existam no MySQL
const ensureTablesExist = async () => {
  try {
    const hasAccessTable = await db.schema.hasTable('paciente_medico_acessos');
    if (!hasAccessTable) {
      await db.schema.createTable('paciente_medico_acessos', table => {
        table.increments('id').primary();
        table.integer('cliente_id').notNullable();
        table.integer('medico_id').notNullable();
        table.string('concedido_por', 50).notNullable().defaultTo('clinica');
        table.dateTime('criado_em').defaultTo(db.fn.now());
        table.unique(['cliente_id', 'medico_id']);
      });
    }

    const hasNotifTable = await db.schema.hasTable('notificacoes_usuarios');
    if (!hasNotifTable) {
      await db.schema.createTable('notificacoes_usuarios', table => {
        table.increments('id').primary();
        table.integer('usuario_id').notNullable();
        table.text('mensagem').notNullable();
        table.string('tipo', 50).defaultTo('aviso');
        table.integer('referencia_id').nullable();
        table.boolean('lida').defaultTo(false);
        table.dateTime('criado_em').defaultTo(db.fn.now());
      });
    }
  } catch (e) {
    console.error('Erro ao verificar/criar tabelas de acesso:', e.message);
  }
};

// Conceder acesso ao prontuário (por Clínica/Admin ou por Paciente)
exports.concederAcesso = async (req, res) => {
  try {
    await ensureTablesExist();

    const { cliente_id, medico_id, concedido_por } = req.body;

    if (!cliente_id || !medico_id) {
      return res.status(400).json({ error: 'cliente_id e medico_id são obrigatórios' });
    }

    let tipoConcedido = concedido_por;
    if (!tipoConcedido) {
      if (req.user && (req.user.tipo === 'admin' || req.user.eh_admin)) {
        tipoConcedido = 'administrativo';
      } else if (req.user && (req.user.tipo === 'cliente' || req.user.eh_cliente)) {
        tipoConcedido = 'paciente';
      } else {
        tipoConcedido = 'clinica';
      }
    }

    // Buscar paciente
    const client = await db('clientes').where({ id: cliente_id }).first();
    if (!client) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Buscar médico profissional
    const doctor = await db('profissionais').where({ id: medico_id }).first();
    if (!doctor) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Registrar ou atualizar permissão no banco
    const existente = await db('paciente_medico_acessos')
      .where({ cliente_id: parseInt(cliente_id), medico_id: parseInt(medico_id) })
      .first();

    if (!existente) {
      await db('paciente_medico_acessos').insert({
        cliente_id: parseInt(cliente_id),
        medico_id: parseInt(medico_id),
        concedido_por: tipoConcedido
      });
    } else {
      await db('paciente_medico_acessos')
        .where({ id: existente.id })
        .update({ concedido_por: tipoConcedido });
    }

    // Tentar localizar usuario_id do médico para notificação
    let targetUserId = doctor.usuario_id;
    if (!targetUserId && doctor.email) {
      const userObj = await db('usuarios').where({ email: doctor.email }).first();
      if (userObj) targetUserId = userObj.id;
    }

    // Formatar data e hora atual
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const dataHoraStr = `${dia}/${mes}/${ano} às ${hora}:${min}`;

    let mensagem = '';
    if (tipoConcedido === 'administrativo') {
      mensagem = `O Administrativo liberou o acesso ao prontuário do paciente ${client.nome} em ${dataHoraStr}.`;
    } else if (tipoConcedido === 'paciente') {
      mensagem = `O paciente ${client.nome} concedeu acesso ao prontuário dele em ${dataHoraStr}.`;
    } else {
      mensagem = `A clínica liberou o acesso ao prontuário do paciente ${client.nome} em ${dataHoraStr}.`;
    }

    // Enviar notificação se houver usuario_id vinculado ao médico
    if (targetUserId) {
      await db('notificacoes_usuarios').insert({
        usuario_id: targetUserId,
        mensagem,
        tipo: 'acesso_prontuario',
        referencia_id: client.id, // ID numérico do cliente
        lida: 0
      });
    }

    return res.json({ message: 'Acesso ao prontuário liberado com sucesso!' });
  } catch (error) {
    console.error('Erro ao conceder acesso:', error);
    return res.status(500).json({ error: `Erro interno ao conceder acesso: ${error.message}` });
  }
};

// Revogar acesso ao prontuário
exports.revogarAcesso = async (req, res) => {
  try {
    await ensureTablesExist();

    const { cliente_id, medico_id } = req.body;

    if (!cliente_id || !medico_id) {
      return res.status(400).json({ error: 'cliente_id e medico_id são obrigatórios' });
    }

    await db('paciente_medico_acessos')
      .where({ cliente_id: parseInt(cliente_id), medico_id: parseInt(medico_id) })
      .del();

    return res.json({ message: 'Acesso ao prontuário revogado com sucesso.' });
  } catch (error) {
    console.error('Erro ao revogar acesso:', error);
    return res.status(500).json({ error: `Erro interno ao revogar acesso: ${error.message}` });
  }
};

// Listar acessos ativos
exports.listarAcessos = async (req, res) => {
  try {
    await ensureTablesExist();

    const { cliente_id, medico_id } = req.query;

    let query = db('paciente_medico_acessos')
      .join('clientes', 'paciente_medico_acessos.cliente_id', '=', 'clientes.id')
      .join('profissionais', 'paciente_medico_acessos.medico_id', '=', 'profissionais.id')
      .select(
        'paciente_medico_acessos.*',
        'clientes.nome as cliente_nome',
        'clientes.cpf as cliente_cpf',
        'profissionais.nome as medico_nome',
        'profissionais.tipo_profissional as medico_tipo'
      );

    if (cliente_id) {
      query = query.where('paciente_medico_acessos.cliente_id', parseInt(cliente_id));
    }
    if (medico_id) {
      query = query.where('paciente_medico_acessos.medico_id', parseInt(medico_id));
    }

    const acessos = await query;
    return res.json(acessos);
  } catch (error) {
    console.error('Erro ao listar acessos:', error);
    return res.status(500).json({ error: `Erro interno ao listar acessos: ${error.message}` });
  }
};
