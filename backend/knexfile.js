require('dotenv').config();
const knex = require('knex');

// Padrão para detectar colunas de data/hora por nome
const DATE_COLUMN_PATTERN = /^(data|date|criado_em|atualizado_em|aceito_em|lgpd_aceito_em|data_inicio|data_fim|data_nascimento)$/i;

// Função auxiliar para converter strings ISO para o formato de DATETIME do MySQL (YYYY-MM-DD HH:MM:SS)
// e converter strings vazias em colunas de data para NULL
function processDataForMySQL(data) {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(processDataForMySQL);
  }
  
  const formatted = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      // Converte ISO-8601 para formato MySQL DATETIME
      formatted[key] = val.slice(0, 19).replace('T', ' ');
    } else if (typeof val === 'string' && val.trim() === '' && DATE_COLUMN_PATTERN.test(key)) {
      // Converte strings vazias em colunas de data para NULL
      formatted[key] = null;
    } else {
      formatted[key] = val;
    }
  }
  return formatted;
}

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'owner_health',
  },
  pool: { min: 0, max: 10 },
});

// Monkey-patch nos métodos insert e update do QueryBuilder do Knex para compatibilidade de data com MySQL
const Builder = Object.getPrototypeOf(Object.getPrototypeOf(db('any_table'))).constructor;

const originalInsert = Builder.prototype.insert;
Builder.prototype.insert = function(data, ...args) {
  const formattedData = processDataForMySQL(data);
  return originalInsert.call(this, formattedData, ...args);
};

const originalUpdate = Builder.prototype.update;
Builder.prototype.update = function(data, ...args) {
  const formattedData = processDataForMySQL(data);
  return originalUpdate.call(this, formattedData, ...args);
};

module.exports = db;
