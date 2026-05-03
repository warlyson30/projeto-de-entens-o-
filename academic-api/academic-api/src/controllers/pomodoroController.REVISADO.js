/**
 * CONTROLLER: Pomodoro
 * ====================
 * 
 * Responsabilidades:
 * - Listar histórico de sessões Pomodoro
 * - Iniciar nova sessão
 * - Marcar sessão como concluída
 * - Calcular resumo de minutos por matéria
 * 
 * Tipos de sessão:
 * - foco (25 minutos padrão)
 * - pausa_curta (5 minutos)
 * - pausa_longa (15 minutos)
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const db = require('../config/database');
const ApiError = require('../utils/ApiError');

// ─── CONSTANTES ───
const TIPOS_SESSAO_VALIDOS = ['foco', 'pausa_curta', 'pausa_longa'];
const DURACAO_PADRAO = 25; // minutos

/**
 * GET /api/pomodoro
 * 
 * Lista o histórico de sessões Pomodoro do usuário
 * Últimas 50 sessões, ordenadas do mais recente ao mais antigo
 * 
 * Response (200):
 * [
 *   {
 *     "id": 1,
 *     "duracao_minutos": 25,
 *     "tipo": "foco",
 *     "concluida": true,
 *     "iniciado_em": "2025-06-10T14:00:00.000Z",
 *     "materia_id": 1,
 *     "materia_nome": "Cálculo I"
 *   }
 * ]
 * 
 * Requer: Authorization header com access token
 */
async function listar(req, res, next) {
  try {
    // ─── BUSCAR HISTÓRICO ───
    const [sessoes] = await db.query(
      `SELECT 
        p.id, 
        p.duracao_minutos, 
        p.tipo, 
        p.concluida, 
        p.iniciado_em, 
        p.materia_id,
        m.nome AS materia_nome
       FROM sessoes_pomodoro p
       LEFT JOIN materias m ON m.id = p.materia_id
       WHERE p.usuario_id = ?
       ORDER BY p.iniciado_em DESC
       LIMIT 50`,
      [req.usuarioId]
    );

    // ─── RESPOSTA ───
    return res.json(sessoes);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pomodoro
 * 
 * Inicia uma nova sessão Pomodoro
 * 
 * Body:
 * - materia_id (number, opcional): ID da matéria em estudo
 * - duracao_minutos (number, opcional): Duração em minutos (padrão: 25)
 * - tipo (string, opcional): foco | pausa_curta | pausa_longa (padrão: foco)
 * 
 * Exemplo de body:
 * {
 *   "materia_id": 1,
 *   "duracao_minutos": 25,
 *   "tipo": "foco"
 * }
 * 
 * Response (201):
 * {
 *   "mensagem": "Sessão Pomodoro iniciada",
 *   "id": 1,
 *   "duracao_minutos": 25,
 *   "tipo": "foco"
 * }
 * 
 * Requer: Authorization header com access token
 */
async function iniciar(req, res, next) {
  try {
    const { materia_id, duracao_minutos, tipo } = req.body;

    // ─── VALIDAÇÃO DE MATÉRIA (OPCIONAL) ───
    let materiaIdFinal = null;

    if (materia_id) {
      if (isNaN(materia_id)) {
        throw new ApiError('materia_id deve ser um número', 400);
      }

      // Verificar se matéria pertence ao usuário
      const [materias] = await db.query(
        'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
        [materia_id, req.usuarioId]
      );

      if (materias.length === 0) {
        throw new ApiError('Matéria não encontrada', 404);
      }

      materiaIdFinal = materia_id;
    }

    // ─── VALIDAÇÃO DE DURAÇÃO ───
    let durationFinal = DURACAO_PADRAO;

    if (duracao_minutos !== undefined) {
      if (isNaN(duracao_minutos)) {
        throw new ApiError('duracao_minutos deve ser um número', 400);
      }

      const duracao = parseInt(duracao_minutos, 10);

      if (duracao < 1) {
        throw new ApiError('duracao_minutos deve ser maior que 0', 400);
      }

      if (duracao > 120) {
        throw new ApiError('duracao_minutos não pode ser maior que 120', 400);
      }

      durationFinal = duracao;
    }

    // ─── VALIDAÇÃO DE TIPO ───
    const tipoFinal = tipo && TIPOS_SESSAO_VALIDOS.includes(tipo) ? tipo : 'foco';

    // ─── INSERIR SESSÃO ───
    const [resultado] = await db.query(
      `INSERT INTO sessoes_pomodoro 
       (usuario_id, materia_id, duracao_minutos, tipo) 
       VALUES (?, ?, ?, ?)`,
      [req.usuarioId, materiaIdFinal, durationFinal, tipoFinal]
    );

    // ─── RESPOSTA DE SUCESSO ───
    return res.status(201).json({
      mensagem: 'Sessão Pomodoro iniciada',
      id: resultado.insertId,
      duracao_minutos: durationFinal,
      tipo: tipoFinal,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/pomodoro/:id/concluir
 * 
 * Marca uma sessão Pomodoro como concluída
 * 
 * Params:
 * - id (number): ID da sessão
 * 
 * Response (200):
 * {
 *   "mensagem": "Sessão Pomodoro concluída com sucesso"
 * }
 * 
 * Error (404): Sessão não encontrada
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
    const [sessoes] = await db.query(
      'SELECT id, concluida FROM sessoes_pomodoro WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (sessoes.length === 0) {
      throw new ApiError('Sessão Pomodoro não encontrada', 404);
    }

    // ─── VERIFICAR SE JÁ FOI CONCLUÍDA ───
    if (sessoes[0].concluida) {
      return res.json({
        mensagem: 'Sessão já estava marcada como concluída',
      });
    }

    // ─── MARCAR COMO CONCLUÍDA ───
    await db.query('UPDATE sessoes_pomodoro SET concluida = TRUE WHERE id = ?', [id]);

    // ─── RESPOSTA ───
    return res.json({
      mensagem: 'Sessão Pomodoro concluída com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pomodoro/resumo
 * 
 * Calcula o total de minutos focados por matéria
 * Apenas sessões concluídas com tipo 'foco'
 * Útil para dashboard e estatísticas
 * 
 * Response (200):
 * [
 *   {
 *     "materia": "Cálculo I",
 *     "sessoes_concluidas": 8,
 *     "minutos_totais": 200
 *   },
 *   {
 *     "materia": "Sem matéria",
 *     "sessoes_concluidas": 2,
 *     "minutos_totais": 50
 *   }
 * ]
 * 
 * Requer: Authorization header com access token
 */
async function resumo(req, res, next) {
  try {
    // ─── CALCULAR RESUMO ───
    const [stats] = await db.query(
      `SELECT
         COALESCE(m.nome, 'Sem matéria')  AS materia,
         COUNT(p.id)                       AS sessoes_concluidas,
         SUM(p.duracao_minutos)            AS minutos_totais
       FROM sessoes_pomodoro p
       LEFT JOIN materias m ON m.id = p.materia_id
       WHERE p.usuario_id = ? 
         AND p.concluida = TRUE 
         AND p.tipo = 'foco'
       GROUP BY p.materia_id
       ORDER BY materia ASC`,
      [req.usuarioId]
    );

    // ─── RESPOSTA ───
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  iniciar,
  concluir,
  resumo,
};
