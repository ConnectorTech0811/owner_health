const jwt = require('jsonwebtoken');
const { getContext } = require('./context');


const checkUserIsActive = async (userPayload) => {
  if (!userPayload || !userPayload.id) return true;
  try {
    const db = require('../../knexfile');

    // 1. Checar na tabela usuarios
    const userRecord = await db('usuarios').where({ id: userPayload.id }).first().catch(() => null);
    if (userRecord) {
      if (userRecord.ativo === 0 || userRecord.ativo === false || userRecord.status === 'inativo' || userRecord.status === 'suspenso') {
        return false;
      }
    }

    // 2. Checar na tabela profissionais (médicos, secretários, administradores)
    const profRecord = await db('profissionais')
      .where({ usuario_id: userPayload.id })
      .orWhere({ email: userPayload.email })
      .first()
      .catch(() => null);

    if (profRecord) {
      if (profRecord.ativo === 0 || profRecord.ativo === false || profRecord.status === 'inativo' || profRecord.status === 'suspenso') {
        return false;
      }
    }

    // 3. Checar na tabela clientes
    const clientRecord = await db('clientes')
      .where({ usuario_id: userPayload.id })
      .orWhere({ email: userPayload.email })
      .first()
      .catch(() => null);

    if (clientRecord) {
      if (clientRecord.status === 'inativo' || clientRecord.status === 'suspenso' || clientRecord.ativo === 0) {
        return false;
      }
    }

    // 4. Checar na tabela empresas
    const empresaRecord = await db('empresas')
      .where({ usuario_id: userPayload.id })
      .orWhere({ email: userPayload.email })
      .first()
      .catch(() => null);

    if (empresaRecord) {
      if (empresaRecord.status === 'inativo' || empresaRecord.status === 'suspenso' || empresaRecord.ativo === 0) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao verificar status ativo do usuário:', err);
    return true;
  }
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'owner_health_secret');
    req.user = decoded;

    // Validação rigorosa em tempo real: checar se o usuário está inativo/suspenso
    const isActive = await checkUserIsActive(decoded);
    if (!isActive) {
      return res.status(403).json({
        error: 'Sua conta está inativa ou suspensa. Entre em contato com a administração para restabelecer o acesso ao sistema.',
        code: 'USER_INACTIVE'
      });
    }
    
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

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'owner_health_secret');
      req.user = decoded;
      
      const store = getContext();
      if (store) {
        store.set('user', decoded);
      }
    } catch (err) {
      // Ignora erro de token inválido para requisições anônimas
    }
  }

  next();
};

module.exports = { authenticateToken, optionalAuthenticateToken, checkUserIsActive };

