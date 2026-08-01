const dbHelper = require('../utils/dbHelper');
const bcrypt = require('bcryptjs');
const { sendFirstAccessEmail } = require('../utils/mailer');

const getClients = async (req, res) => {
  try {
    const db = require('../../knexfile');
    const isEmpresa = req.user && (req.user.eh_empresa || req.user.empresa_id);
    const { medico_id, incluir_inativos } = req.query;
    
    let baseClients = [];
    if (isEmpresa) {
      const empresaId = req.user.empresa_id || req.user.id;
      const relations = await db('cliente_empresas').where({ empresa_id: empresaId }).select();
      if (relations && relations.length > 0) {
        const clientIds = relations.map(r => r.cliente_id);
        baseClients = await db('clientes').whereIn('id', clientIds);
      } else {
        baseClients = await db('clientes').select('*');
      }
    } else {
      baseClients = await db('clientes').select('*');
    }

    // Filtrar pacientes inativos apenas quando NÃO for clínica/empresa e NÃO for solicitado incluir_inativos
    if (String(incluir_inativos) !== 'true' && !isEmpresa) {
      baseClients = baseClients.filter(c => c.status !== 'inativo');
    }

    // Resolver ID do médico para filtragem de acesso de prontuário
    let doctorIdToFilter = null;
    if (medico_id) {
      const docInput = parseInt(medico_id);
      let doc = await db('profissionais').where({ id: docInput }).first();
      if (!doc) {
        doc = await db('profissionais').where({ usuario_id: docInput }).first();
      }
      if (doc) doctorIdToFilter = doc.id;
    }

    // Se o usuário logado for um profissional médico
    if (!doctorIdToFilter && req.user) {
      let doc = null;
      if (req.user.id) {
        doc = await db('profissionais').where({ usuario_id: req.user.id }).first();
      }
      if (!doc && req.user.email) {
        doc = await db('profissionais').where({ email: req.user.email }).first();
      }
      if (!doc && req.user.profissional_id) {
        doc = await db('profissionais').where({ id: req.user.profissional_id }).first();
      }

      if (doc && (doc.tipo_profissional === 'medico' || doc.tipo_profissional === 'médico' || req.user.tipo_profissional === 'medico')) {
        doctorIdToFilter = doc.id;
      }
    }

    if (doctorIdToFilter) {
      const allowedIds = new Set();

      const hasAccessTable = await db.schema.hasTable('paciente_medico_acessos');
      if (hasAccessTable) {
        const acessos = await db('paciente_medico_acessos').where({ medico_id: doctorIdToFilter }).select('cliente_id');
        acessos.forEach(a => allowedIds.add(a.cliente_id));
      }

      baseClients = baseClients.filter(c => allowedIds.has(c.id));
    } else if (String(incluir_inativos) !== 'true' && !isEmpresa) {
      baseClients = baseClients.filter(c => c.status !== 'inativo');
    }

    return res.json(baseClients);
  } catch (err) {
    console.error('Erro em getClients:', err);
    return res.status(500).json({ error: 'Erro ao listar clientes' });
  }
};

const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const db = require('../../knexfile');
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(id) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const client = clients[0];
    
    // Se quem tenta acessar for um médico, verificar revogação / autorização estrita
    if (req.user) {
      let doctor = null;
      if (req.user.id) {
        doctor = await db('profissionais').where({ usuario_id: req.user.id }).first();
      }
      if (!doctor && req.user.email) {
        doctor = await db('profissionais').where({ email: req.user.email }).first();
      }
      if (!doctor && req.user.profissional_id) {
        doctor = await db('profissionais').where({ id: req.user.profissional_id }).first();
      }

      if (doctor && (doctor.tipo_profissional === 'medico' || doctor.tipo_profissional === 'médico' || req.user.tipo_profissional === 'medico')) {
        const hasAccessTable = await db.schema.hasTable('paciente_medico_acessos');
        if (hasAccessTable) {
          const permissao = await db('paciente_medico_acessos')
            .where({ cliente_id: client.id, medico_id: doctor.id })
            .first();

          if (!permissao) {
            return res.status(403).json({
              error: 'Acesso negado: O acesso ao prontuário deste paciente foi revogado ou não foi autorizado.'
            });
          }
        }
      }
    }

    // Obter dependentes do cliente
    const dependents = await dbHelper.query('dependentes', 'select', { cliente_id: client.id });
    client.dependentes = dependents;
    
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
};

const registerClient = async (req, res) => {
  let {
    nome,
    cpf,
    data_nascimento,
    endereco,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    email,
    celular,
    plano_empresa,
    plano_nome,
    plano_produto,
    plano_numero_carteirinha,
    senha,
    acceptLGPD,
    empresa_id // NOVO CAMPO
  } = req.body;

  if (!endereco && logradouro && numero && estado && cep) {
    endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''}${bairro ? ', ' + bairro : ''}${cidade ? ', ' + cidade : ''} - ${estado}, CEP: ${cep}`;
  }

  if (!nome || !cpf || !data_nascimento || !endereco || !email || !senha) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
  }

  if (!acceptLGPD) {
    return res.status(400).json({ error: 'Você deve aceitar os termos de LGPD para prosseguir' });
  }

  // Validação de idade maior que 18
  const birth = new Date(data_nascimento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 18) {
    return res.status(400).json({ error: 'O cliente titular deve ser maior de 18 anos' });
  }

  try {
    // Verificar se e-mail ou CPF já existem
    const existingUsers = await dbHelper.query('usuarios', 'select', { email });
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
    }

    const existingClients = await dbHelper.query('clientes', 'select', { cpf });
    if (existingClients.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado' });
    }

    // Criar credenciais de login na tabela usuarios
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senha, salt);

    const [userId] = await dbHelper.query('usuarios', 'insert', {
      email,
      senha: passwordHash,
      eh_cliente: true
    });

    // Criar o cliente
    const [clientId] = await dbHelper.query('clientes', 'insert', {
      usuario_id: userId,
      nome,
      cpf,
      data_nascimento,
      endereco,
      email,
      celular,
      plano_empresa,
      plano_nome,
      plano_produto,
      plano_numero_carteirinha,
      plano_tipo: 'free',
      plano_plataforma: 'free',
      status: 'ativo',
      pagamento_status: 'pago',
      lgpd_aceito: true,
      lgpd_aceito_em: new Date()
    });

    // Registrar aceite LGPD
    await dbHelper.query('aceites_lgpd', 'insert', {
      usuario_id: userId,
      aceito_em: new Date(),
      versao_termos: '1.0'
    });

    // Vincular à clínica/empresa se fornecido
    if (empresa_id) {
      await dbHelper.query('cliente_empresas', 'insert', {
        cliente_id: clientId,
        empresa_id: parseInt(empresa_id)
      });
    }

    // Enviar e-mail de primeiro acesso
    await sendFirstAccessEmail({
      to: email,
      nome,
      email,
      senha,
      perfil: 'Cliente'
    });

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      clientId,
      userId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
};

const updateClient = async (req, res) => {
  const { id } = req.params;
  let {
    nome,
    data_nascimento,
    endereco,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    celular,
    plano_empresa,
    plano_nome,
    plano_produto,
    plano_numero_carteirinha,
    plano_plataforma
  } = req.body;

  if (!endereco && logradouro && numero && cidade && estado && cep) {
    endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''}, ${bairro ? bairro + ', ' : ''}${cidade} - ${estado}, CEP: ${cep}`;
  }

  try {
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(id) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await dbHelper.query('clientes', 'update', { id: parseInt(id) }, {
      nome,
      data_nascimento,
      endereco,
      celular,
      plano_empresa,
      plano_nome,
      plano_produto,
      plano_numero_carteirinha,
      plano_plataforma
    });

    return res.json({ message: 'Perfil do cliente atualizado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
};

const toggleClientStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ativo' ou 'inativo'

  try {
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(id) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await dbHelper.query('clientes', 'update', { id: parseInt(id) }, { status });
    return res.json({ message: `Status do cliente atualizado para ${status} com sucesso!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao alterar status do cliente' });
  }
};

const updateClientPayment = async (req, res) => {
  const { id } = req.params;
  const { pagamento_status } = req.body; // 'pago' ou 'pendente'

  try {
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(id) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await dbHelper.query('clientes', 'update', { id: parseInt(id) }, { pagamento_status });
    return res.json({ message: `Status de pagamento atualizado para ${pagamento_status} com sucesso!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar status de pagamento do cliente' });
  }
};

const deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const db = require('../../knexfile');
    const clientId = parseInt(id);
    const client = await db('clientes').where({ id: clientId }).first();
    if (!client) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Apagar permissões de acesso
    await db('paciente_medico_acessos').where({ cliente_id: clientId }).del().catch(() => {});
    // Apagar vínculo com empresas
    await db('cliente_empresas').where({ cliente_id: clientId }).del().catch(() => {});
    // Apagar exames, receitas, bioimpedância, anamnese
    await db('exames').where({ cliente_id: clientId }).del().catch(() => {});
    await db('receitas').where({ cliente_id: clientId }).del().catch(() => {});
    await db('bioimpedancia').where({ cliente_id: clientId }).del().catch(() => {});
    await db('anamnese').where({ cliente_id: clientId }).del().catch(() => {});
    await db('patient_anamnesis_requests').where({ cliente_id: clientId }).del().catch(() => {});

    // Apagar o paciente da tabela clientes
    await db('clientes').where({ id: clientId }).del();

    // Se houver usuário associado, apagar o usuário
    if (client.usuario_id) {
      await db('usuarios').where({ id: client.usuario_id }).del().catch(() => {});
    }

    return res.json({ message: 'Paciente e todo o seu histórico foram excluídos permanentemente do sistema.' });
  } catch (err) {
    console.error('Erro ao excluir paciente:', err);
    return res.status(500).json({ error: 'Erro ao excluir paciente do sistema' });
  }
};

module.exports = {
  getClients,
  getClientById,
  registerClient,
  updateClient,
  toggleClientStatus,
  updateClientPayment,
  deleteClient
};
