const db = require('../config/database');

// GET /calendario?mes=06&ano=2025
// Retorna atividades e lembretes agrupados por dia do mês
async function obterMes(req, res) {
  const { mes, ano } = req.query;

  if (!mes || !ano) {
    return res.status(400).json({ erro: 'mes e ano são obrigatórios.' });
  }

  const mesNum = parseInt(mes, 10);
  const anoNum = parseInt(ano, 10);

  if (mesNum < 1 || mesNum > 12 || anoNum < 2000) {
    return res.status(400).json({ erro: 'mes (1-12) e ano válidos são obrigatórios.' });
  }

  try {
    // Definir o intervalo de datas do mês
    const dataInicio = new Date(anoNum, mesNum - 1, 1);
    const dataFim = new Date(anoNum, mesNum, 0, 23, 59, 59);

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Buscar atividades do mês
    const [atividades] = await db.query(
      `SELECT 
        DATE(a.prazo) as data,
        a.id,
        a.titulo,
        a.tipo,
        a.status,
        a.prazo,
        m.nome as materia_nome,
        m.cor as materia_cor,
        'atividade' as tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? AND DATE(a.prazo) BETWEEN ? AND ?
       ORDER BY a.prazo`,
      [req.usuarioId, dataInicioStr, dataFimStr]
    );

    // Buscar lembretes do mês
    const [lembretes] = await db.query(
      `SELECT 
        DATE(l.data_hora) as data,
        l.id,
        l.titulo,
        l.data_hora,
        l.concluido,
        'lembrete' as tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? AND DATE(l.data_hora) BETWEEN ? AND ?
       ORDER BY l.data_hora`,
      [req.usuarioId, dataInicioStr, dataFimStr]
    );

    // Agrupar eventos por data
    const calendario = {};

    atividades.forEach((at) => {
      const data = at.data;
      if (!calendario[data]) calendario[data] = [];
      calendario[data].push(at);
    });

    lembretes.forEach((lem) => {
      const data = lem.data;
      if (!calendario[data]) calendario[data] = [];
      calendario[data].push(lem);
    });

    return res.json({
      mes: mesNum,
      ano: anoNum,
      eventos: calendario,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// GET /calendario/proximos?dias=7
// Retorna os próximos X dias com atividades e lembretes (para dashboard)
async function obterProximos(req, res) {
  const { dias } = req.query;
  const diasNum = parseInt(dias, 10) || 7;

  if (diasNum < 1 || diasNum > 365) {
    return res.status(400).json({ erro: 'dias deve estar entre 1 e 365.' });
  }

  try {
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    const dataFuturo = new Date(dataAtual);
    dataFuturo.setDate(dataFuturo.getDate() + diasNum);

    const dataAtualStr = dataAtual.toISOString().split('T')[0];
    const dataFuturoStr = dataFuturo.toISOString().split('T')[0];

    // Atividades pendentes ou em andamento
    const [atividades] = await db.query(
      `SELECT 
        a.id,
        a.titulo,
        a.tipo,
        a.status,
        a.prazo,
        a.nota,
        m.nome as materia_nome,
        m.cor as materia_cor,
        'atividade' as tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? 
         AND DATE(a.prazo) BETWEEN ? AND ?
         AND a.status IN ('pendente', 'em_andamento')
       ORDER BY a.prazo ASC`,
      [req.usuarioId, dataAtualStr, dataFuturoStr]
    );

    // Lembretes não concluídos
    const [lembretes] = await db.query(
      `SELECT 
        l.id,
        l.titulo,
        l.data_hora,
        l.concluido,
        'lembrete' as tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? 
         AND DATE(l.data_hora) BETWEEN ? AND ?
         AND l.concluido = FALSE
       ORDER BY l.data_hora ASC`,
      [req.usuarioId, dataAtualStr, dataFuturoStr]
    );

    // Combinar e ordenar
    const eventos = [...atividades, ...lembretes].sort((a, b) => {
      const dataA = new Date(a.prazo || a.data_hora);
      const dataB = new Date(b.prazo || b.data_hora);
      return dataA - dataB;
    });

    return res.json({
      dias: diasNum,
      dataAtual: dataAtualStr,
      eventos,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

// GET /calendario/hoje
// Retorna atividades e lembretes de hoje (para widget/dashboard)
async function obterHoje(req, res) {
  try {
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);
    const dataHojeStr = dataHoje.toISOString().split('T')[0];

    // Atividades de hoje
    const [atividades] = await db.query(
      `SELECT 
        a.id,
        a.titulo,
        a.tipo,
        a.status,
        a.prazo,
        m.nome as materia_nome,
        m.cor as materia_cor,
        'atividade' as tipo_evento
       FROM atividades a
       LEFT JOIN materias m ON m.id = a.materia_id
       WHERE a.usuario_id = ? AND DATE(a.prazo) = ?
       ORDER BY a.prazo ASC`,
      [req.usuarioId, dataHojeStr]
    );

    // Lembretes de hoje
    const [lembretes] = await db.query(
      `SELECT 
        l.id,
        l.titulo,
        l.data_hora,
        l.concluido,
        'lembrete' as tipo_evento
       FROM lembretes l
       WHERE l.usuario_id = ? AND DATE(l.data_hora) = ?
       ORDER BY l.data_hora ASC`,
      [req.usuarioId, dataHojeStr]
    );

    // Resumo rápido
    const [statsAtividades] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(status = 'concluida') as concluidas,
        SUM(status = 'pendente') as pendentes,
        SUM(status = 'em_andamento') as em_andamento
       FROM atividades
       WHERE usuario_id = ? AND DATE(prazo) = ?`,
      [req.usuarioId, dataHojeStr]
    );

    return res.json({
      data: dataHojeStr,
      atividades,
      lembretes,
      resumo: statsAtividades[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { obterMes, obterProximos, obterHoje };
