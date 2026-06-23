const dbHelper = require('../utils/dbHelper');
const bcrypt = require('bcryptjs');
const { sendFirstAccessEmail } = require('../utils/mailer');

const getProfessionals = async (req, res) => {
  const { companyId } = req.query;
  try {
    if (companyId) {
      // Listar profissionais vinculados a uma empresa específica
      const relations = await dbHelper.query('profissional_empresas', 'select', { empresa_id: parseInt(companyId) });
      const professionals = [];
      for (const rel of relations) {
        const profs = await dbHelper.query('profissionais', 'select', { id: rel.profissional_id });
        if (profs.length > 0) {
          professionals.push(profs[0]);
        }
      }
      return res.json(professionals);
    }
    
    const professionals = await dbHelper.query('profissionais', 'select');
    return res.json(professionals);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar profissionais' });
  }
};

const getProfessionalById = async (req, res) => {
  const { id } = req.params;
  try {
    const professionals = await dbHelper.query('profissionais', 'select', { id: parseInt(id) });
    if (professionals.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }
    const professional = professionals[0];

    // Obter planos de saúde atendidos pelo profissional
    const rawPlans = await dbHelper.query('profissional_planos_saude', 'select', { profissional_id: professional.id });
    const plansList = [];
    for (const rp of rawPlans) {
      const planDetails = await dbHelper.query('planos_saude', 'select', { id: rp.plano_saude_id });
      if (planDetails.length > 0) {
        plansList.push({
          id: rp.id,
          health_plan_id: rp.plano_saude_id,
          company_name: planDetails[0].operadora,
          plan_name: planDetails[0].plano,
          product_name: planDetails[0].produto,
          procedures: rp.procedimentos
        });
      }
    }
    professional.health_plans = plansList;

    // Obter clínicas/hospitais vinculados
    const relations = await dbHelper.query('profissional_empresas', 'select', { profissional_id: professional.id });
    const companiesList = [];
    for (const rel of relations) {
      const compDetails = await dbHelper.query('empresas', 'select', { id: rel.empresa_id });
      if (compDetails.length > 0) {
        companiesList.push(compDetails[0]);
      }
    }
    professional.companies = companiesList;

    return res.json(professional);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao obter profissional' });
  }
};

const toggleProfessionalAccess = async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  try {
    const professionals = await dbHelper.query('profissionais', 'select', { id: parseInt(id) });
    if (professionals.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    await dbHelper.query('profissionais', 'update', { id: parseInt(id) }, { ativo: !!ativo });

    // Também bloqueia ou desbloqueia o usuário correspondente
    const professional = professionals[0];
    if (professional.usuario_id) {
      await dbHelper.query('usuarios', 'update', { id: professional.usuario_id }, { ativo: !!ativo });
    }

    return res.json({
      message: ativo ? 'Acesso do profissional ativado com sucesso!' : 'Acesso do profissional suspenso com sucesso!'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar status do profissional' });
  }
};

const registerProfessional = async (req, res) => {
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
    numero_conselho,
    tipo_profissional, // médico, fisioterapeuta, nutricionista, psicólogo, fonoaudiólogo, terapeuta
    email,
    celular,
    senha,
    company_id // opcional: se cadastrado a partir de uma clínica/hospital
  } = req.body;

  if (!endereco && logradouro && numero && estado && cep) {
    endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''}${bairro ? ', ' + bairro : ''}${cidade ? ', ' + cidade : ''} - ${estado}, CEP: ${cep}`;
  }

  // Validação de e-mail corporativo (bloqueia e-mails públicos para profissionais)
  const publicEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.com.br', 'live.com', 'aol.com', 'icloud.com', 'msn.com', 'terra.com.br', 'uol.com.br', 'bol.com.br'];
  const emailDomain = email && email.includes('@') ? email.split('@')[1].toLowerCase() : '';
  if (publicEmailDomains.includes(emailDomain)) {
    return res.status(400).json({ error: 'E-mails públicos (como Gmail, Outlook, Yahoo) não são permitidos para profissionais.' });
  }

  const isMedical = !tipo_profissional || !['secretario', 'administrativo'].includes(tipo_profissional.toLowerCase());

  if (!nome || !cpf || !data_nascimento || !endereco || (isMedical && !numero_conselho) || !email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  try {
    const existingUsers = await dbHelper.query('usuarios', 'select', { email });
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const existingProfs = await dbHelper.query('profissionais', 'select', { cpf });
    if (existingProfs.length > 0) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    // Criar usuário profissional
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senha, salt);

    const [userId] = await dbHelper.query('usuarios', 'insert', {
      email,
      senha: passwordHash,
      eh_profissional: true
    });

    const [professionalId] = await dbHelper.query('profissionais', 'insert', {
      usuario_id: userId,
      nome,
      cpf,
      data_nascimento,
      endereco,
      numero_conselho,
      tipo_profissional: tipo_profissional || null,
      email,
      celular,
      ativo: true
    });

    // Se houver vínculo inicial com uma clínica/hospital
    if (company_id) {
      await dbHelper.query('profissional_empresas', 'insert', {
        profissional_id: professionalId,
        empresa_id: parseInt(company_id)
      });
    }

    // Enviar e-mail de primeiro acesso
    await sendFirstAccessEmail({
      to: email,
      nome,
      email,
      senha,
      perfil: 'Profissional de Saúde'
    });

    return res.status(201).json({
      message: 'Profissional de saúde cadastrado com sucesso!',
      professionalId,
      userId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cadastrar profissional' });
  }
};

// Associar profissional a clínica
const linkToCompany = async (req, res) => {
  const { id } = req.params; // professional_id
  const { company_id } = req.body;

  if (!company_id) {
    return res.status(400).json({ error: 'Selecione uma clínica ou hospital' });
  }

  try {
    // Verificar se já existe vínculo
    const existing = await dbHelper.query('profissional_empresas', 'select', {
      profissional_id: parseInt(id),
      empresa_id: parseInt(company_id)
    });

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Profissional já está vinculado a esta empresa' });
    }

    await dbHelper.query('profissional_empresas', 'insert', {
      profissional_id: parseInt(id),
      empresa_id: parseInt(company_id)
    });

    return res.json({ message: 'Vínculo profissional cadastrado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao vincular profissional a clínica/hospital' });
  }
};

// Desvincular profissional de clínica
const unlinkFromCompany = async (req, res) => {
  const { id } = req.params; // professional_id
  const { companyId } = req.query;

  try {
    await dbHelper.query('profissional_empresas', 'delete', {
      profissional_id: parseInt(id),
      empresa_id: parseInt(companyId)
    });
    return res.json({ message: 'Vínculo profissional removido com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao desvincular profissional' });
  }
};

// Associar planos de saúde atendidos pelo profissional
const addProfessionalHealthPlan = async (req, res) => {
  const { id } = req.params; // professional_id
  const { health_plan_id, procedures } = req.body;

  try {
    const [insertedId] = await dbHelper.query('profissional_planos_saude', 'insert', {
      profissional_id: parseInt(id),
      plano_saude_id: parseInt(health_plan_id),
      procedimentos: procedures
    });
    return res.status(201).json({ message: 'Plano associado com sucesso!', relationId: insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao associar plano' });
  }
};

const removeProfessionalHealthPlan = async (req, res) => {
  const { relationId } = req.params;
  try {
    await dbHelper.query('profissional_planos_saude', 'delete', { id: parseInt(relationId) });
    return res.json({ message: 'Plano desassociado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao desassociar plano' });
  }
};

module.exports = {
  getProfessionals,
  getProfessionalById,
  registerProfessional,
  toggleProfessionalAccess,
  linkToCompany,
  unlinkFromCompany,
  addProfessionalHealthPlan,
  removeProfessionalHealthPlan
};
