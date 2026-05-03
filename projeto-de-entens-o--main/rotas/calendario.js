const express = require('express'); //importa o express
const router = express.Router(); //cria um rota pro calendário
const { authenticateToken } = require('../auth'); //importa a autenticação do auth

const eventos = []; //banco temporário
let nextId = 1; //contador de Id's únicos para cada evento

router.get('/',authenticateToken, (req,res) => {
    const { mes, ano} = req.query;
    let resultado = eventos.filter((e) => e.userId === req.user.id);

    if (mes && ano) {
        resultado = resultado.filter(e => {
            const data = new Date(e.dataInicio);
            return (
                data.getMonth() + 1 === parseInt(mes) &&
                data.getFullYear() === parseInt(ano)
            );
        });
    }

    return res.json(resultado);
});

router.get('/:id',authenticateToken, (req,res) => {
    const evento = eventos.find(e => 
        e.id === parseInt(req.params.id)
        && e.userId === req.user.id
    );

    if (!evento) {
        return res.status(404).json({erro: "Evento não Encontrado"});
    }

    return res.json(evento);
});

router.post('/',authenticateToken, (req,res) => {
    const {titulo, descricao, dataInicio, dataFim, tipo, cor} = req.body;

    if (!titulo || !dataInicio) {
        return res.status(400).json({mensagem: "Título ou Data Obrigatório"});
    }

    const tiposValidos = ['prova', 'trabalho', 'aula', 'outro'];
    const tipoEvento = tiposValidos.includes(tipo) ? tipo: 'outro';

    const evento = {
        id: nextId++,
        userId: req.user.id,
        titulo: titulo,
        descricao: descricao || null,
        dataInicio: dataInicio,
        dataFim: dataFim || null,
        dataFim: dataFim || null,
        tipo: tipoEvento,
        criadoEm: new Date().toISOString(),
    };

    eventos.push(evento);
    return res.status(201).json(evento);
});

router.put('/:id',authenticateToken,(req,res) => {
    const index = eventos.findIndex((e) => e.id === parseInt(req.params.id) && e.userId === req.user.id);

    if (index === -1) {
        return res.status(404).json({erro: "Evento não encontrado"});
    }

    const { titulo, descricao, dataInicio, dataFim, tipo, cor } = req.body;
  const tiposValidos = ['prova', 'trabalho', 'aula', 'outro'];

  eventos[index] = {
    ...eventos[index],
    titulo: titulo || eventos[index].titulo,
    descricao: descricao !== undefined ? descricao : eventos[index].descricao,
    dataInicio: dataInicio || eventos[index].dataInicio,
    dataFim: dataFim !== undefined ? dataFim : eventos[index].dataFim,
    tipo: tiposValidos.includes(tipo) ? tipo : eventos[index].tipo,
    cor: cor || eventos[index].cor,
    atualizadoEm: new Date().toISOString(),
  };

  return res.json(eventos[index]);
});

router.delete('/:id', authenticateToken, (req, res) => {
  const index = eventos.findIndex(
    (e) => e.id === parseInt(req.params.id) && e.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ message: 'Evento não encontrado.' });
  }

  eventos.splice(index, 1);
  return res.json({ message: 'Evento removido com sucesso.' });
});

module.exports = router;
