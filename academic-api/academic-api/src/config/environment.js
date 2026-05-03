// src/config/environment.js
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
  development: {
    port: process.env.PORT || 3000,
    nodeEnv: 'development',
    database: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'academic_db',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'chave_super_secreta_dev',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
      origin: '*', // Tudo pode acessar em dev
    },
    logs: {
      level: 'debug', // Detalhado
    },
  },

  production: {
    port: process.env.PORT || 3000,
    nodeEnv: 'production',
    database: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
      // Em produção, apenas domínios específicos
      origin: [
        'https://seuapp.com',
        'https://www.seuapp.com',
      ],
    },
    logs: {
      level: 'error', // Apenas erros
    },
  },
};

// Validar se as variáveis obrigatórias existem em produção
if (NODE_ENV === 'production') {
  const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const faltam = obrigatorias.filter(v => !process.env[v]);
  
  if (faltam.length > 0) {
    console.error(`❌ Variáveis obrigatórias em produção faltam: ${faltam.join(', ')}`);
    process.exit(1);
  }
}

module.exports = config[NODE_ENV];
