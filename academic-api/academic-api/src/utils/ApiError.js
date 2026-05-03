// src/utils/ApiError.js
class ApiError extends Error {
  constructor(mensagem, statusCode = 500) {
    super(mensagem);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
