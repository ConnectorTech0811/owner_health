// Helper de banco de dados resiliente com fallback em memória (Português)
const db = require('../../knexfile');

// Armazenamento em memória caso o banco falhe ou não esteja criado
const memoryDb = {
  usuarios: [
    { id: 999, email: 'admin@teste.com', senha: '', eh_admin: true, eh_cliente: false, eh_empresa: false, eh_profissional: false, eh_dependente: false },
    { id: 998, email: 'cliente@ownerhealth.com.br', senha: '', eh_admin: false, eh_cliente: true, eh_empresa: false, eh_profissional: false, eh_dependente: false },
    { id: 997, email: 'empresa@ownerhealth.com.br', senha: '', eh_admin: false, eh_cliente: false, eh_empresa: true, eh_profissional: false, eh_dependente: false },
    { id: 996, email: 'medico@ownerhealth.com.br', senha: '', eh_admin: false, eh_cliente: false, eh_empresa: false, eh_profissional: true, eh_dependente: false },
    { id: 995, email: 'multi@ownerhealth.com.br', senha: '', eh_admin: true, eh_cliente: true, eh_empresa: true, eh_profissional: true, eh_dependente: false }
  ],
  clientes: [
    {
      id: 1,
      usuario_id: 998,
      nome: 'Carlos Silva',
      cpf: '123.456.789-00',
      data_nascimento: '1990-05-15',
      endereco: 'Rua das Flores, 123, São Paulo - SP',
      email: 'cliente@ownerhealth.com.br',
      celular: '(11) 98765-4321',
      plano_empresa: 'Unimed',
      plano_nome: 'Nacional Flex',
      plano_produto: 'Apartamento',
      plano_numero_carteirinha: '1234567890120',
      plano_tipo: 'free',
      plano_plataforma: 'free',
      status: 'ativo',
      pagamento_status: 'pago',
      lgpd_aceito: true,
      lgpd_aceito_em: new Date().toISOString()
    }
  ],
  dependentes: [
    {
      id: 1,
      cliente_id: 1,
      nome: 'Lucas Silva (Dependente)',
      cpf: '987.654.321-99',
      data_nascimento: '2015-08-20',
      endereco: 'Rua das Flores, 123, São Paulo - SP',
      email: '',
      celular: '',
      plano_empresa: 'Unimed',
      plano_nome: 'Nacional Flex',
      plano_produto: 'Apartamento',
      plano_numero_carteirinha: '1234567890121'
    }
  ],
  empresas: [
    {
      id: 1,
      usuario_id: 997,
      razao_social: 'Clínica Saúde Total Ltda',
      nome_fantasia: 'Clínica Saúde Total',
      cnpj: '12.345.678/0001-99',
      nome_responsavel: 'Dr. Arthur Mendes',
      cpf_responsavel: '234.567.890-11',
      cargo_responsavel: 'Diretor Médico',
      email: 'empresa@ownerhealth.com.br',
      celular: '(11) 4567-8901',
      plano_tipo: 'enterprise',
      pago: true
    }
  ],
  profissionais: [
    {
      id: 1,
      usuario_id: 996,
      nome: 'Dr. Roberto Santos',
      cpf: '345.678.901-22',
      data_nascimento: '1980-10-10',
      endereco: 'Av. Paulista, 1000, Cj 52, São Paulo - SP',
      numero_conselho: 'CRM-SP 123456',
      email: 'medico@ownerhealth.com.br',
      celular: '(11) 99999-8888'
    }
  ],
  usuarios_sistema: [],
  planos_saude: [
    { id: 1, operadora: 'Unimed', plano: 'Nacional Flex', produto: 'Apartamento' },
    { id: 2, operadora: 'Bradesco Saúde', plano: 'Top Nacional', produto: 'Enfermaria' },
    { id: 3, operadora: 'Amil', plano: 'Amil 400', produto: 'Coparticipativo' }
  ],
  empresa_planos_saude: [
    { id: 1, empresa_id: 1, plano_saude_id: 1, procedimentos: 'Consulta Clínica, Hemograma, Raio X' },
    { id: 2, empresa_id: 1, plano_saude_id: 2, procedimentos: 'Consulta Geral, Exames Cardiológicos' }
  ],
  profissional_planos_saude: [
    { id: 1, profissional_id: 1, plano_saude_id: 1, procedimentos: 'Consulta Cardiológica, Eletrocardiograma' }
  ],
  profissional_empresas: [
    { profissional_id: 1, empresa_id: 1 }
  ],
  aceites_lgpd: [],
  empresa_agendas: [],
  empresa_anamnese_config: [],
  empresa_documentos_emitidos: [],
  medicamentos: [],
  registro_medicamentos: [],
  exames: [],
  bioimpedancia: [],
  anamnese: [],
  satisfacao: [],
  prescricoes: [],
  efeitos_medicamentos: []
};

// Funções utilitárias
async function query(table, action, ...args) {
  try {
    // Tenta banco real
    if (action === 'select') {
      const filter = args[0];
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        return await db(table).where(filter).select();
      }
      return await db(table).select(...args);
    }
    if (action === 'insert') {
      return await db(table).insert(...args);
    }
    if (action === 'update') {
      const [filter, data] = args;
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        return await db(table).where(filter).update(data);
      }
      return await db(table).where({ id: filter }).update(data);
    }
    if (action === 'delete') {
      const [filter] = args;
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        return await db(table).where(filter).delete();
      }
      return await db(table).where({ id: filter }).delete();
    }
  } catch (error) {
    // Fallback em memória
    console.log(`[MemoryDB Fallback] Ação '${action}' na tabela '${table}':`, error.message);
    
    // Inicializa a tabela em memória se não existir
    if (!memoryDb[table]) {
      memoryDb[table] = [];
    }

    if (action === 'select') {
      let results = [...memoryDb[table]];
      const filter = args[0];
      if (filter && typeof filter === 'object') {
        results = results.filter(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        });
      }
      return results;
    }
    
    if (action === 'insert') {
      const data = args[0];
      const newId = memoryDb[table].length > 0 
        ? Math.max(...memoryDb[table].map(item => item.id || 0)) + 1 
        : 1;
      const newItem = { id: newId, ...data };
      memoryDb[table].push(newItem);
      return [newId];
    }
    
    if (action === 'update') {
      const filter = args[0];
      const data = args[1];
      let updatedCount = 0;
      
      memoryDb[table] = memoryDb[table].map(item => {
        let match = true;
        if (filter && typeof filter === 'object') {
          match = Object.entries(filter).every(([key, val]) => item[key] === val);
        }
        if (match) {
          updatedCount++;
          return { ...item, ...data };
        }
        return item;
      });
      return updatedCount;
    }
    
    if (action === 'delete') {
      const filter = args[0];
      const originalLength = memoryDb[table].length;
      if (filter && typeof filter === 'object') {
        memoryDb[table] = memoryDb[table].filter(item => {
          return !Object.entries(filter).every(([key, val]) => item[key] === val);
        });
      }
      return originalLength - memoryDb[table].length;
    }
  }
}

module.exports = {
  query,
  memoryDb
};
