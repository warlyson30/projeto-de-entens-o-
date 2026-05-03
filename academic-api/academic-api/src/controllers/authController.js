const bcrypt = require('bcryptjs');
const db = require('../config/database');
const config = require('../config/environment');
const ApiError = require('../utils/ApiError');
const JWTService = require('../services/jwtService');

/**
 * POST /auth/registro
 * Cria novo usuário no sistema
 */
async function registro(req, res, next) {
  try {
    const { nome, email, senha } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      throw new ApiError('nome, email e senha são obrigatórios', 400);
    }

    if (email.length < 5 || !email.includes('@')) {
      throw new ApiError('Email inválido', 400);
    }

    if (senha.length < 6) {
      throw new ApiError('Senha deve ter pelo menos 6 caracteres', 400);
    }

    // Verificar se email já existe
    const [usuarios] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length > 0) {
      throw new ApiError('Email já cadastrado', 409);
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir usuário
    const [resultado] = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    const usuarioId = resultado.insertId;

    // Gerar tokens
    const tokens = JWTService.gerarParTokens(usuarioId);

    return res.status(201).json({
      mensagem: 'Usuário registrado com sucesso',
      usuario: {
        id: usuarioId,
        nome,
        email,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tipoToken: 'Bearer',
        expiracaoAccessTokenSegundos: 900, // 15 minutos
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 * Autentica usuário e retorna tokens
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    // Validações
    if (!email || !senha) {
      throw new ApiError('email e senha são obrigatórios', 400);
    }

    // Buscar usuário
    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length === 0) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    const usuario = usuarios[0];

    // Validar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    // Gerar tokens
    const tokens = JWTService.gerarParTokens(usuario.id);

    return res.json({
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tipoToken: 'Bearer',
        expiracaoAccessTokenSegundos: 900, // 15 minutos
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/renovar
 * Renova o access token usando refresh token
 */
async function renovarToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError('Refresh token é obrigatório', 400);
    }

    // Renovar tokens
    const novosTokens = JWTService.renovarAccessToken(refreshToken);

    return res.json({
      mensagem: 'Token renovado com sucesso',
      tokens: {
        accessToken: novosTokens.novoAccessToken,
        refreshToken: novosTokens.novoRefreshToken,
        tipoToken: 'Bearer',
        expiracaoAccessTokenSegundos: 900, // 15 minutos
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/perfil
 * Retorna dados do usuário autenticado
 * Requer: Authorization header com access token
 */
async function perfil(req, res, next) {
  try {
    const [usuarios] = await db.query(
      'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    if (usuarios.length === 0) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    return res.json({
      usuario: usuarios[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 * Realiza logout do usuário
 * Nota: O token continua válido até expirar
 * Para implementar blacklist, use Redis/Cache
 */
async function logout(req, res, next) {
  try {
    // Nota: Implementação básica
    // Em produção, adicione refresh token à blacklist no Redis
    
    return res.json({
      mensagem: 'Logout realizado com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/info-token
 * Retorna informações sobre o token atual
 * Requer: Authorization header com access token
 */
async function infoToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new ApiError('Token não fornecido', 401);
    }

    const token = authHeader.slice(7);
    const info = JWTService.obterInfoToken(token);

    return res.json({
      token: info,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registro,
  login,
  renovarToken,
  perfil,
  logout,
  infoToken,
};
