const JWTService = require('../services/jwtService');
const ApiError = require('../utils/ApiError');

/**
 * Middleware de autenticação JWT
 * ===============================
 * 
 * Valida o access token no header Authorization
 * Formato: Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new ApiError('Token não fornecido no header Authorization', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError('Formato do token inválido. Use: Bearer <token>', 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    // Validar token
    const payload = JWTService.validarToken(token, 'access');

    // Armazenar ID do usuário no request
    req.usuarioId = payload.id;
    req.usuario = payload;

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }

    // Erros do JWT
    if (err.message.includes('expirado')) {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    if (err.message.includes('inválido')) {
      return res.status(401).json({ erro: 'Token inválido.' });
    }

    return res.status(401).json({ erro: err.message });
  }
}

/**
 * Middleware para validar refresh token
 * Usado apenas na rota de renovação
 */
function validarRefreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError('Refresh token não fornecido', 400);
    }

    // Validar token
    const payload = JWTService.validarToken(refreshToken, 'refresh');

    // Armazenar informações no request
    req.usuarioId = payload.id;
    req.usuario = payload;

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ erro: err.message });
    }

    if (err.message.includes('expirado')) {
      return res.status(401).json({ erro: 'Refresh token expirado. Faça login novamente.' });
    }
    if (err.message.includes('inválido')) {
      return res.status(401).json({ erro: 'Refresh token inválido.' });
    }

    return res.status(401).json({ erro: err.message });
  }
}

module.exports = { authMiddleware, validarRefreshToken };
