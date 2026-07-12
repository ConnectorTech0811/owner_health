const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const getPrescriptions = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const prescriptions = await dbHelper.query('receitas', 'select', { cliente_id });
    return res.json(prescriptions);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar receitas' });
  }
};

const createPrescription = async (req, res) => {
  const { cliente_id } = req.params;
  const { medico, data, observacoes, arquivo_url, medicamentos } = req.body;
  if (!data) return res.status(400).json({ error: 'Data é obrigatória' });
  try {
    const novo = { cliente_id, medico, data, observacoes, arquivo_url, medicamentos, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('receitas').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('receitas', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar receita' });
  }
};

const deletePrescription = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('receitas').where({ id }).delete();
    } catch {
      await dbHelper.query('receitas', 'delete', { id });
    }
    return res.json({ message: 'Receita removida' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover receita' });
  }
};

const updatePrescription = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('receitas').where({ id }).update(data);
    } catch {
      await dbHelper.query('receitas', 'update', { id, ...data });
    }
    return res.json({ message: 'Receita atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar receita' });
  }
};

module.exports = { getPrescriptions, createPrescription, updatePrescription, deletePrescription };
