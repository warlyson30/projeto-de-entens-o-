require('dotenv').config();
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool   = require('./db');

const JWT_SECRET          = process.env.JWT_SECRET || 'substitua_por_uma_chave_secreta_forte';
const ACCESS_TOKEN_EXPIRY  = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

async function generateRefreshToken(user) {
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  const expiraEm = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await pool.query(
    'INSERT INTO refresh_tokens (token, expira_em, user_id) VALUES (?, ?, ?)',
    [token, expiraEm, user.id]
  );

  return token;
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

async function revokeRefreshToken(token) {
  await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
}

async function isRefreshTokenValid(token) {
  if (!token) return false;

  const [rows] = await pool.query(
    'SELECT id, expira_em FROM refresh_tokens WHERE token = ?',
    [token]
  );

  if (rows.length === 0) return false;
  if (new Date(rows[0].expira_em) < new Date()) {
    // Já expirou — limpa do banco
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    return false;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  bcrypt,
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
};
