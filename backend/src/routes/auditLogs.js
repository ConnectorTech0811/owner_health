const express = require('express');
const router = express.Router();
const dbHelper = require('../utils/dbHelper');
const { authenticateToken } = require('../middleware/auth');
const db = require('../../knexfile');

// Middleware para garantir que apenas admins globais possam ver os logs
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Acesso negado: apenas administradores globais podem ver auditoria.' });
  }
  next();
};

router.use(authenticateToken);
router.use(requireAdmin);

// Retornar logs com paginação e ordenação descrescente
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, table, userEmail } = req.query;
    const offset = (page - 1) * limit;

    let query = db('audit_logs').select('*').orderBy('created_at', 'desc').limit(limit).offset(offset);
    let countQuery = db('audit_logs').count('* as total');

    if (action) {
      query = query.where('action_type', action);
      countQuery = countQuery.where('action_type', action);
    }
    if (table) {
      query = query.where('table_name', table);
      countQuery = countQuery.where('table_name', table);
    }
    if (userEmail) {
      query = query.where('user_email', 'like', `%${userEmail}%`);
      countQuery = countQuery.where('user_email', 'like', `%${userEmail}%`);
    }

    const logs = await query;
    const [ { total } ] = await countQuery;

    res.json({
      data: logs,
      meta: {
        total: parseInt(total),
        page: parseInt(page),
        last_page: Math.ceil(parseInt(total) / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
});

module.exports = router;
