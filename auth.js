require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'substua_por_uma_chave_secreta_forte';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

const refreshTokens = new Set();

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken(user) {
  const refreshToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  refreshTokens.add(refreshToken);
  return refreshToken;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso ausente.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }

    req.user = payload;
    next();
  });
}

function revokeRefreshToken(refreshToken) {
  refreshTokens.delete(refreshToken);
}

function isRefreshTokenValid(refreshToken) {
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return false;
  }

  try {
    jwt.verify(refreshToken, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
};
