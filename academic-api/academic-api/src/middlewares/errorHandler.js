// src/middlewares/errorHandler.js
const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  // Se for erro customizado, use o statusCode dele
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      erro: err.message,
      status: err.statusCode,
    });
  }

  // Se for erro de validação do MySQL
  if (err.code && err.code.startsWith('ER_')) {
    const mensagem = err.code === 'ER_DUP_ENTRY' 
      ? 'Valor duplicado. Este registro já existe.' 
      : 'Erro no banco de dados.';
    
    return res.status(409).json({
      erro: mensagem,
      status: 409,
    });
  }

  // Erros não tratados (fallback)
  console.error('❌ Erro não tratado:', err);
  return res.status(500).json({
    erro: 'Erro interno no servidor.',
    status: 500,
  });
}

module.exports = errorHandler;
