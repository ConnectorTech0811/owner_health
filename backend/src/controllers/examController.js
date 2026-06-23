const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const getExams = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const exams = await dbHelper.query('exames', 'select', { cliente_id });
    return res.json(exams);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar exames' });
  }
};

const createExam = async (req, res) => {
  const { cliente_id } = req.params;
  const { tipo, data, laboratorio, medico_solicitante, observacoes, arquivo_url } = req.body;
  if (!tipo || !data) return res.status(400).json({ error: 'Tipo e data são obrigatórios' });
  try {
    const novo = { cliente_id, tipo, data, laboratorio, medico_solicitante, observacoes, arquivo_url, criado_em: new Date().toISOString() };
    try {
      const [id] = await db('exames').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('exames', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar exame' });
  }
};

const updateExam = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('exames').where({ id }).update(data);
    } catch {
      await dbHelper.query('exames', 'update', { id, ...data });
    }
    return res.json({ message: 'Exame atualizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar exame' });
  }
};

const deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    try {
      await db('exames').where({ id }).delete();
    } catch {
      await dbHelper.query('exames', 'delete', { id });
    }
    return res.json({ message: 'Exame removido' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover exame' });
  }
};

module.exports = { getExams, createExam, updateExam, deleteExam };
