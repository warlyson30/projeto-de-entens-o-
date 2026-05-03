/**
 * CONTROLLER: Autenticação
 * ========================
 * 
 * Responsabilidades:
 * - Registro de novos usuários
 * - Login com geração de JWT tokens
 * - Renovação de access tokens
 * - Retorno de perfil do usuário
 * - Informações do token (debug)
 * - Logout
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const ApiError = require('../utils/ApiError');
const JWTService = require('../services/jwtService');

/**
 * POST /api/auth/registro
 * 
 * Registra um novo usuário no sistema
 * 
 * Body:
 * - nome (string, obrigatório): Nome completo do usuário
 * - email (string, obrigatório): Email único para login
 * - senha (string, obrigatório): Senha com mínimo 6 caracteres
 * 
 * Response (201):
 * {
 *   "mensagem": "Usuário registrado com sucesso",
 *   "usuario": { id, nome, email },
 *   "tokens": { accessToken, refreshToken, ... }
 * }
 */
async function registro(req, res, next) {
  try {
    const { nome, email, senha } = req.body;

    // ─── VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ───
    if (!nome || !email || !senha) {
      throw new ApiError('nome, email e senha são obrigatórios', 400);
    }

    // ─── VALIDAÇÃO DE EMAIL ───
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError('Email inválido. Use o formato: usuario@exemplo.com', 400);
    }

    // ─── VALIDAÇÃO DE SENHA ───
    if (senha.length < 6) {
      throw new ApiError('Senha deve ter pelo menos 6 caracteres', 400);
    }

    if (senha.length > 128) {
      throw new ApiError('Senha não pode ter mais de 128 caracteres', 400);
    }

    // ─── VALIDAÇÃO DE NOME ───
    if (nome.trim().length < 3) {
      throw new ApiError('Nome deve ter pelo menos 3 caracteres', 400);
    }

    if (nome.length > 100) {
      throw new ApiError('Nome não pode ter mais de 100 caracteres', 400);
    }

    // ─── VERIFICAR SE EMAIL JÁ EXISTE ───
    const [usuariosExistentes] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email.toLowerCase()]
    );

    if (usuariosExistentes.length > 0) {
      throw new ApiError('Este email já está cadastrado no sistema', 409);
    }

    // ─── HASH DA SENHA ───
    const senhaHash = await bcrypt.hash(senha, 10);

    // ─── INSERIR USUÁRIO NO BANCO ───
    const [resultado] = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome.trim(), email.toLowerCase(), senhaHash]
    );

    const usuarioId = resultado.insertId;

    // ─── GERAR TOKENS JWT ───
    const tokens = JWTService.gerarParTokens(usuarioId);

    // ─── RESPOSTA DE SUCESSO ───
    return res.status(201).json({
      mensagem: 'Usuário registrado com sucesso',
      usuario: {
        id: usuarioId,
        nome: nome.trim(),
        email: email.toLowerCase(),
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
 * POST /api/auth/login
 * 
 * Autentica um usuário e retorna tokens JWT
 * 
 * Body:
 * - email (string, obrigatório)
 * - senha (string, obrigatório)
 * 
 * Response (200):
 * {
 *   "mensagem": "Login realizado com sucesso",
 *   "usuario": { id, nome, email },
 *   "tokens": { accessToken, refreshToken, ... }
 * }
 * 
 * Error (401): Credenciais inválidas
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    // ─── VALIDAÇÃO ───
    if (!email || !senha) {
      throw new ApiError('email e senha são obrigatórios', 400);
    }

    // ─── BUSCAR USUÁRIO ───
    const [usuarios] = await db.query(
      'SELECT id, nome, email, senha FROM usuarios WHERE email = ?',
      [email.toLowerCase()]
    );

    if (usuarios.length === 0) {
      // Não diz se email não existe por segurança
      throw new ApiError('Credenciais inválidas', 401);
    }

    const usuario = usuarios[0];

    // ─── VALIDAR SENHA ───
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      throw new ApiError('Credenciais inválidas', 401);
    }

    // ─── GERAR TOKENS JWT ───
    const tokens = JWTService.gerarParTokens(usuario.id);

    // ─── RESPOSTA DE SUCESSO ───
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
        expiracaoAccessTokenSegundos: 900,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/renovar
 * 
 * Renova o access token usando um refresh token válido
 * Útil quando o access token expirou
 * 
 * Body:
 * - refreshToken (string, obrigatório)
 * 
 * Response (200):
 * {
 *   "mensagem": "Token renovado com sucesso",
 *   "tokens": { accessToken, refreshToken, ... }
 * }
 * 
 * Error (401): Refresh token inválido ou expirado
 */
async function renovarToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    // ─── VALIDAÇÃO ───
    if (!refreshToken) {
      throw new ApiError('Refresh token é obrigatório', 400);
    }

    // ─── RENOVAR TOKENS ───
    const novosTokens = JWTService.renovarAccessToken(refreshToken);

    // ─── RESPOSTA DE SUCESSO ───
    return res.json({
      mensagem: 'Token renovado com sucesso',
      tokens: {
        accessToken: novosTokens.novoAccessToken,
        refreshToken: novosTokens.novoRefreshToken,
        tipoToken: 'Bearer',
        expiracaoAccessTokenSegundos: 900,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/perfil
 * 
 * Retorna os dados do usuário autenticado
 * Requer: Authorization header com access token válido
 * 
 * Response (200):
 * {
 *   "usuario": {
 *     "id": 1,
 *     "nome": "João Silva",
 *     "email": "joao@email.com",
 *     "criado_em": "2025-06-10T10:30:00.000Z"
 *   }
 * }
 * 
 * Error (401): Token ausente ou inválido
 * Error (404): Usuário não encontrado
 */
async function perfil(req, res, next) {
  try {
    // req.usuarioId vem do middleware de autenticação

    // ─── BUSCAR USUÁRIO ───
    const [usuarios] = await db.query(
      'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    if (usuarios.length === 0) {
      throw new ApiError('Usuário não encontrado', 404);
    }

    // ─── RESPOSTA DE SUCESSO ───
    return res.json({
      usuario: usuarios[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * 
 * Realiza logout do usuário
 * Requer: Authorization header com access token
 * 
 * Nota: O token continua válido até expirar
 * Para revogar imediatamente, implemente blacklist com Redis
 * 
 * Response (200):
 * {
 *   "mensagem": "Logout realizado com sucesso"
 * }
 */
async function logout(req, res, next) {
  try {
    // ─── LOGOUT ───
    // Em produção, adicione o token à blacklist no Redis
    // Por enquanto, apenas confirmamos o logout

    return res.json({
      mensagem: 'Logout realizado com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/info-token
 * 
 * Retorna informações sobre o token JWT atual
 * Útil para debug e monitoramento
 * Requer: Authorization header com access token
 * 
 * Response (200):
 * {
 *   "token": {
 *     "usuarioId": 1,
 *     "tipo": "access",
 *     "expiraEm": "2025-06-10T11:15:00.000Z",
 *     "tempoRestanteMilisegundos": 350000,
 *     "estaValido": true
 *   }
 * }
 */
async function infoToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new ApiError('Token não fornecido', 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer "
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
