const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: { host: 'br1104.hostgator.com.br', port: 3306, user: 'conn0686_ownerhealth', password: 'ConnectorTech@2280@', database: 'conn0686_ownerhealth' }
});

(async () => {
  try {
    console.log("=== TODOS OS CLIENTES ===");
    const clientes = await db('clientes').select('id', 'usuario_id', 'nome').limit(10);
    console.log(JSON.stringify(clientes, null, 2));

    console.log("\n=== TODOS OS USUÁRIOS ===");
    const users = await db('usuarios').select('id', 'nome', 'email', 'tipo').limit(10);
    console.log(JSON.stringify(users, null, 2));

    console.log("\n=== TODOS OS MEDICAMENTOS ===");
    const meds = await db('medicamentos').select('id', 'cliente_id', 'nome').orderBy('id', 'desc').limit(15);
    console.log(JSON.stringify(meds, null, 2));
  } catch(e) {
    console.error("ERRO:", e.message);
  } finally {
    process.exit();
  }
})();

// Part 2
const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: { host: 'br1104.hostgator.com.br', port: 3306, user: 'conn0686_ownerhealth', password: 'ConnectorTech@2280@', database: 'conn0686_ownerhealth' }
});
(async () => {
  try {
    console.log("=== COLUNAS DA TABELA usuarios ===");
    const cols = await db.raw("SHOW COLUMNS FROM usuarios");
    console.log(cols[0].map(c => c.Field + ' (' + c.Type + ')'));

    console.log("\n=== MEDICAMENTOS POR CLIENTE_ID ===");
    for (const cId of [1, 2, 3, 4]) {
      const meds = await db('medicamentos').where({ cliente_id: cId }).select('id', 'nome');
      console.log(`  cliente_id=${cId}: ${meds.length} medicamento(s)`, meds.map(m => m.nome));
    }
  } catch(e) { console.error("ERRO:", e.message); } finally { process.exit(); }
})();
