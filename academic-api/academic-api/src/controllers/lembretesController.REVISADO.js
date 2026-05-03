/**
 * CONTROLLER: Lembretes
 * =====================
 * 
 * Responsabilidades:
 * - Listar lembretes do usuário
 * - Criar novo lembrete
 * - Marcar lembrete como concluído
 * - Remover lembrete
 * 
 * Um lembrete é uma notificação com data/hora específica
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const db = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/lembretes
 * 
 * Lista todos os lembretes do usuário autenticado
 * Ordenados por data/hora (próximos primeiro)
 * 
 * Response (200):
 * [
 *   {
 *     "id": 1,
 *     "titulo": "Entregar TCC",
 *     "descricao": "Capítulo 3 faltando",
 *     "data_hora": "2025-06-15T23:59:00.000Z",
 *     "concluido": false,
 *     "criado_em": "2025-06-10T10:30:00.000Z"
 *   }
 * ]
 * 
 * Requer: Authorization header com access token
 */
async function listar(req, res, next) {
  try {
    // ─── BUSCAR LEMBRETES ───
    const [lembretes] = await db.query(
      `SELECT 
        id, 
        titulo, 
        descricao, 
        data_hora, 
        concluido, 
        criado_em 
       FROM lembretes 
       WHERE usuario_id = ? 
       ORDER BY data_hora ASC`,
      [req.usuarioId]
    );

    // ─── RESPOSTA ───
    return res.json(lembretes);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/lembretes
 * 
 * Cria um novo lembrete
 * 
 * Body:
 * - titulo (string, obrigatório): Título do lembrete
 * - descricao (string, opcional): Descrição detalhada
 * - data_hora (datetime, obrigatório): Quando lembrá-lo (ISO format)
 * 
 * Exemplo de body:
 * {
 *   "titulo": "Entregar TCC",
 *   "descricao": "Capítulo 3 completo",
 *   "data_hora": "2025-06-15T23:59:00"
 * }
 * 
 * Response (201):
 * {
 *   "mensagem": "Lembrete criado com sucesso",
 *   "id": 1,
 *   "titulo": "Entregar TCC",
 *   "data_hora": "2025-06-15T23:59:00.000Z"
 * }
 * 
 * Requer: Authorization header com access token
 */
async function criar(req, res, next) {
  try {
    const { titulo, descricao, data_hora } = req.body;

    // ─── VALIDAÇÃO DE TÍTULO ───
    if (!titulo) {
      throw new ApiError('titulo é obrigatório', 400);
    }

    if (typeof titulo !== 'string') {
      throw new ApiError('titulo deve ser uma string', 400);
    }

    const tituloTrimmed = titulo.trim();

    if (tituloTrimmed.length < 2) {
      throw new ApiError('Título deve ter pelo menos 2 caracteres', 400);
    }

    if (tituloTrimmed.length > 150) {
      throw new ApiError('Título não pode ter mais de 150 caracteres', 400);
    }

    // ─── VALIDAÇÃO DE DATA_HORA ───
    if (!data_hora) {
      throw new ApiError('data_hora é obrigatório', 400);
    }

    if (typeof data_hora !== 'string') {
      throw new ApiError('data_hora deve ser uma string (ISO format)', 400);
    }

    const dataObj = new Date(data_hora);

    if (isNaN(dataObj.getTime())) {
      throw new ApiError('data_hora inválida. Use formato ISO: 2025-06-15T23:59:00', 400);
    }

    // ─── VALIDAR SE DATA NÃO É NO PASSADO ───
    const agora = new Date();
    if (dataObj < agora) {
      throw new ApiError('A data do lembrete não pode ser no passado', 400);
    }

    const dataHoraISO = dataObj.toISOString();

    // ─── INSERIR LEMBRETE ───
    const [resultado] = await db.query(
      `INSERT INTO lembretes (usuario_id, titulo, descricao, data_hora) 
       VALUES (?, ?, ?, ?)`,
      [req.usuarioId, tituloTrimmed, descricao || null, dataHoraISO]
    );

    // ─── RESPOSTA DE SUCESSO ───
    return res.status(201).json({
      mensagem: 'Lembrete criado com sucesso',
      id: resultado.insertId,
      titulo: tituloTrimmed,
      data_hora: dataHoraISO,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/lembretes/:id/concluir
 * 
 * Marca um lembrete como concluído
 * 
 * Params:
 * - id (number): ID do lembrete
 * 
 * Response (200):
 * {
 *   "mensagem": "Lembrete marcado como concluído"
 * }
 * 
 * Error (404): Lembrete não encontrado
 * Requer: Authorization header com access token
 */
async function concluir(req, res, next) {
  try {
    const { id } = req.params;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE EXISTE ───
    const [lembretes] = await db.query(
      'SELECT id, concluido FROM lembretes WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (lembretes.length === 0) {
      throw new ApiError('Lembrete não encontrado', 404);
    }

    // ─── VERIFICAR SE JÁ ESTÁ CONCLUÍDO ───
    if (lembretes[0].concluido) {
      return res.json({
        mensagem: 'Lembrete já estava marcado como concluído',
      });
    }

    // ─── MARCAR COMO CONCLUÍDO ───
    await db.query('UPDATE lembretes SET concluido = TRUE WHERE id = ?', [id]);

    // ─── RESPOSTA ───
    return res.json({
      mensagem: 'Lembrete marcado como concluído',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/lembretes/:id
 * 
 * Remove um lembrete
 * 
 * Params:
 * - id (number): ID do lembrete
 * 
 * Response (200):
 * {
 *   "mensagem": "Lembrete removido com sucesso"
 * }
 * 
 * Error (404): Lembrete não encontrado
 * Requer: Authorization header com access token
 */
async function remover(req, res, next) {
  try {
    const { id } = req.params;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE EXISTE ───
    const [lembretes] = await db.query(
      'SELECT id FROM lembretes WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (lembretes.length === 0) {
      throw new ApiError('Lembrete não encontrado', 404);
    }

    // ─── REMOVER ───
    await db.query('DELETE FROM lembretes WHERE id = ?', [id]);

    // ─── RESPOSTA ───
    return res.json({
      mensagem: 'Lembrete removido com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  criar,
  concluir,
  remover,
};
