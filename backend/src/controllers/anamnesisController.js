const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

const getAnamnesis = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const records = await dbHelper.query('anamnese', 'select', { cliente_id });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar anamnese' });
  }
};

const createAnamnesis = async (req, res) => {
  const { cliente_id } = req.params;
  const {
    queixa_principal, historico_doencas, alergias, medicamentos_uso,
    historico_familiar, habitos, pressao_arterial, glicemia,
    cirurgias_anteriores, observacoes
  } = req.body;

  try {
    const novo = {
      cliente_id, queixa_principal, historico_doencas, alergias,
      medicamentos_uso, historico_familiar, habitos, pressao_arterial,
      glicemia, cirurgias_anteriores, observacoes,
      criado_em: new Date().toISOString()
    };
    try {
      const [id] = await db('anamnese').insert(novo);
      return res.status(201).json({ id, ...novo });
    } catch {
      const created = await dbHelper.query('anamnese', 'insert', novo);
      return res.status(201).json(created);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar anamnese' });
  }
};

const updateAnamnesis = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    try {
      await db('anamnese').where({ id }).update(data);
    } catch {
      await dbHelper.query('anamnese', 'update', { id, ...data });
    }
    return res.json({ message: 'Anamnese atualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar anamnese' });
  }
};

module.exports = { getAnamnesis, createAnamnesis, updateAnamnesis };
