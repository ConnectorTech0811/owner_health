const db = require('../../knexfile');

const getTemplates = async (req, res) => {
  const { empresa_id } = req.params;
  try {
    const templates = await db('anamnesis_templates')
      .where({ empresa_id: parseInt(empresa_id) })
      .orderBy('criado_em', 'desc')
      .select();

    const emp = await db('empresas').where({ id: parseInt(empresa_id) }).first();
    const empNome = emp ? (emp.nome_fantasia || emp.razao_social || emp.nome_responsavel) : 'Clínica/Hospital';

    const parsed = templates.map(t => {
      try {
        if (typeof t.sections_data === 'string') t.sections_data = JSON.parse(t.sections_data);
      } catch {}

      if (!t.criado_por_nome || t.criado_por_nome === 'Usuário') {
        t.criado_por_nome = empNome;
      }
      if (!t.criado_por_perfil) {
        t.criado_por_perfil = 'Clínica/Hospital';
      }
      return t;
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Erro em getTemplates:', err);
    return res.status(500).json({ error: 'Erro ao buscar modelos' });
  }
};

const createTemplate = async (req, res) => {
  const { empresa_id, titulo, nome, descricao, sections_data, conteudo, criado_por_nome, criado_por_perfil } = req.body;
  try {
    const sectionsJson = sections_data 
      ? (typeof sections_data === 'string' ? sections_data : JSON.stringify(sections_data))
      : (conteudo ? (typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo)) : '[]');

    let autorNome = criado_por_nome;
    let autorPerfil = criado_por_perfil;

    if (!autorNome || autorNome === 'Usuário') {
      if (req.user) {
        autorNome = req.user.nome || req.user.name || req.user.razao_social || req.user.nome_fantasia;
      }
      if (!autorNome && empresa_id) {
        const emp = await db('empresas').where({ id: parseInt(empresa_id) }).first();
        if (emp) autorNome = emp.nome_fantasia || emp.razao_social || emp.nome_responsavel;
      }
      if (!autorNome) autorNome = 'Clínica/Hospital';
    }

    if (!autorPerfil || autorPerfil === 'Usuário') {
      autorPerfil = 'Clínica/Hospital';
    }

    const data = {
      empresa_id: parseInt(empresa_id),
      nome: titulo || nome || 'Modelo sem nome',
      descricao: descricao || '',
      sections_data: sectionsJson,
      criado_por_nome: autorNome,
      criado_por_perfil: autorPerfil,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    const [id] = await db('anamnesis_templates').insert(data);
    
    let parsedSections;
    try { parsedSections = JSON.parse(sectionsJson); } catch { parsedSections = []; }
    
    return res.status(201).json({ id, ...data, sections_data: parsedSections });
  } catch (err) {
    console.error('Erro em createTemplate:', err);
    return res.status(500).json({ error: 'Erro ao criar modelo' });
  }
};

const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { titulo, nome, descricao, sections_data, conteudo } = req.body;
  try {
    const data = { atualizado_em: new Date().toISOString() };
    if (titulo !== undefined) data.nome = titulo;
    if (nome !== undefined) data.nome = nome;
    if (descricao !== undefined) data.descricao = descricao;
    if (sections_data !== undefined) data.sections_data = typeof sections_data === 'string' ? sections_data : JSON.stringify(sections_data);
    if (conteudo !== undefined) data.sections_data = typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo);

    await db('anamnesis_templates').where({ id }).update(data);
    return res.json({ message: 'Modelo atualizado com sucesso' });
  } catch (err) {
    console.error('Erro em updateTemplate:', err);
    return res.status(500).json({ error: 'Erro ao atualizar modelo' });
  }
};

const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    await db('anamnesis_templates').where({ id }).del();
    return res.json({ message: 'Modelo excluído com sucesso' });
  } catch (err) {
    console.error('Erro em deleteTemplate:', err);
    return res.status(500).json({ error: 'Erro ao excluir modelo' });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
