/**
 * CONTROLLER: Matérias
 * ====================
 * 
 * Responsabilidades:
 * - Listar todas as matérias do usuário
 * - Criar nova matéria
 * - Atualizar matéria existente
 * - Remover matéria
 * 
 * Cada matéria tem:
 * - nome (obrigatório)
 * - professor (opcional)
 * - cor (para visualização no app)
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const db = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/materias
 * 
 * Lista todas as matérias do usuário autenticado
 * Ordenadas por nome em ordem alfabética
 * 
 * Response (200):
 * [
 *   {
 *     "id": 1,
 *     "usuario_id": 1,
 *     "nome": "Cálculo I",
 *     "professor": "Dr. Silva",
 *     "cor": "#f59e0b",
 *     "criado_em": "2025-06-10T10:30:00.000Z"
 *   }
 * ]
 * 
 * Response (200) - vazio:
 * []
 * 
 * Requer: Authorization header com access token
 */
async function listar(req, res, next) {
  try {
    // ─── BUSCAR MATÉRIAS DO USUÁRIO ───
    const [materias] = await db.query(
      `SELECT 
        id, 
        usuario_id, 
        nome, 
        professor, 
        cor, 
        criado_em 
       FROM materias 
       WHERE usuario_id = ? 
       ORDER BY nome ASC`,
      [req.usuarioId]
    );

    // ─── RESPOSTA ───
    return res.json(materias);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/materias
 * 
 * Cria uma nova matéria
 * 
 * Body:
 * - nome (string, obrigatório): Nome da matéria (máx 100 caracteres)
 * - professor (string, opcional): Nome do professor
 * - cor (string, opcional): Cor em hex (ex: #f59e0b)
 * 
 * Response (201):
 * {
 *   "id": 1,
 *   "nome": "Cálculo I",
 *   "professor": "Dr. Silva",
 *   "cor": "#f59e0b",
 *   "mensagem": "Matéria criada com sucesso"
 * }
 * 
 * Requer: Authorization header com access token
 */
async function criar(req, res, next) {
  try {
    const { nome, professor, cor } = req.body;

    // ─── VALIDAÇÃO DE NOME ───
    if (!nome) {
      throw new ApiError('nome é obrigatório', 400);
    }

    if (typeof nome !== 'string') {
      throw new ApiError('nome deve ser uma string', 400);
    }

    const nomeTrimmed = nome.trim();

    if (nomeTrimmed.length < 2) {
      throw new ApiError('Nome da matéria deve ter pelo menos 2 caracteres', 400);
    }

    if (nomeTrimmed.length > 100) {
      throw new ApiError('Nome da matéria não pode ter mais de 100 caracteres', 400);
    }

    // ─── VALIDAÇÃO DE PROFESSOR (OPCIONAL) ───
    let professorTrimmed = null;
    if (professor) {
      if (typeof professor !== 'string') {
        throw new ApiError('professor deve ser uma string', 400);
      }
      professorTrimmed = professor.trim();
      
      if (professorTrimmed.length > 100) {
        throw new ApiError('Nome do professor não pode ter mais de 100 caracteres', 400);
      }
    }

    // ─── VALIDAÇÃO DE COR (OPCIONAL) ───
    let corFinal = '#6366f1'; // cor padrão
    if (cor) {
      if (typeof cor !== 'string') {
        throw new ApiError('cor deve ser uma string', 400);
      }

      const corRegex = /^#[0-9A-F]{6}$/i;
      if (!corRegex.test(cor)) {
        throw new ApiError('cor deve estar no formato hex (ex: #f59e0b)', 400);
      }
      corFinal = cor.toUpperCase();
    }

    // ─── INSERIR MATÉRIA ───
    const [resultado] = await db.query(
      `INSERT INTO materias (usuario_id, nome, professor, cor) 
       VALUES (?, ?, ?, ?)`,
      [req.usuarioId, nomeTrimmed, professorTrimmed, corFinal]
    );

    const materiaId = resultado.insertId;

    // ─── RESPOSTA DE SUCESSO ───
    return res.status(201).json({
      mensagem: 'Matéria criada com sucesso',
      id: materiaId,
      nome: nomeTrimmed,
      professor: professorTrimmed,
      cor: corFinal,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/materias/:id
 * 
 * Atualiza uma matéria existente
 * Apenas o dono pode atualizar sua matéria
 * 
 * Params:
 * - id (number): ID da matéria
 * 
 * Body (todos opcionais, pelo menos um deve ser enviado):
 * - nome (string)
 * - professor (string)
 * - cor (string em hex)
 * 
 * Response (200):
 * {
 *   "mensagem": "Matéria atualizada com sucesso"
 * }
 * 
 * Error (404): Matéria não encontrada
 * Requer: Authorization header com access token
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, professor, cor } = req.body;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE MATÉRIA EXISTE E PERTENCE AO USUÁRIO ───
    const [materias] = await db.query(
      'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (materias.length === 0) {
      throw new ApiError('Matéria não encontrada', 404);
    }

    // ─── PREPARAR DADOS PARA ATUALIZAR ───
    const updates = [];
    const values = [];

    if (nome !== undefined) {
      if (typeof nome !== 'string') {
        throw new ApiError('nome deve ser uma string', 400);
      }

      const nomeTrimmed = nome.trim();
      if (nomeTrimmed.length < 2) {
        throw new ApiError('Nome deve ter pelo menos 2 caracteres', 400);
      }
      if (nomeTrimmed.length > 100) {
        throw new ApiError('Nome não pode ter mais de 100 caracteres', 400);
      }

      updates.push('nome = ?');
      values.push(nomeTrimmed);
    }

    if (professor !== undefined) {
      let professorTrimmed = null;
      if (professor) {
        if (typeof professor !== 'string') {
          throw new ApiError('professor deve ser uma string', 400);
        }
        professorTrimmed = professor.trim();
        
        if (professorTrimmed.length > 100) {
          throw new ApiError('Nome do professor não pode ter mais de 100 caracteres', 400);
        }
      }

      updates.push('professor = ?');
      values.push(professorTrimmed);
    }

    if (cor !== undefined) {
      if (typeof cor !== 'string') {
        throw new ApiError('cor deve ser uma string', 400);
      }

      const corRegex = /^#[0-9A-F]{6}$/i;
      if (!corRegex.test(cor)) {
        throw new ApiError('cor deve estar no formato hex (ex: #f59e0b)', 400);
      }

      updates.push('cor = ?');
      values.push(cor.toUpperCase());
    }

    // ─── SE NENHUM CAMPO FOR ATUALIZADO ───
    if (updates.length === 0) {
      throw new ApiError('Nenhum campo para atualizar', 400);
    }

    // ─── ATUALIZAR MATÉRIA ───
    values.push(id);
    const sql = `UPDATE materias SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    // ─── RESPOSTA DE SUCESSO ───
    return res.json({
      mensagem: 'Matéria atualizada com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/materias/:id
 * 
 * Remove uma matéria
 * Apenas o dono pode remover sua matéria
 * Aviso: Também remove todas as atividades associadas
 * 
 * Params:
 * - id (number): ID da matéria
 * 
 * Response (200):
 * {
 *   "mensagem": "Matéria removida com sucesso"
 * }
 * 
 * Error (404): Matéria não encontrada
 * Requer: Authorization header com access token
 */
async function remover(req, res, next) {
  try {
    const { id } = req.params;

    // ─── VALIDAÇÃO DE ID ───
    if (!id || isNaN(id)) {
      throw new ApiError('ID inválido', 400);
    }

    // ─── VERIFICAR SE MATÉRIA EXISTE E PERTENCE AO USUÁRIO ───
    const [materias] = await db.query(
      'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );

    if (materias.length === 0) {
      throw new ApiError('Matéria não encontrada', 404);
    }

    // ─── REMOVER MATÉRIA (e suas atividades por CASCADE) ───
    await db.query('DELETE FROM materias WHERE id = ?', [id]);

    // ─── RESPOSTA DE SUCESSO ───
    return res.json({
      mensagem: 'Matéria removida com sucesso',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  criar,
  atualizar,
  remover,
};
