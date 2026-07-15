const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../knexfile');
const dbHelper = require('../utils/dbHelper');

// Mock para facilitar o desenvolvimento enquanto o banco de dados não estiver criado/configurado (Português)
const mockUsers = [
  {
    id: 999,
    email: 'admin@teste.com',
    nome: 'Admin Master',
    passwordHash: '$2a$10$E16w7H8oW77F/e.pGpxX6uxGqG4s8f9LzB8N3c9K9Dk9d9D9d9D9d', // hash de '123456'
    eh_admin: true,
    eh_cliente: false,
    eh_empresa: false,
    eh_profissional: false,
    eh_dependente: false
  },
  {
    id: 998,
    email: 'cliente@ownerhealth.com.br',
    nome: 'Carlos Silva',
    passwordHash: '$2a$10$E16w7H8oW77F/e.pGpxX6uxGqG4s8f9LzB8N3c9K9Dk9d9D9d9D9d',
    eh_admin: false,
    eh_cliente: true,
    eh_empresa: false,
    eh_profissional: false,
    eh_dependente: false
  },
  {
    id: 997,
    email: 'empresa@ownerhealth.com.br',
    nome: 'Clínica Saúde Total',
    passwordHash: '$2a$10$E16w7H8oW77F/e.pGpxX6uxGqG4s8f9LzB8N3c9K9Dk9d9D9d9D9d',
    eh_admin: false,
    eh_cliente: false,
    eh_empresa: true,
    eh_profissional: false,
    eh_dependente: false
  },
  {
    id: 996,
    email: 'medico@ownerhealth.com.br',
    nome: 'Dr. Roberto Santos',
    passwordHash: '$2a$10$E16w7H8oW77F/e.pGpxX6uxGqG4s8f9LzB8N3c9K9Dk9d9D9d9D9d',
    eh_admin: false,
    eh_cliente: false,
    eh_empresa: false,
    eh_profissional: true,
    eh_dependente: false
  },
  {
    id: 995,
    email: 'multi@ownerhealth.com.br',
    nome: 'Dr. Arthur Mendes (Multi)',
    passwordHash: '$2a$10$E16w7H8oW77F/e.pGpxX6uxGqG4s8f9LzB8N3c9K9Dk9d9D9d9D9d',
    eh_admin: true,
    eh_cliente: true,
    eh_empresa: true,
    eh_profissional: true,
    eh_dependente: false
  }
];

const authenticate = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    let user = null;
    let passwordMatch = false;

    // Tentar ler do banco de dados (tabela usuarios, coluna senha)
    try {
      user = await db('usuarios').where({ email }).first();
      if (user) {
        passwordMatch = await bcrypt.compare(password, user.senha);
      }
    } catch (dbError) {
      console.warn('⚠️ Conexão com banco de dados falhou, utilizando Mock de dados temporário.');
    }

    // Se falhar no banco, checa no Mock para fins de demonstração
    if (!user) {
      const mockUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUser) {
        user = mockUser;
        // Senha mockada padrão é '123456'
        passwordMatch = password === '123456' || await bcrypt.compare(password, mockUser.passwordHash);
      }
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Você ainda não está cadastrado no sistema da Owner. Redirecionando para o cadastro...',
        code: 'USER_NOT_FOUND' 
      });
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Coleta todas as roles ativas para esse usuário
    const roles = [];
    if (user.eh_admin) roles.push('admin');
    if (user.eh_cliente) roles.push('client');
    if (user.eh_empresa) roles.push('company');
    if (user.eh_profissional) roles.push('professional');
    if (user.eh_dependente) roles.push('dependent');

    if (roles.length === 0) {
      return res.status(403).json({ error: 'Nenhum perfil ativo associado a este usuário' });
    }

    // Se for cliente ou dependente, precisamos validar o status e pagamento do cliente titular
    let titularClient = null;
    let profiles = [];

    if (roles.includes('client')) {
      const clients = await dbHelper.query('clientes', 'select', { usuario_id: user.id });
      if (clients.length > 0) {
        titularClient = clients[0];
      }
    } else if (roles.includes('dependent')) {
      const dependents = await dbHelper.query('dependentes', 'select', { usuario_id: user.id });
      if (dependents.length > 0) {
        const dependent = dependents[0];
        const clients = await dbHelper.query('clientes', 'select', { id: dependent.cliente_id });
        if (clients.length > 0) {
          titularClient = clients[0];
        }
      }
    }

    if (titularClient) {
      if (titularClient.status && titularClient.status !== 'ativo') {
        return res.status(403).json({ error: 'Assinatura inativa. Entre em contato com a administração.' });
      }
      if (titularClient.pagamento_status && titularClient.pagamento_status !== 'pago') {
        return res.status(403).json({ error: 'Pendência financeira detectada. Regularize o pagamento para acessar.' });
      }

      // Buscar todos os perfis da assinatura
      profiles.push({
        id: titularClient.id,
        nome: titularClient.nome,
        role: 'client',
        avatar_color: '#3b82f6'
      });

      const dependents = await dbHelper.query('dependentes', 'select', { cliente_id: titularClient.id });
      dependents.forEach(dep => {
        profiles.push({
          id: dep.id,
          nome: dep.nome,
          role: 'dependent',
          avatar_color: '#0d9488'
        });
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        roles, 
        name: user.nome || user.email 
      },
      process.env.JWT_SECRET || 'owner_health_secret',
      { expiresIn: '8h' }
    );

    // Buscar tipo_profissional e empresa_id se for profissional
    let tipo_profissional = null;
    let profissional_id = null;
    let empresa_id = null;
    if (roles.includes('professional')) {
      try {
        const profs = await dbHelper.query('profissionais', 'select', { email: user.email });
        if (profs.length > 0) {
          tipo_profissional = profs[0].tipo_profissional || 'medico';
          profissional_id = profs[0].id;
          // Busca a empresa vinculada ao profissional
          try {
            const vinculo = await dbHelper.query('profissional_empresas', 'select', { profissional_id: profs[0].id });
            if (vinculo.length > 0) empresa_id = vinculo[0].empresa_id;
          } catch {}
        }
      } catch (e) {
        tipo_profissional = 'medico';
      }
    }

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.nome || user.email,
        email: user.email,
        roles,
        profiles,
        tipo_profissional,
        profissional_id,
        empresa_id
      },
    });
  } catch (err) {
    console.error('Erro na autenticação:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

const nodemailer = require('nodemailer');

const forgotPassword = async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  try {
    let user = null;
    let dbUsed = false;

    // 1. Procurar usuário no banco
    try {
      user = await db('usuarios').where({ email }).first();
      if (user) dbUsed = true;
    } catch (err) {
      console.warn('⚠️ Erro ao buscar usuário no banco, usando Mock.');
    }

    // 2. Se não encontrar no banco, procurar no mock
    if (!user) {
      user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ error: 'E-mail não cadastrado.' });
    }

    // 3. Buscar nome do usuário para personalizar o email
    let nomeUsuario = user.nome || 'Usuário';

    if (dbUsed) {
      try {
        const sysUser = await dbHelper.query('usuarios_sistema', 'select', { usuario_id: user.id });
        if (sysUser.length > 0) {
          nomeUsuario = sysUser[0].nome;
        } else {
          const client = await dbHelper.query('clientes', 'select', { usuario_id: user.id });
          if (client.length > 0) {
            nomeUsuario = client[0].nome;
          } else {
            const company = await dbHelper.query('empresas', 'select', { usuario_id: user.id });
            if (company.length > 0) {
              nomeUsuario = company[0].nome_fantasia || company[0].razao_social;
            } else {
              const prof = await dbHelper.query('profissionais', 'select', { usuario_id: user.id });
              if (prof.length > 0) {
                nomeUsuario = prof[0].nome;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar nome detalhado do usuário:', err.message);
      }
    }

    // 4. Gerar Token de recuperação (expira em 1 hora)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'owner_health_secret',
      { expiresIn: '1h' }
    );

    // 5. Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true para port 465, false para outras portas como 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    const mailOptions = {
      from: `Owner Health <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Recuperação de Senha - Owner Health',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">Owner Health</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">Olá <strong>${nomeUsuario}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">Recebemos uma solicitação de recuperação de senha para a sua conta no Owner Health.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">Clique no botão abaixo para cadastrar uma nova senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Cadastrar Nova Senha</a>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Se o botão não funcionar, você também pode copiar e colar o link abaixo no seu navegador:</p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all; line-height: 1.5;">${resetLink}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">Se você não solicitou essa alteração, desconsidere este e-mail.</p>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">Atenciosamente,<br>Equipe Owner Health</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ E-mail de recuperação enviado com sucesso para: ${user.email}`);

    return res.json({ message: 'E-mail de recuperação enviado com sucesso!' });
  } catch (err) {
    console.error('Erro no envio de e-mail de recuperação:', err);
    return res.status(500).json({ error: 'Erro ao enviar e-mail de recuperação. Tente novamente mais tarde.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, senha, confirmarSenha } = req.body || {};

  if (!token || !senha || !confirmarSenha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  if (senha !== confirmarSenha) {
    return res.status(400).json({ error: 'As senhas não coincidem' });
  }

  try {
    // 1. Verificar Token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'owner_health_secret');
    } catch (err) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const { userId, email } = decoded;

    let user = null;
    let dbUsed = false;

    // 2. Procurar usuário
    try {
      user = await db('usuarios').where({ id: userId }).first();
      if (user) dbUsed = true;
    } catch (err) {
      console.warn('⚠️ Erro ao buscar usuário no banco, usando Mock.');
    }

    if (!user) {
      // Tentar mock
      user = mockUsers.find(u => u.id === userId || u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // 3. Validar se a senha não é igual à anterior
    let isSamePassword = false;
    if (dbUsed && user.senha) {
      isSamePassword = await bcrypt.compare(senha, user.senha);
    } else if (user.passwordHash) {
      isSamePassword = await bcrypt.compare(senha, user.passwordHash);
    } else {
      // Mock sem senha cadastrada
      isSamePassword = senha === '123456';
    }

    if (isSamePassword) {
      return res.status(400).json({ error: 'A nova senha não pode ser igual à senha anterior.' });
    }

    // 4. Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(senha, salt);

    // 5. Salvar nova senha
    if (dbUsed) {
      await db('usuarios').where({ id: user.id }).update({ senha: passwordHash });
    } else {
      // Atualizar no mock
      const mockIndex = mockUsers.findIndex(u => u.id === user.id);
      if (mockIndex !== -1) {
        mockUsers[mockIndex].passwordHash = passwordHash;
      }
      // Também na tabela do helper
      const memIndex = dbHelper.memoryDb.usuarios.findIndex(u => u.id === user.id);
      if (memIndex !== -1) {
        dbHelper.memoryDb.usuarios[memIndex].senha = passwordHash;
      }
    }

    return res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(500).json({ error: 'Erro interno ao redefinir a senha.' });
  }
};

module.exports = { authenticate, forgotPassword, resetPassword };

