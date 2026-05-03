const jwt = require('jsonwebtoken');
const config = require('../config/environment');

/**
 * Serviço JWT Centralizado
 * ========================
 * 
 * Gerencia:
 * - Geração de access tokens (curta duração)
 * - Geração de refresh tokens (longa duração)
 * - Validação de tokens
 * - Renovação de tokens
 */

class JWTService {
  /**
   * Gera um access token (curta duração: 15 minutos)
   * @param {number} usuarioId - ID do usuário
   * @returns {string} Token JWT
   */
  static gerarAccessToken(usuarioId) {
    try {
      const payload = {
        id: usuarioId,
        tipo: 'access',
      };

      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: '15m',
        algorithm: 'HS256',
        issuer: 'academic-api',
        audience: 'academic-app',
      });

      return token;
    } catch (err) {
      console.error('Erro ao gerar access token:', err.message);
      throw new Error('Falha ao gerar token de acesso');
    }
  }

  /**
   * Gera um refresh token (longa duração: 7 dias)
   * @param {number} usuarioId - ID do usuário
   * @returns {string} Token JWT
   */
  static gerarRefreshToken(usuarioId) {
    try {
      const payload = {
        id: usuarioId,
        tipo: 'refresh',
      };

      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: '7d',
        algorithm: 'HS256',
        issuer: 'academic-api',
        audience: 'academic-app',
      });

      return token;
    } catch (err) {
      console.error('Erro ao gerar refresh token:', err.message);
      throw new Error('Falha ao gerar token de renovação');
    }
  }

  /**
   * Valida um token JWT
   * @param {string} token - Token a validar
   * @param {string} tipoEsperado - Tipo esperado ('access' ou 'refresh')
   * @returns {Object} Payload do token
   * @throws {Error} Se token inválido ou expirado
   */
  static validarToken(token, tipoEsperado = 'access') {
    try {
      // Remover "Bearer " se existir
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const payload = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256'],
        issuer: 'academic-api',
        audience: 'academic-app',
      });

      // Validar tipo de token
      if (tipoEsperado && payload.tipo !== tipoEsperado) {
        throw new Error(`Tipo de token inválido. Esperado: ${tipoEsperado}, Recebido: ${payload.tipo}`);
      }

      return payload;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      }
      throw err;
    }
  }

  /**
   * Decodifica um token sem validar assinatura (apenas para leitura)
   * ⚠️ APENAS para usar internamente, nunca confie em dados decodificados
   * @param {string} token - Token a decodificar
   * @returns {Object} Payload do token
   */
  static decodificarToken(token) {
    try {
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      return jwt.decode(token);
    } catch (err) {
      return null;
    }
  }

  /**
   * Gera um par de tokens (access + refresh)
   * @param {number} usuarioId - ID do usuário
   * @returns {Object} { accessToken, refreshToken }
   */
  static gerarParTokens(usuarioId) {
    return {
      accessToken: this.gerarAccessToken(usuarioId),
      refreshToken: this.gerarRefreshToken(usuarioId),
    };
  }

  /**
   * Renova o access token usando refresh token
   * @param {string} refreshToken - Token de renovação
   * @returns {Object} { novoAccessToken, novoRefreshToken }
   * @throws {Error} Se refresh token inválido
   */
  static renovarAccessToken(refreshToken) {
    try {
      // Validar refresh token
      const payload = this.validarToken(refreshToken, 'refresh');

      // Gerar novos tokens
      return {
        novoAccessToken: this.gerarAccessToken(payload.id),
        novoRefreshToken: this.gerarRefreshToken(payload.id),
      };
    } catch (err) {
      throw new Error(`Não foi possível renovar o token: ${err.message}`);
    }
  }

  /**
   * Retorna informações sobre o token (expiração, etc)
   * @param {string} token - Token a analisar
   * @returns {Object} { usuarioId, tipo, expiraEm, estaValido }
   */
  static obterInfoToken(token) {
    const payload = this.decodificarToken(token);
    
    if (!payload) {
      return {
        estaValido: false,
        mensagem: 'Token inválido ou não pode ser decodificado',
      };
    }

    const agora = Math.floor(Date.now() / 1000);
    const expiraEm = new Date(payload.exp * 1000);
    const estaValido = agora < payload.exp;

    return {
      usuarioId: payload.id,
      tipo: payload.tipo,
      expiraEm,
      tempoRestanteMilisegundos: (payload.exp * 1000) - Date.now(),
      estaValido,
    };
  }
}

module.exports = JWTService;
