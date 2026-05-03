
```javascript
// Em todo controller...
try {
  const [rows] = await db.query(...);
  return res.json(rows);
} catch (err) {
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno.' });
}
```


```javascript
// No controller, basta fazer:
async function meuController(req, res, next) {
  try {
    const [rows] = await db.query(...);
    if (!rows) throw new ApiError('Não encontrado', 404);
    return res.json(rows);
  } catch (err) {
    next(err);  // Passa pro middleware!
  }
}
```


1. **Controller lança erro** usando `throw new ApiError(mensagem, statusCode)`
2. **next(err) passa pro middleware** global de erro
3. **Middleware trata uniformemente** e retorna a resposta



```javascript
const ApiError = require('../utils/ApiError');

// Validação
if (!email) throw new ApiError('Email é obrigatório', 400);

// Não encontrado
if (rows.length === 0) throw new ApiError('Usuário não existe', 404);

// Conflito (email duplicado)
if (existente) throw new ApiError('Email já cadastrado', 409);

// Não autorizado
throw new ApiError('Acesso negado', 403);

// Erro no servidor
throw new ApiError('Erro ao salvar', 500);
```


```json
{
  "erro": "Email é obrigatório",
  "status": 400
}
```

---

## 2. Variáveis de Ambiente por Tipo

Você tem **3 ambientes**:

```
LOCAL (seu PC) → DEV (servidor de testes) → PROD (servidor final)
  localhost       dev.api.com               api.com
```

### Como funciona:

1. **Defina NODE_ENV=development ou production no .env**
2. **O arquivo `environment.js` carrega as configs certas**
3. **Todos os arquivos usam `config` centralizado**

### Exemplo prático:

**Em desenvolvimento:**
```bash
NODE_ENV=development
DB_HOST=localhost
CORS=* (qualquer um pode acessar)
```

**Em produção:**
```bash
NODE_ENV=production
DB_HOST=api-db.empresa.com
CORS=apenas https://app.com (seguro!)
```

### Rodando em diferentes ambientes:

**Development (padrão):**
```bash
npm run dev
```

**Produção:**
```bash
NODE_ENV=production npm start
```

---

## 3. Estrutura de Config Centralizado

Arquivo: `src/config/environment.js`

```javascript
const config = {
  development: {
    port: 3000,
    nodeEnv: 'development',
    database: { /* localhost */ },
    jwt: { secret: 'dev-secret' },
    cors: { origin: '*' },
    logs: { level: 'debug' },
  },
  production: {
    port: 3000,
    nodeEnv: 'production',
    database: { /* servidor remoto */ },
    jwt: { secret: process.env.JWT_SECRET },
    cors: { origin: ['https://app.com'] },
    logs: { level: 'error' },
  },
};
```

### Validação em Produção:

Se estiver rodando em produção e faltar uma variável obrigatória, a API não inicia:

```
❌ Variáveis obrigatórias em produção faltam: JWT_SECRET, DB_USER
```

---

## 4. Como usar em um novo Controller

```javascript
const db      = require('../config/database');
const config  = require('../config/environment');
const ApiError = require('../utils/ApiError');

async function meuController(req, res, next) {
  try {
    // Validações
    if (!req.body.titulo) {
      throw new ApiError('Título é obrigatório', 400);
    }

    // Lógica
    const [resultado] = await db.query(
      'INSERT INTO tabela (campo) VALUES (?)',
      [req.body.titulo]
    );

    // Resposta
    return res.status(201).json({ id: resultado.insertId });

  } catch (err) {
    // Passa pro middleware de erro
    next(err);
  }
}

module.exports = { meuController };
```


--

Antes de colocar em produção:

- [ ] `NODE_ENV=production` no .env
- [ ] `JWT_SECRET` é uma string complexa (não "123456")
- [ ] `DB_HOST` aponta para o servidor correto
- [ ] `CORS.origin` tem apenas seus domínios
- [ ] Validou que não há console.log sensíveis
- [ ] Testou a API completa em staging

