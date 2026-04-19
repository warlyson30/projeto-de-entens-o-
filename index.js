require('dotenv').config();

const express = require('express');
const app = express();
const porta = process.env.PORTA || 3000;
const USUARIOSSIMULADOS = [
    { ID: 1,NOME: 'Warlyson',CARGO:'Desenvolvedor Back-End'},
    { ID: 2,NOME: 'Lucas',CARGO:'Desenvolvedor Back-End'}
];
// Rota principal
app.get('/', (req, res) => {
  res.send('API PROJETO EXTENSIONISTA!');
});
app.get('/usuarios', (req, res) => {
    res.json(USUARIOSSIMULADOS);
});
// Faz o servidor rodar
app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
});

