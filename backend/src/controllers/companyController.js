const dbHelper = require('../utils/dbHelper');
const bcrypt = require('bcryptjs');
const db = require('../../knexfile');

const getCompanies = async (req, res) => {
  try {
    const companies = await dbHelper.query('empresas', 'select');
    return res.json(companies);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar empresas' });
  }
};

const getPublicCompanies = async (req, res) => {
  try {
    const companies = await dbHelper.query('empresas', 'select');
    const publicCompanies = companies.map(c => ({
      id: c.id,
      nome_fantasia: c.nome_fantasia || c.razao_social
    }));
    return res.json(publicCompanies);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar empresas' });
  }
};

const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    const companies = await dbHelper.query('empresas', 'select', { id: parseInt(id) });
    if (companies.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    const company = companies[0];

    // Obter planos de saúde atendidos pela empresa
    const rawPlans = await dbHelper.query('empresa_planos_saude', 'select', { empresa_id: company.id });
    
    // Obter detalhes de cada plano de saúde cadastrado
    const companyPlans = [];
    for (const rawPlan of rawPlans) {
      const planDetails = await dbHelper.query('planos_saude', 'select', { id: rawPlan.plano_saude_id });
      if (planDetails.length > 0) {
        companyPlans.push({
          id: rawPlan.id,
          health_plan_id: rawPlan.plano_saude_id,
          company_name: planDetails[0].operadora,
          plan_name: planDetails[0].plano,
          product_name: planDetails[0].produto,
          procedures: rawPlan.procedimentos
        });
      }
    }
    company.health_plans = companyPlans;

    // Obter profissionais vinculados
    const professionalRelations = await dbHelper.query('profissional_empresas', 'select', { empresa_id: company.id });
    const professionalsList = [];
    for (const rel of professionalRelations) {
      const profDetails = await dbHelper.query('profissionais', 'select', { id: rel.profissional_id });
      if (profDetails.length > 0) {
        professionalsList.push(profDetails[0]);
      }
    }
    company.professionals = professionalsList;

    return res.json(company);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
};

const registerCompany = async (req, res) => {
  const {
    razao_social,
    nome_fantasia,
    cnpj,
    nome_responsavel,
    cpf_responsavel,
    cargo_responsavel,
    email,
    celular,
    senha
  } = req.body;

  if (!razao_social || !nome_fantasia || !cnpj || !nome_responsavel || !cpf_responsavel || !cargo_responsavel || !email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  try {
    const existingUsers = await dbHelper.query('usuarios', 'select', { email });
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso' });
    }

    const existingCompanies = await dbHelper.query('empresas', 'select', { cnpj });
    if (existingCompanies.length > 0) {
      return res.status(400).json({ error: 'Este CNPJ já está cadastrado' });
    }

    // Criar credenciais de usuário
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senha, salt);

    const [userId] = await dbHelper.query('usuarios', 'insert', {
      email,
      senha: passwordHash,
      eh_empresa: true
    });

    const [companyId] = await dbHelper.query('empresas', 'insert', {
      usuario_id: userId,
      razao_social,
      nome_fantasia,
      cnpj,
      nome_responsavel,
      cpf_responsavel,
      cargo_responsavel,
      email,
      celular,
      plano_tipo: 'enterprise',
      pago: false // default false até realizar pagamento
    });

    return res.status(201).json({
      message: 'Empresa cadastrada com sucesso!',
      companyId,
      userId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa' });
  }
};

// Gerenciar quais planos de saúde a empresa atende
const addCompanyHealthPlan = async (req, res) => {
  const { id } = req.params; // company_id
  const { health_plan_id, procedures } = req.body;

  if (!health_plan_id) {
    return res.status(400).json({ error: 'Selecione um plano de saúde' });
  }

  try {
    const [insertedId] = await dbHelper.query('empresa_planos_saude', 'insert', {
      empresa_id: parseInt(id),
      plano_saude_id: parseInt(health_plan_id),
      procedimentos: procedures
    });

    return res.status(201).json({
      message: 'Plano de saúde associado à empresa com sucesso!',
      relationId: insertedId
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao associar plano de saúde' });
  }
};

const removeCompanyHealthPlan = async (req, res) => {
  const { relationId } = req.params;
  try {
    await dbHelper.query('empresa_planos_saude', 'delete', { id: parseInt(relationId) });
    return res.json({ message: 'Plano de saúde desassociado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao desassociar plano de saúde' });
  }
};

// Registrar pagamento manual da licença da empresa
const updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { paid } = req.body;

  try {
    await dbHelper.query('empresas', 'update', { id: parseInt(id) }, { pago: !!paid });
    return res.json({ message: 'Status de pagamento atualizado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

const getCompanySchedules = async (req, res) => {
  const { id } = req.params;
  try {
    const schedules = await dbHelper.query('empresa_agendas', 'select', { empresa_id: parseInt(id) });
    return res.json(schedules);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar agendas' });
  }
};

const createCompanySchedule = async (req, res) => {
  const { id } = req.params;
  const { profissional_id, data, horario_inicio, horario_fim } = req.body;
  if (!profissional_id || !data || !horario_inicio || !horario_fim) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  try {
    const [insertedId] = await dbHelper.query('empresa_agendas', 'insert', {
      empresa_id: parseInt(id),
      profissional_id: parseInt(profissional_id),
      data,
      horario_inicio,
      horario_fim,
      status: 'disponivel'
    });
    return res.status(201).json({ message: 'Agenda criada com sucesso!', id: insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar agenda' });
  }
};

const getAnamnesisConfig = async (req, res) => {
  const { id } = req.params;
  try {
    const configs = await dbHelper.query('empresa_anamnese_config', 'select', { empresa_id: parseInt(id) });
    if (configs.length === 0) {
      const defaultConfig = {
        empresa_id: parseInt(id),
        campos_ativos: JSON.stringify({
          queixa_principal: true,
          historico_doencas: true,
          alergias: true,
          medicamentos_uso: true,
          historico_familiar: true,
          habitos: true,
          pressao_arterial: true,
          glicemia: true,
          cirurgias_anteriores: true
        })
      };
      await dbHelper.query('empresa_anamnese_config', 'insert', defaultConfig);
      return res.json(defaultConfig);
    }
    return res.json(configs[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter configuração de anamnese' });
  }
};

const updateAnamnesisConfig = async (req, res) => {
  const { id } = req.params;
  const { campos_ativos } = req.body;
  try {
    const configs = await dbHelper.query('empresa_anamnese_config', 'select', { empresa_id: parseInt(id) });
    const activeFieldsStr = typeof campos_ativos === 'object' ? JSON.stringify(campos_ativos) : campos_ativos;
    if (configs.length === 0) {
      await dbHelper.query('empresa_anamnese_config', 'insert', {
        empresa_id: parseInt(id),
        campos_ativos: activeFieldsStr
      });
    } else {
      await dbHelper.query('empresa_anamnese_config', 'update', { empresa_id: parseInt(id) }, {
        campos_ativos: activeFieldsStr
      });
    }
    return res.json({ message: 'Configuração atualizada com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
};

const getSharedPatientData = async (req, res) => {
  const { cpfOrCode } = req.params;
  try {
    let client = null;
    const cleanCpf = cpfOrCode.replace(/\D/g, '');

    const clients = await dbHelper.query('clientes', 'select');
    client = clients.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);

    if (!client) {
      client = clients.find(c => String(c.id) === cpfOrCode || c.email.toLowerCase() === cpfOrCode.toLowerCase());
    }

    if (!client) {
      return res.status(404).json({ error: 'Paciente não encontrado ou compartilhamento não autorizado.' });
    }

    const exams = await dbHelper.query('exames', 'select', { cliente_id: client.id }).catch(() => []);
    const prescriptions = await dbHelper.query('receitas', 'select', { cliente_id: client.id }).catch(() => []);
    const bioimpedance = await dbHelper.query('bioimpedancia', 'select', { cliente_id: client.id }).catch(() => []);
    const legacyAnamnesis = await dbHelper.query('anamnese', 'select', { cliente_id: client.id }).catch(() => []);

    let structuredAnamnesis = [];
    try {
      const requests = await db('patient_anamnesis_requests')
        .where({ cliente_id: client.id })
        .whereIn('status', ['concluido', 'respondido'])
        .orderBy('respondido_em', 'desc')
        .select();

      for (const reqItem of requests) {
        const answers = await db('patient_anamnesis_answers')
          .where({ request_id: reqItem.id })
          .select();

        const qIds = answers.map(a => a.question_id);
        const questions = qIds.length > 0
          ? await db('patient_anamnesis_questions').whereIn('id', qIds).select()
          : [];

        const qMap = new Map();
        questions.forEach(q => qMap.set(q.id, q.texto));

        const formattedAnswers = answers.map(a => ({
          pergunta: qMap.get(a.question_id) || `Pergunta #${a.question_id}`,
          resposta: a.resposta
        }));

        structuredAnamnesis.push({
          id: 'req_' + reqItem.id,
          request_id: reqItem.id,
          tipo: 'estruturada',
          status: reqItem.status,
          criado_em: reqItem.respondido_em || reqItem.criado_em,
          respostas: formattedAnswers
        });
      }
    } catch (e) {
      console.warn('Aviso ao carregar anamnese estruturada:', e.message);
    }

    const allAnamnesis = [...structuredAnamnesis, ...legacyAnamnesis];

    return res.json({
      patient: {
        id: client.id,
        nome: client.nome,
        cpf: client.cpf,
        email: client.email,
        celular: client.celular,
        data_nascimento: client.data_nascimento,
        endereco: client.endereco,
        plano_empresa: client.plano_empresa,
        plano_nome: client.plano_nome,
        plano_produto: client.plano_produto,
        plano_numero_carteirinha: client.plano_numero_carteirinha
      },
      exams,
      prescriptions,
      bioimpedance,
      anamnesis: allAnamnesis
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao obter dados compartilhados do paciente' });
  }
};

const createCompanyDocument = async (req, res) => {
  const { id } = req.params;
  const { profissional_id, paciente_cpf, tipo, conteudo, assinado_digitalmente } = req.body;
  if (!paciente_cpf || !tipo || !conteudo) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  try {
    const db = require('../../knexfile');
    const [insertedId] = await db('empresa_documentos_emitidos').insert({
      empresa_id: parseInt(id),
      profissional_id: profissional_id ? parseInt(profissional_id) : null,
      paciente_cpf,
      tipo,
      conteudo,
      assinado_digitalmente: !!assinado_digitalmente,
      criado_em: new Date().toISOString()
    });
    return res.status(201).json({ message: 'Documento emitido e assinado com sucesso!', id: insertedId });
  } catch (err) {
    console.error('Erro em createCompanyDocument:', err);
    return res.status(500).json({ error: 'Erro ao emitir documento' });
  }
};

const getCompanyDocuments = async (req, res) => {
  const { id } = req.params;
  try {
    const db = require('../../knexfile');
    const docs = await db('empresa_documentos_emitidos')
      .where({ empresa_id: parseInt(id) })
      .orderBy('criado_em', 'desc')
      .select();

    const profIds = Array.from(new Set(docs.map(d => d.profissional_id).filter(Boolean)));
    const profs = profIds.length > 0 ? await db('profissionais').whereIn('id', profIds).select('id', 'nome', 'numero_conselho') : [];
    const profMap = new Map(profs.map(p => [p.id, p]));

    const result = docs.map(d => ({
      ...d,
      medico_nome: profMap.get(d.profissional_id)?.nome || 'Médico Credenciado',
      medico_crm: profMap.get(d.profissional_id)?.numero_conselho || 'CRM/UF'
    }));

    return res.json(result);
  } catch (err) {
    console.error('Erro em getCompanyDocuments:', err);
    return res.status(500).json({ error: 'Erro ao obter histórico de documentos' });
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  getPublicCompanies,
  registerCompany,
  addCompanyHealthPlan,
  removeCompanyHealthPlan,
  updatePaymentStatus,
  getCompanySchedules,
  createCompanySchedule,
  getAnamnesisConfig,
  updateAnamnesisConfig,
  getSharedPatientData,
  createCompanyDocument,
  getCompanyDocuments
};
