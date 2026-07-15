// Helper de banco de dados resiliente com fallback em memória (Português)
const db = require('../../knexfile');
const { getContext } = require('../middleware/context');

async function logAudit(action_type, table_name, old_values, new_values, record_id = null) {
  try {
    if (table_name === 'audit_logs') return; // Evita loop infinito
    const store = getContext();
    const user = store ? store.get('user') : null;
    
    // Ignorar logs em tabelas temporárias ou que geram muito ruído, se necessário
    const auditData = {
      user_id: user ? user.id : null,
      user_email: user ? (user.email || 'system') : 'system',
      action_type,
      table_name,
      record_id: record_id ? String(record_id) : null,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: new_values ? JSON.stringify(new_values) : null,
    };
    
    await db('audit_logs').insert(auditData);
  } catch (err) {
    console.error('[Audit Log Error]:', err.message);
  }
}

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
  // Anamnese dinâmica
  anamnesis_sections: [
    { id: 1, empresa_id: 1, titulo: 'Identificação e Motivo da Consulta', descricao: 'Informações básicas sobre o paciente e o motivo da visita.', ordem: 0, ativo: 1, criado_em: new Date().toISOString() },
    { id: 2, empresa_id: 1, titulo: 'Histórico de Saúde', descricao: 'Doenças, cirurgias e condições pré-existentes.', ordem: 1, ativo: 1, criado_em: new Date().toISOString() },
    { id: 3, empresa_id: 1, titulo: 'Medicamentos e Alergias', descricao: 'Medicamentos em uso contínuo e reações alérgicas.', ordem: 2, ativo: 1, criado_em: new Date().toISOString() },
    { id: 4, empresa_id: 1, titulo: 'Hábitos e Estilo de Vida', descricao: 'Atividade física, alimentação e outros hábitos.', ordem: 3, ativo: 1, criado_em: new Date().toISOString() }
  ],
  anamnesis_questions: [
    // Seção 1
    { id: 1, section_id: 1, texto: 'Qual é o principal motivo da sua consulta hoje?', tipo: 'textarea', obrigatoria: 1, ordem: 0, placeholder: 'Descreva detalhadamente seu sintoma ou queixa...', descricao: '', ativo: 1 },
    { id: 2, section_id: 1, texto: 'Há quanto tempo você apresenta este sintoma?', tipo: 'radio', obrigatoria: 1, ordem: 1, placeholder: '', descricao: '', ativo: 1 },
    { id: 3, section_id: 1, texto: 'Como você classifica a intensidade do seu desconforto?', tipo: 'scale', obrigatoria: 0, ordem: 2, placeholder: '', descricao: '', escala_min: 1, escala_max: 10, escala_label_min: 'Sem dor', escala_label_max: 'Dor insuportável', ativo: 1 },
    // Seção 2
    { id: 4, section_id: 2, texto: 'Você possui alguma doença crônica diagnosticada?', tipo: 'checkbox', obrigatoria: 0, ordem: 0, placeholder: '', descricao: 'Marque todas que se aplicam', ativo: 1 },
    { id: 5, section_id: 2, texto: 'Já realizou alguma cirurgia?', tipo: 'radio', obrigatoria: 1, ordem: 1, placeholder: '', descricao: '', ativo: 1 },
    { id: 6, section_id: 2, texto: 'Se sim, descreva as cirurgias e datas aproximadas:', tipo: 'textarea', obrigatoria: 0, ordem: 2, placeholder: 'Ex: Apendicectomia em 2015...', descricao: '', ativo: 1 },
    // Seção 3
    { id: 7, section_id: 3, texto: 'Você utiliza algum medicamento de uso contínuo?', tipo: 'radio', obrigatoria: 1, ordem: 0, placeholder: '', descricao: '', ativo: 1 },
    { id: 8, section_id: 3, texto: 'Liste os medicamentos que você utiliza atualmente:', tipo: 'textarea', obrigatoria: 0, ordem: 1, placeholder: 'Ex: Losartana 50mg, 1 comprimido/dia...', descricao: '', ativo: 1 },
    { id: 9, section_id: 3, texto: 'Você tem alergia a algum medicamento ou substância?', tipo: 'text', obrigatoria: 0, ordem: 2, placeholder: 'Ex: Dipirona, Penicilina, Látex...', descricao: '', ativo: 1 },
    // Seção 4
    { id: 10, section_id: 4, texto: 'Com que frequência você pratica atividade física?', tipo: 'select', obrigatoria: 0, ordem: 0, placeholder: '', descricao: '', ativo: 1 },
    { id: 11, section_id: 4, texto: 'Qual é o seu hábito em relação ao tabagismo?', tipo: 'radio', obrigatoria: 0, ordem: 1, placeholder: '', descricao: '', ativo: 1 },
    { id: 12, section_id: 4, texto: 'Você consome bebidas alcoólicas?', tipo: 'radio', obrigatoria: 0, ordem: 2, placeholder: '', descricao: '', ativo: 1 }
  ],
  anamnesis_options: [
    // Q2 - Tempo do sintoma
    { id: 1, question_id: 2, texto: 'Menos de 1 semana', ordem: 0, ativo: 1 },
    { id: 2, question_id: 2, texto: 'Entre 1 e 4 semanas', ordem: 1, ativo: 1 },
    { id: 3, question_id: 2, texto: 'Entre 1 e 6 meses', ordem: 2, ativo: 1 },
    { id: 4, question_id: 2, texto: 'Mais de 6 meses', ordem: 3, ativo: 1 },
    // Q4 - Doenças crônicas
    { id: 5, question_id: 4, texto: 'Diabetes', ordem: 0, ativo: 1 },
    { id: 6, question_id: 4, texto: 'Hipertensão arterial', ordem: 1, ativo: 1 },
    { id: 7, question_id: 4, texto: 'Doenças cardíacas', ordem: 2, ativo: 1 },
    { id: 8, question_id: 4, texto: 'Doenças respiratórias', ordem: 3, ativo: 1 },
    { id: 9, question_id: 4, texto: 'Problemas renais', ordem: 4, ativo: 1 },
    { id: 10, question_id: 4, texto: 'Nenhuma', ordem: 5, ativo: 1 },
    // Q5 - Cirurgia
    { id: 11, question_id: 5, texto: 'Sim', ordem: 0, ativo: 1 },
    { id: 12, question_id: 5, texto: 'Não', ordem: 1, ativo: 1 },
    // Q7 - Medicamentos
    { id: 13, question_id: 7, texto: 'Sim', ordem: 0, ativo: 1 },
    { id: 14, question_id: 7, texto: 'Não', ordem: 1, ativo: 1 },
    // Q10 - Atividade física
    { id: 15, question_id: 10, texto: 'Sedentário (não pratico)', ordem: 0, ativo: 1 },
    { id: 16, question_id: 10, texto: '1 a 2 vezes por semana', ordem: 1, ativo: 1 },
    { id: 17, question_id: 10, texto: '3 a 4 vezes por semana', ordem: 2, ativo: 1 },
    { id: 18, question_id: 10, texto: '5 ou mais vezes por semana', ordem: 3, ativo: 1 },
    // Q11 - Tabagismo
    { id: 19, question_id: 11, texto: 'Nunca fumei', ordem: 0, ativo: 1 },
    { id: 20, question_id: 11, texto: 'Ex-fumante', ordem: 1, ativo: 1 },
    { id: 21, question_id: 11, texto: 'Fumante ocasional', ordem: 2, ativo: 1 },
    { id: 22, question_id: 11, texto: 'Fumante diário', ordem: 3, ativo: 1 },
    // Q12 - Álcool
    { id: 23, question_id: 12, texto: 'Não consumo', ordem: 0, ativo: 1 },
    { id: 24, question_id: 12, texto: 'Raramente (festas e eventos)', ordem: 1, ativo: 1 },
    { id: 25, question_id: 12, texto: 'Moderadamente (fins de semana)', ordem: 2, ativo: 1 },
    { id: 26, question_id: 12, texto: 'Frequentemente (4+ vezes/semana)', ordem: 3, ativo: 1 }
  ],
  anamnesis_responses: [],
  anamnesis_response_items: [],
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
      const result = await db(table).insert(...args);
      const insertedId = Array.isArray(result) ? result[0] : result;
      // Dispara auditoria assíncrona
      logAudit('INSERT', table, null, args[0], insertedId).catch(() => {});
      return result;
    }
    
    if (action === 'update') {
      const [filter, data] = args;
      let whereClause = filter;
      if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
        whereClause = { id: filter };
      }
      
      // Captura estado anterior
      const oldRecords = await db(table).where(whereClause).select();
      const result = await db(table).where(whereClause).update(data);
      
      // Dispara auditoria
      for (const old of oldRecords) {
        logAudit('UPDATE', table, old, { ...old, ...data }, old.id).catch(() => {});
      }
      return result;
    }
    
    if (action === 'delete') {
      const [filter] = args;
      let whereClause = filter;
      if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
        whereClause = { id: filter };
      }
      
      // Captura estado anterior
      const oldRecords = await db(table).where(whereClause).select();
      const result = await db(table).where(whereClause).delete();
      
      // Dispara auditoria
      for (const old of oldRecords) {
        logAudit('DELETE', table, old, null, old.id).catch(() => {});
      }
      return result;
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
