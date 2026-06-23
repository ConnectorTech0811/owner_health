const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const getBioimpedance = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const records = await dbHelper.query('bioimpedancia', 'select', { cliente_id });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar bioimpedância' });
  }
};

const createBioimpedance = async (req, res) => {
  const { cliente_id } = req.params;
  const { data, peso, gordura_perc, massa_muscular, imc, agua_perc, massa_ossea, observacoes } = req.body;
  if (!data || !peso) return res.status(400).json({ error: 'Data e peso são obrigatórios' });
  try {
    const novo = { cliente_id, data, peso, gordura_perc, massa_muscular, imc, agua_perc, massa_ossea, observacoes, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('bioimpedancia').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('bioimpedancia', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar bioimpedância' });
  }
};

const deleteBioimpedance = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('bioimpedancia').where({ id }).delete();
    } catch {
      await dbHelper.query('bioimpedancia', 'delete', { id });
    }
    return res.json({ message: 'Registro removido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover registro' });
  }
};

module.exports = { getBioimpedance, createBioimpedance, deleteBioimpedance };
