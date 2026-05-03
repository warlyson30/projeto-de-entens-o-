/**
 * CONTROLLER: Atividades
 * ======================
 * 
 * Responsabilidades:
 * - Listar atividades com filtros
 * - Buscar uma atividade por ID
 * - Criar nova atividade
 * - Atualizar atividade
 * - Remover atividade
 * - Calcular rendimento (estatísticas por matéria)
 * 
 * Tipos de atividade: prova | trabalho | exercicio | outro
 * Status: pendente | em_andamento | concluida
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const db = require('../config/database');
const ApiError = require('../utils/ApiError');

// ─── CONSTANTES ───
const TIPOS_VALIDOS = ['prova', 'trabalho', 'exercicio', 'outro'];
const STATUS_VALIDOS = ['pendente', 'em_andamento', 'concluida'];

/**
 * GET /api/atividades
 * 
 * Lista atividades com filtros opcionais
 * 
 * Query Parameters (todos opcionais):
 * - materia_id (number): Filtrar por matéria
 * - tipo (string): prova | trabalho | exercicio | outro
 * - status (string): pendente | em_andamento | concluida
 * 
 * Exemplos:
 * GET /api/atividades
 * GET /api/atividades?materia_id=1
 * GET /api/atividades?tipo=prova&status=pendente
 * GET /api/atividades?materia_id=1&tipo=prova
 * 
 * Response (200):
 * [
 *   {
 *     "id": 1,
 *     "titulo": "Prova P1",
 *     "tipo": "prova",
 *     "status": "pendente",
 *     "prazo": "2025-06-10T14:00:00.000Z",
 *     "nota": null,
 *     "materia_id": 1,
 *     "materia_nome": "Cálculo I",
 *     "criado_em": "2025-06-10T10:30:00.000Z"
 *   }
 * ]
 * 
 * Requer: Authorization header com access token
 */
async function listar(req, res, next) {
  try {
    const { materia_id, tipo, status } = req.query;

    // ─── VALIDAR FILTROS ───
    if (materia_id && isNaN(materia_id)) {
      throw new ApiError('materia_id deve ser um número', 400);
    }

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      throw new ApiError(`tipo deve ser: ${TIPOS_VALIDOS.join(', ')}`, 400);
    }

    if (status && !STATUS_VALIDOS.includes(status)) {
      throw new ApiError(`status deve ser: ${STATUS_VALIDOS.join(', ')}`, 400);
    }

    // ─── CONSTRUIR QUERY DINÂMICA ───
    let sql = `SELECT 
                a.id, 
                a.titulo, 
                a.descricao,
                a.tipo, 
                a.status, 
                a.prazo, 
                a.nota,
                a.materia_id,
                m.nome AS materia_nome,
                a.criado_em, 
                a.atualizado_em
               FROM atividades a
               LEFT JOIN materias m ON m.id = a.materia_id
               WHERE a.usuario_id = ?`;

    const params = [req.usuarioId];

    if (materia_id) {
      sql += ' AND a.materia_id = ?';
      params.push(materia_id);
    }

    if (tipo) {
      sql += ' AND a.tipo = ?';
      params.push(tipo);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.prazo ASC, a.criado_em DESC';

    // ─── EXECUTAR QUERY ───
    const [atividades] = await db.query(sql, params);

    // ─── RESPOSTA ───
    return res.json(atividades);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/atividades/:id
 * 
 * Busca uma atividade específica por ID
 * 
 * Params:
 * - id (number): ID da atividade
 * 
 * Response (200):
 * {
 *   "id": 1,
 *   "titulo": "Prova P1",
 *   "descricao": "Capítulos 1 a 5",
 *   "tipo": "prova",
 *   "status": "pendente",
 *   "prazo": "2025-06-10T14:00:00.000Z",
 *   "nota": null,
 *   "materia_id": 1,
 *   "materia_nome": "Cálculo I",
 *   "criado_em": "2025-06-10T10:30:00.000Z"
 * }
 * 
 * Error (404): Atividade não encontrada
 * Requer: Authorization header com access token
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── BUSCAR ATIVIDADE ───
    const [atividades] = await db.query(
      `SELECT 
        a.id, 
        a.titulo, 
        a.descricao,
        a.tipo, 
        a.status, 
        a.prazo, 
        a.nota,
        a.materia_id,
        m.nome AS materia_nome,
        a.criado_em, 
        a.atualizado_em
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.id = ? AND a.usuario_id = ?`,
      [id, req.usuarioId]
    );

    if (atividades.length === 0) {
      throw new ApiError('Atividade não encontrada', 404);
    }

    // ─── RESPOSTA ───
    return res.json(atividades[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/atividades
 * 
 * Cria uma nova atividade
 * 
 * Body:
 * - titulo (string, obrigatório): Título da atividade
 * - descricao (string, opcional): Descrição detalhada
 * - tipo (string, opcional): prova | trabalho | exercicio | outro (padrão: outro)
 * - status (string, opcional): pendente | em_andamento | concluida (padrão: pendente)
 * - prazo (datetime, opcional): Data/hora de entrega
 * - materia_id (number, opcional): ID da matéria
 * - nota (decimal, opcional): Nota obtida (0-10)
 * 
 * Response (201):
 * {
 *   "mensagem": "Atividade criada com sucesso",
 *   "id": 1,
 *   "titulo": "Prova P1"
 * }
 * 
 * Requer: Authorization header com access token
 */
async function criar(req, res, next) {
  try {
    const { titulo, descricao, tipo, status, prazo, materia_id, nota } = req.body;

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

    // ─── VALIDAÇÃO DE TIPO ───
    const tipoFinal = tipo && TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro';

    // ─── VALIDAÇÃO DE STATUS ───
    const statusFinal = status && STATUS_VALIDOS.includes(status) ? status : 'pendente';

    // ─── VALIDAÇÃO DE DATA ───
    let prazoFinal = null;
    if (prazo) {
      const dataObj = new Date(prazo);
      if (isNaN(dataObj.getTime())) {
        throw new ApiError('Data de prazo inválida. Use formato ISO: 2025-06-10T14:00:00', 400);
      }
      prazoFinal = dataObj.toISOString();
    }

    // ─── VALIDAÇÃO DE MATÉRIA ───
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

    // ─── VALIDAÇÃO DE NOTA ───
    let notaFinal = null;
    if (nota !== undefined && nota !== null) {
      const notaNum = parseFloat(nota);

      if (isNaN(notaNum)) {
        throw new ApiError('nota deve ser um número', 400);
      }

      if (notaNum < 0 || notaNum > 10) {
        throw new ApiError('nota deve estar entre 0 e 10', 400);
      }

      notaFinal = notaNum;
    }

    // ─── INSERIR ATIVIDADE ───
    const [resultado] = await db.query(
      `INSERT INTO atividades 
       (usuario_id, materia_id, titulo, descricao, tipo, status, prazo, nota) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.usuarioId, materiaIdFinal, tituloTrimmed, descricao || null, tipoFinal, statusFinal, prazoFinal, notaFinal]
    );

    // ─── RESPOSTA DE SUCESSO ───
    return res.status(201).json({
      mensagem: 'Atividade criada com sucesso',
      id: resultado.insertId,
      titulo: tituloTrimmed,
      tipo: tipoFinal,
      status: statusFinal,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/atividades/:id
 * 
 * Atualiza uma atividade existente
 * 
 * Params:
 * - id (number): ID da atividade
 * 
 * Body (todos opcionais):
 * - titulo (string)
 * - descricao (string)
 * - tipo (string)
 * - status (string)
 * - prazo (datetime)
 * - materia_id (number)
 * - nota (decimal 0-10)
 * 
 * Response (200):
 * {
 *   "mensagem": "Atividade atualizada com sucesso"
 * }
 * 
 * Error (404): Atividade não encontrada
 * Requer: Authorization header com access token
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, descricao, tipo, status, prazo, materia_id, nota } = req.body;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE EXISTE ───
    const [atividades] = await db.query(
      'SELECT id FROM atividades WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (atividades.length === 0) {
      throw new ApiError('Atividade não encontrada', 404);
    }

    // ─── PREPARAR DADOS ───
    const updates = [];
    const values = [];

    if (titulo !== undefined) {
      const tituloTrimmed = titulo.trim();
      if (tituloTrimmed.length < 2 || tituloTrimmed.length > 150) {
        throw new ApiError('Título deve ter entre 2 e 150 caracteres', 400);
      }
      updates.push('titulo = ?');
      values.push(tituloTrimmed);
    }

    if (descricao !== undefined) {
      updates.push('descricao = ?');
      values.push(descricao || null);
    }

    if (tipo !== undefined) {
      if (!TIPOS_VALIDOS.includes(tipo)) {
        throw new ApiError(`tipo deve ser: ${TIPOS_VALIDOS.join(', ')}`, 400);
      }
      updates.push('tipo = ?');
      values.push(tipo);
    }

    if (status !== undefined) {
      if (!STATUS_VALIDOS.includes(status)) {
        throw new ApiError(`status deve ser: ${STATUS_VALIDOS.join(', ')}`, 400);
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (prazo !== undefined) {
      let prazoFinal = null;
      if (prazo) {
        const dataObj = new Date(prazo);
        if (isNaN(dataObj.getTime())) {
          throw new ApiError('Data de prazo inválida', 400);
        }
        prazoFinal = dataObj.toISOString();
      }
      updates.push('prazo = ?');
      values.push(prazoFinal);
    }

    if (materia_id !== undefined) {
      if (materia_id) {
        if (isNaN(materia_id)) {
          throw new ApiError('materia_id deve ser um número', 400);
        }
        const [materias] = await db.query(
          'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
          [materia_id, req.usuarioId]
        );
        if (materias.length === 0) {
          throw new ApiError('Matéria não encontrada', 404);
        }
      }
      updates.push('materia_id = ?');
      values.push(materia_id || null);
    }

    if (nota !== undefined) {
      let notaFinal = null;
      if (nota !== null) {
        const notaNum = parseFloat(nota);
        if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
          throw new ApiError('nota deve estar entre 0 e 10', 400);
        }
        notaFinal = notaNum;
      }
      updates.push('nota = ?');
      values.push(notaFinal);
    }

    // ─── SE NENHUM CAMPO ───
    if (updates.length === 0) {
      throw new ApiError('Nenhum campo para atualizar', 400);
    }

    // ─── ATUALIZAR ───
    values.push(id);
    const sql = `UPDATE atividades SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    // ─── RESPOSTA ───
    return res.json({
      mensagem: 'Atividade atualizada com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/atividades/:id
 * 
 * Remove uma atividade
 * 
 * Params:
 * - id (number): ID da atividade
 * 
 * Response (200):
 * {
 *   "mensagem": "Atividade removida com sucesso"
 * }
 * 
 * Error (404): Atividade não encontrada
 * Requer: Authorization header com access token
 */
async function remover(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE EXISTE ───
    const [atividades] = await db.query(
      'SELECT id FROM atividades WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (atividades.length === 0) {
      throw new ApiError('Atividade não encontrada', 404);
    }

    // ─── REMOVER ───
    await db.query('DELETE FROM atividades WHERE id = ?', [id]);

    // ─── RESPOSTA ───
    return res.json({
      mensagem: 'Atividade removida com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/atividades/rendimento
 * 
 * Calcula estatísticas de rendimento por matéria
 * Útil para gráficos e dashboard
 * 
 * Response (200):
 * [
 *   {
 *     "materia": "Cálculo I",
 *     "total": 5,
 *     "concluidas": 3,
 *     "media_nota": 7.8
 *   }
 * ]
 * 
 * Requer: Authorization header com access token
 */
async function rendimento(req, res, next) {
  try {
    // ─── CALCULAR RENDIMENTO POR MATÉRIA ───
    const [stats] = await db.query(
      `SELECT
         COALESCE(m.nome, 'Sem matéria')  AS materia,
         COUNT(a.id)                       AS total,
         SUM(CASE WHEN a.status = 'concluida' THEN 1 ELSE 0 END) AS concluidas,
         ROUND(AVG(a.nota), 2)             AS media_nota
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ?
       GROUP BY a.materia_id
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
  buscarPorId,
  criar,
  atualizar,
  remover,
  rendimento,
};
