/**
 * CONTROLLER: Calendário
 * ======================
 * 
 * Responsabilidades:
 * - Retornar eventos do dia atual
 * - Retornar próximos X dias com eventos
 * - Retornar calendário completo do mês
 * 
 * Eventos são:
 * - Atividades (provas, trabalhos, etc)
 * - Lembretes (notificações com data)
 * 
 * Usado na tela inicial do app
 * 
 * @author Academic API Team
 * @version 1.0.0
 */

const db = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/calendario/hoje
 * 
 * Retorna atividades e lembretes de HOJE
 * Inclui um resumo rápido do dia
 * 
 * Response (200):
 * {
 *   "data": "2025-06-10",
 *   "atividades": [...],
 *   "lembretes": [...],
 *   "resumo": {
 *     "total": 3,
 *     "concluidas": 1,
 *     "pendentes": 1,
 *     "em_andamento": 1
 *   }
 * }
 * 
 * Requer: Authorization header com access token
 */
async function obterHoje(req, res, next) {
  try {
    // ─── DEFINIR DATA DE HOJE ───
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);
    const dataHojeStr = dataHoje.toISOString().split('T')[0];

    // ─── BUSCAR ATIVIDADES DE HOJE ───
    const [atividades] = await db.query(
      `SELECT 
        a.id, 
        a.titulo, 
        a.tipo, 
        a.status, 
        a.prazo, 
        a.nota,
        m.nome AS materia_nome, 
        m.cor AS materia_cor, 
        'atividade' AS tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? AND DATE(a.prazo) = ?
       ORDER BY a.prazo ASC`,
      [req.usuarioId, dataHojeStr]
    );

    // ─── BUSCAR LEMBRETES DE HOJE ───
    const [lembretes] = await db.query(
      `SELECT 
        l.id, 
        l.titulo, 
        l.data_hora, 
        l.concluido, 
        'lembrete' AS tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? AND DATE(l.data_hora) = ?
       ORDER BY l.data_hora ASC`,
      [req.usuarioId, dataHojeStr]
    );

    // ─── BUSCAR RESUMO DE ATIVIDADES DE HOJE ───
    const [resumoStats] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidas,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento
       FROM atividades
       WHERE usuario_id = ? AND DATE(prazo) = ?`,
      [req.usuarioId, dataHojeStr]
    );

    // ─── RESPOSTA ───
    return res.json({
      data: dataHojeStr,
      atividades,
      lembretes,
      resumo: resumoStats[0] || {
        total: 0,
        concluidas: 0,
        pendentes: 0,
        em_andamento: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/calendario/proximos
 * 
 * Retorna atividades e lembretes dos próximos X dias
 * Padrão: 7 dias
 * 
 * Query Parameters:
 * - dias (number, opcional): Quantos dias no futuro (1-365, padrão: 7)
 * 
 * Exemplo:
 * GET /api/calendario/proximos
 * GET /api/calendario/proximos?dias=14
 * GET /api/calendario/proximos?dias=30
 * 
 * Response (200):
 * {
 *   "dias": 7,
 *   "dataAtual": "2025-06-10",
 *   "eventos": [
 *     {
 *       "id": 1,
 *       "titulo": "Prova P1",
 *       "tipo": "prova",
 *       "status": "pendente",
 *       "prazo": "2025-06-10T14:00:00.000Z",
 *       "materia_nome": "Cálculo I",
 *       "materia_cor": "#f59e0b",
 *       "tipo_evento": "atividade"
 *     }
 *   ]
 * }
 * 
 * Requer: Authorization header com access token
 */
async function obterProximos(req, res, next) {
  try {
    const { dias } = req.query;

    // ─── VALIDAR PARÂMETRO DIAS ───
    let diasNum = 7; // padrão

    if (dias !== undefined) {
      if (isNaN(dias)) {
        throw new ApiError('dias deve ser um número', 400);
      }

      diasNum = parseInt(dias, 10);

      if (diasNum < 1) {
        throw new ApiError('dias deve ser maior ou igual a 1', 400);
      }

      if (diasNum > 365) {
        throw new ApiError('dias não pode ser maior que 365', 400);
      }
    }

    // ─── DEFINIR INTERVALO DE DATAS ───
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    const dataFuturo = new Date(dataAtual);
    dataFuturo.setDate(dataFuturo.getDate() + diasNum);

    const dataAtualStr = dataAtual.toISOString().split('T')[0];
    const dataFuturoStr = dataFuturo.toISOString().split('T')[0];

    // ─── BUSCAR ATIVIDADES ───
    const [atividades] = await db.query(
      `SELECT 
        a.id, 
        a.titulo, 
        a.tipo, 
        a.status, 
        a.prazo, 
        a.nota,
        m.nome AS materia_nome, 
        m.cor AS materia_cor, 
        'atividade' AS tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? 
         AND DATE(a.prazo) BETWEEN ? AND ?
         AND a.status IN ('pendente', 'em_andamento')
       ORDER BY a.prazo ASC`,
      [req.usuarioId, dataAtualStr, dataFuturoStr]
    );

    // ─── BUSCAR LEMBRETES ───
    const [lembretes] = await db.query(
      `SELECT 
        l.id, 
        l.titulo, 
        l.data_hora, 
        l.concluido, 
        'lembrete' AS tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? 
         AND DATE(l.data_hora) BETWEEN ? AND ?
         AND l.concluido = FALSE
       ORDER BY l.data_hora ASC`,
      [req.usuarioId, dataAtualStr, dataFuturoStr]
    );

    // ─── COMBINAR E ORDENAR EVENTOS ───
    const eventos = [...atividades, ...lembretes].sort((a, b) => {
      const dataA = new Date(a.prazo || a.data_hora);
      const dataB = new Date(b.prazo || b.data_hora);
      return dataA - dataB;
    });

    // ─── RESPOSTA ───
    return res.json({
      dias: diasNum,
      dataAtual: dataAtualStr,
      eventos,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/calendario
 * 
 * Retorna calendário completo do mês
 * Eventos agrupados por data
 * 
 * Query Parameters (obrigatórios):
 * - mes (number): Mês (1-12)
 * - ano (number): Ano (ex: 2025)
 * 
 * Exemplo:
 * GET /api/calendario?mes=6&ano=2025
 * GET /api/calendario?mes=1&ano=2026
 * 
 * Response (200):
 * {
 *   "mes": 6,
 *   "ano": 2025,
 *   "eventos": {
 *     "2025-06-10": [
 *       {
 *         "id": 1,
 *         "titulo": "Prova P1",
 *         "tipo": "prova",
 *         "status": "pendente",
 *         "prazo": "2025-06-10T14:00:00.000Z",
 *         "materia_nome": "Cálculo I",
 *         "materia_cor": "#f59e0b",
 *         "tipo_evento": "atividade"
 *       }
 *     ],
 *     "2025-06-15": [...]
 *   }
 * }
 * 
 * Error (400): Mês ou ano inválido
 * Requer: Authorization header com access token
 */
async function obterMes(req, res, next) {
  try {
    const { mes, ano } = req.query;

    // ─── VALIDAR PARÂMETROS ───
    if (!mes || !ano) {
      throw new ApiError('mes e ano são obrigatórios', 400);
    }

    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);

    if (isNaN(mesNum) || isNaN(anoNum)) {
      throw new ApiError('mes e ano devem ser números', 400);
    }

    if (mesNum < 1 || mesNum > 12) {
      throw new ApiError('mes deve estar entre 1 e 12', 400);
    }

    if (anoNum < 2000 || anoNum > 2100) {
      throw new ApiError('ano deve estar entre 2000 e 2100', 400);
    }

    // ─── CALCULAR INTERVALO DO MÊS ───
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 0, 23, 59, 59);

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // ─── BUSCAR ATIVIDADES ───
    const [atividades] = await db.query(
      `SELECT 
        DATE(a.prazo) AS data,
        a.id, 
        a.titulo, 
        a.tipo, 
        a.status, 
        a.prazo, 
        a.nota,
        m.nome AS materia_nome, 
        m.cor AS materia_cor, 
        'atividade' AS tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? AND DATE(a.prazo) BETWEEN ? AND ?
       ORDER BY a.prazo`,
      [req.usuarioId, dataInicioStr, dataFimStr]
    );

    // ─── BUSCAR LEMBRETES ───
    const [lembretes] = await db.query(
      `SELECT 
        DATE(l.data_hora) AS data,
        l.id, 
        l.titulo, 
        l.data_hora, 
        l.concluido, 
        'lembrete' AS tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? AND DATE(l.data_hora) BETWEEN ? AND ?
       ORDER BY l.data_hora`,
      [req.usuarioId, dataInicioStr, dataFimStr]
    );

    // ─── AGRUPAR EVENTOS POR DATA ───
    const calendario = {};

    atividades.forEach((at) => {
      const data = at.data;
      if (!calendario[data]) calendario[data] = [];
      // Remover campo 'data' redundante
      const { data: _, ...atividadeSemData } = at;
      calendario[data].push(atividadeSemData);
    });

    lembretes.forEach((lem) => {
      const data = lem.data;
      if (!calendario[data]) calendario[data] = [];
      // Remover campo 'data' redundante
      const { data: _, ...lembreteSemData } = lem;
      calendario[data].push(lembreteSemData);
    });

    // ─── RESPOSTA ───
    return res.json({
      mes: mesNum,
      ano: anoNum,
      eventos: calendario,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  obterHoje,
  obterProximos,
  obterMes,
};
