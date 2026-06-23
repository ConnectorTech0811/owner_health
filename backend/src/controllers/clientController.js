const dbHelper = require('../utils/dbHelper');
const bcrypt = require('bcryptjs');
const { sendFirstAccessEmail } = require('../utils/mailer');

const getClients = async (req, res) => {
  try {
    const clients = await dbHelper.query('clientes', 'select');
    return res.json(clients);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar clientes' });
  }
};

const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(id) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const client = clients[0];
    
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
    acceptLGPD
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

module.exports = {
  getClients,
  getClientById,
  registerClient,
  updateClient,
  toggleClientStatus,
  updateClientPayment
};
