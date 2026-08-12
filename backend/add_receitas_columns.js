require('dotenv').config();
const db = require('./knexfile');

async function run() {
  try {
    const table = 'receitas';
    const columnsToAdd = [
      { name: 'paciente_cpf', type: 'string', length: 14 },
      { name: 'paciente_nome', type: 'string', length: 255 },
      { name: 'profissional_id', type: 'integer' },
      { name: 'medico_nome', type: 'string', length: 255 },
      { name: 'medico_crm', type: 'string', length: 50 },
      { name: 'tipo', type: 'string', length: 50 },
      { name: 'vias', type: 'integer' },
      { name: 'cid10_codigo', type: 'string', length: 20 },
      { name: 'cid10_descricao', type: 'string', length: 255 },
      { name: 'dias_atestado', type: 'string', length: 20 },
      { name: 'justificativa_exames', type: 'text' },
      { name: 'hash_sha256', type: 'string', length: 64 },
      { name: 'signature_metadata', type: 'text' },
      { name: 'assinado_digitalmente', type: 'tinyint' },
      { name: 'data', type: 'date' }
    ];

    for (const col of columnsToAdd) {
      const hasCol = await db.schema.hasColumn(table, col.name);
      if (!hasCol) {
        await db.schema.alterTable(table, t => {
          if (col.type === 'string') {
            t.string(col.name, col.length).nullable();
          } else if (col.type === 'integer') {
            t.integer(col.name).unsigned().nullable();
          } else if (col.type === 'text') {
            t.text(col.name).nullable();
          } else if (col.type === 'tinyint') {
            t.tinyint(col.name).defaultTo(0);
          } else if (col.type === 'date') {
            t.date(col.name).nullable();
          }
        });
        console.log(`✅ Coluna '${col.name}' adicionada na tabela '${table}'.`);
      } else {
        console.log(`Coluna '${col.name}' já existe na tabela '${table}'.`);
      }
    }
  } catch (error) {
    console.error('Erro ao alterar tabela receitas:', error);
  } finally {
    process.exit(0);
  }
}
run();
