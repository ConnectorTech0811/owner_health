require('dotenv').config();
const db = require('./knexfile');

async function run() {
  try {
    const hasColumn = await db.schema.hasColumn('profissionais', 'especialidade');
    if (!hasColumn) {
      await db.schema.alterTable('profissionais', table => {
        table.string('especialidade', 100).nullable();
      });
      console.log('✅ Coluna especialidade adicionada na tabela profissionais.');
    } else {
      console.log('Coluna especialidade já existe na tabela profissionais.');
    }
  } catch (error) {
    console.error('Erro ao adicionar coluna especialidade:', error);
  } finally {
    process.exit(0);
  }
}
run();
