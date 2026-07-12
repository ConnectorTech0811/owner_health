const jwt = require('jsonwebtoken');
const { getContext } = require('./context');


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'owner_health_secret');
    req.user = decoded;
    
    // Injeta o usuário no contexto assíncrono para o dbHelper usar nos logs de auditoria
    const store = getContext();
    if (store) {
      store.set('user', decoded);
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

module.exports = { authenticateToken };
