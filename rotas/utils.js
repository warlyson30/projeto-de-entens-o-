/**
 * Valida se uma string de data é válida no formato ISO 8601.
 * @param {string} data
 * @returns {boolean}
 */
function isDataValida(data) {
  return data !== null && data !== undefined && !isNaN(Date.parse(data));
}

/**
 * Valida se um valor está dentro de uma lista de valores permitidos.
 * @param {*} valor
 * @param {Array} lista
 * @returns {boolean}
 */
function isValorValido(valor, lista) {
  return lista.includes(valor);
}

/**
 * Valida nota: deve ser número entre 0 e 10.
 * @param {*} nota
 * @returns {boolean}
 */
function isNotaValida(nota) {
  return typeof nota === 'number' && nota >= 0 && nota <= 10;
}

/**
 * Valida peso: deve ser número maior que zero.
 * @param {*} peso
 * @returns {boolean}
 */
function isPesoValido(peso) {
  return typeof peso === 'number' && peso > 0;
}

module.exports = { isDataValida, isValorValido, isNotaValida, isPesoValido };
