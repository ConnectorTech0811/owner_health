const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const getSatisfactionByClient = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const records = await dbHelper.query('satisfacao', 'select', { cliente_id });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
};

const createSatisfaction = async (req, res) => {
  const { cliente_id } = req.params;
  const {
    profissional_id, profissional_nome, especialidade,
    pontualidade, clareza, qualidade, comentario
  } = req.body;

  if (!pontualidade || !clareza || !qualidade) {
    return res.status(400).json({ error: 'As três avaliações são obrigatórias' });
  }

  const media = ((Number(pontualidade) + Number(clareza) + Number(qualidade)) / 3).toFixed(1);

  try {
    const novo = {
      cliente_id, profissional_id, profissional_nome, especialidade,
      pontualidade, clareza, qualidade, media,
      comentario, criado_em: new Date().toISOString()
    };
    try {
      const [id] = await db('satisfacao').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('satisfacao', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar avaliação' });
  }
};

const getSatisfactionByProfessional = async (req, res) => {
  const { profissional_id } = req.params;
  try {
    const records = await dbHelper.query('satisfacao', 'select', { profissional_id });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar avaliações do profissional' });
  }
};

module.exports = { getSatisfactionByClient, createSatisfaction, getSatisfactionByProfessional };
