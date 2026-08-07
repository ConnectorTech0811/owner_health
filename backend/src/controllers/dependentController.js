const dbHelper = require('../utils/dbHelper');
const bcrypt = require('bcryptjs');

const getDependentsByClient = async (req, res) => {
  const { clientId } = req.params;
  try {
    const dependents = await dbHelper.query('dependentes', 'select', { cliente_id: parseInt(clientId) });
    return res.json(dependents);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar dependentes' });
  }
};

const addDependent = async (req, res) => {
  const { clientId } = req.params;
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
    senha // opcional para login do dependente
  } = req.body;

  if (!endereco && logradouro && numero && cidade && estado && cep) {
    endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''}, ${bairro ? bairro + ', ' : ''}${cidade} - ${estado}, CEP: ${cep}`;
  }

  if (!nome || !cpf || !data_nascimento || !endereco) {
    return res.status(400).json({ error: 'Nome, CPF, Data de Nascimento e Endereço são obrigatórios' });
  }

  try {
    // Verificar se o cliente existe e qual o seu plano
    const clients = await dbHelper.query('clientes', 'select', { id: parseInt(clientId) });
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente titular não encontrado' });
    }
    const client = clients[0];

    // Verificar se atingiu o limite de dependentes (máximo 2 dependentes)
    const existingDependents = await dbHelper.query('dependentes', 'select', { cliente_id: client.id });
    if (existingDependents.length >= 2) {
      return res.status(400).json({
        error: 'Limite de dependentes excedido. Você pode cadastrar no máximo 2 dependentes por conta.'
      });
    }

    let userId = null;
    // Se fornecer email e senha, criamos credenciais de usuário para o dependente
    if (email && senha) {
      const existingUsers = await dbHelper.query('usuarios', 'select', { email });
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Este e-mail de dependente já está cadastrado' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(senha, salt);

      const [newUserId] = await dbHelper.query('usuarios', 'insert', {
        email,
        senha: passwordHash,
        eh_dependente: true
      });
      userId = newUserId;
    }

    // Inserir dependente
    const [dependentId] = await dbHelper.query('dependentes', 'insert', {
      cliente_id: client.id,
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
      plano_numero_carteirinha
    });

    return res.status(201).json({
      message: 'Dependente cadastrado com sucesso!',
      dependentId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cadastrar dependente' });
  }
};

const removeDependent = async (req, res) => {
  const { id } = req.params;
  try {
    const dependents = await dbHelper.query('dependentes', 'select', { id: parseInt(id) });
    if (dependents.length === 0) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }
    const dependent = dependents[0];

    // Se o dependente possuía credenciais de login, excluir o usuário correspondente
    if (dependent.usuario_id) {
      await dbHelper.query('usuarios', 'delete', { id: dependent.usuario_id });
    }

    await dbHelper.query('dependentes', 'delete', { id: parseInt(id) });
    return res.json({ message: 'Dependente removido com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover dependente' });
  }
};

module.exports = {
  getDependentsByClient,
  addDependent,
  removeDependent
};
