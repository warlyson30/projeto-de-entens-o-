# 📚 Academic API

API REST para o sistema acadêmico de estudantes do ensino superior.

---

## 🚀 Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure o banco de dados
# Execute o arquivo database.sql no MySQL Workbench ou via terminal:
mysql -u root -p < database.sql

# 3. Copie e preencha o .env
cp .env.example .env

# 4. Rode em desenvolvimento
npm run dev

# 5. Rode em produção
npm start
```

---

## 🔐 Autenticação

Todas as rotas (exceto registro e login) exigem o header:
```
Authorization: Bearer <token>
```

## 🔐 Autenticação JWT

Sistema JWT completo com **access token** (15 min) e **refresh token** (7 dias):

### Quick Start

```bash
# 1. Registrar usuário
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João",
    "email": "joao@email.com",
    "senha": "senha123"
  }'

# 2. Usar token em requisição
curl -X GET http://localhost:3000/api/auth/perfil \
  -H "Authorization: Bearer <seu_access_token>"

# 3. Renovar token (se expirou)
curl -X POST http://localhost:3000/api/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<seu_refresh_token>"}'
```

**Leia:** `JWT_COMPLETO.md` para documentação detalhada.

### Testar JWT

```bash
# Com Node.js
npm run test:jwt

# Com cURL
npm run test:jwt:curl
# ou
bash test-jwt.sh
```

### Endpoints de Autenticação

| Método | Rota                | Autenticação | Descrição |
|--------|---------------------|--------------|-----------|
| POST   | /api/auth/registro  | ❌ Pública   | Registra novo usuário |
| POST   | /api/auth/login     | ❌ Pública   | Autentica e retorna tokens |
| POST   | /api/auth/renovar   | ❌ Pública   | Renova access token |
| GET    | /api/auth/perfil    | ✅ JWT      | Dados do usuário |
| GET    | /api/auth/info-token| ✅ JWT      | Info do token (debug) |
| POST   | /api/auth/logout    | ✅ JWT      | Logout |

---

### Auth
| Método | Rota             | Descrição             | Auth |
|--------|------------------|-----------------------|------|
| POST   | /api/auth/registro | Cria novo usuário   | ❌   |
| POST   | /api/auth/login    | Retorna JWT token   | ❌   |
| GET    | /api/auth/perfil   | Dados do usuário    | ✅   |

**Registro - Body:**
```json
{ "nome": "João", "email": "joao@email.com", "senha": "123456" }
```

**Login - Body:**
```json
{ "email": "joao@email.com", "senha": "123456" }
```

---

### Matérias
| Método | Rota               | Descrição           | Auth |
|--------|--------------------|---------------------|------|
| GET    | /api/materias      | Lista matérias      | ✅   |
| POST   | /api/materias      | Cria matéria        | ✅   |
| PUT    | /api/materias/:id  | Atualiza matéria    | ✅   |
| DELETE | /api/materias/:id  | Remove matéria      | ✅   |

**POST/PUT - Body:**
```json
{ "nome": "Cálculo I", "professor": "Dr. Silva", "cor": "#f59e0b" }
```

---

### Atividades
| Método | Rota                          | Descrição                     | Auth |
|--------|-------------------------------|-------------------------------|------|
| GET    | /api/atividades               | Lista (filtros via querystring)| ✅  |
| GET    | /api/atividades/:id           | Busca por ID                  | ✅   |
| POST   | /api/atividades               | Cria atividade                | ✅   |
| PUT    | /api/atividades/:id           | Atualiza atividade            | ✅   |
| DELETE | /api/atividades/:id           | Remove atividade              | ✅   |
| GET    | /api/atividades/rendimento    | Médias por matéria (gráfico)  | ✅   |

**Filtros disponíveis:**
```
GET /api/atividades?materia_id=1&tipo=prova&status=pendente
```

**POST/PUT - Body:**
```json
{
  "titulo": "Prova P1",
  "descricao": "Capítulos 1 a 5",
  "tipo": "prova",
  "status": "pendente",
  "prazo": "2025-06-10T14:00:00",
  "materia_id": 1,
  "nota": 8.5
}
```
> tipos: `prova | trabalho | exercicio | outro`  
> status: `pendente | em_andamento | concluida`

---

### Lembretes
| Método | Rota                          | Descrição                  | Auth |
|--------|-------------------------------|----------------------------|------|
| GET    | /api/lembretes                | Lista lembretes            | ✅   |
| POST   | /api/lembretes                | Cria lembrete              | ✅   |
| PATCH  | /api/lembretes/:id/concluir   | Marca como concluído       | ✅   |
| DELETE | /api/lembretes/:id            | Remove lembrete            | ✅   |

**POST - Body:**
```json
{ "titulo": "Entregar TCC", "descricao": "Capítulo 3", "data_hora": "2025-06-15T23:59:00" }
```

---

### Pomodoro
| Método | Rota                         | Descrição                        | Auth |
|--------|------------------------------|----------------------------------|------|
| GET    | /api/pomodoro                | Histórico de sessões             | ✅   |
| POST   | /api/pomodoro                | Inicia sessão                    | ✅   |
| PATCH  | /api/pomodoro/:id/concluir   | Finaliza sessão                  | ✅   |
| GET    | /api/pomodoro/resumo         | Total de minutos por matéria     | ✅   |

**POST - Body:**
```json
{ "materia_id": 1, "duracao_minutos": 25, "tipo": "foco" }
```
> tipos: `foco | pausa_curta | pausa_longa`

---

### Calendário (Tela Inicial)
| Método | Rota                      | Descrição                                    | Auth |
|--------|---------------------------|----------------------------------------------|------|
| GET    | /api/calendario/hoje      | Atividades e lembretes de hoje (widget)      | ✅   |
| GET    | /api/calendario/proximos  | Próximos X dias (default: 7 dias)            | ✅   |
| GET    | /api/calendario           | Mês inteiro agrupado por data                | ✅   |

**GET /calendario/hoje - Resposta:**
```json
{
  "data": "2025-06-10",
  "atividades": [
    {
      "id": 1,
      "titulo": "Prova P1",
      "tipo": "prova",
      "status": "pendente",
      "prazo": "2025-06-10T14:00:00",
      "materia_nome": "Cálculo I",
      "materia_cor": "#f59e0b",
      "tipo_evento": "atividade"
    }
  ],
  "lembretes": [
    {
      "id": 1,
      "titulo": "Entregar TCC",
      "data_hora": "2025-06-10T23:59:00",
      "concluido": false,
      "tipo_evento": "lembrete"
    }
  ],
  "resumo": {
    "total": 3,
    "concluidas": 1,
    "pendentes": 1,
    "em_andamento": 1
  }
}
```

**GET /calendario/proximos?dias=7 - Resposta:**
```json
{
  "dias": 7,
  "dataAtual": "2025-06-10",
  "eventos": [
    {
      "id": 1,
      "titulo": "Prova P1",
      "tipo": "prova",
      "status": "pendente",
      "prazo": "2025-06-10T14:00:00",
      "materia_nome": "Cálculo I",
      "materia_cor": "#f59e0b",
      "tipo_evento": "atividade"
    },
    {
      "id": 1,
      "titulo": "Entregar TCC",
      "data_hora": "2025-06-11T23:59:00",
      "concluido": false,
      "tipo_evento": "lembrete"
    }
  ]
}
```

**GET /calendario?mes=6&ano=2025 - Resposta:**
```json
{
  "mes": 6,
  "ano": 2025,
  "eventos": {
    "2025-06-10": [
      {
        "id": 1,
        "titulo": "Prova P1",
        "tipo": "prova",
        "status": "pendente",
        "prazo": "2025-06-10T14:00:00",
        "materia_nome": "Cálculo I",
        "materia_cor": "#f59e0b",
        "tipo_evento": "atividade"
      }
    ],
    "2025-06-15": [
      {
        "id": 2,
        "titulo": "Trabalho de BD",
        "tipo": "trabalho",
        "status": "em_andamento",
        "prazo": "2025-06-15T18:00:00",
        "materia_nome": "Banco de Dados",
        "materia_cor": "#8b5cf6",
        "tipo_evento": "atividade"
      }
    ]
  }
}
```

---

## 🏗️ Arquitetura

### Tratamento de Erros Centralizado

Em vez de repetir `try/catch` em todo controller, use:

```javascript
const ApiError = require('../utils/ApiError');

async function criar(req, res, next) {
  try {
    if (!req.body.titulo) throw new ApiError('Título obrigatório', 400);
    
    const [result] = await db.query(...);
    return res.json(result);
  } catch (err) {
    next(err);  // Middleware trata automaticamente
  }
}
```

**Leia:** `GUIA_ERROS_E_AMBIENTE.md`

### Configuração por Ambiente

Arquivo: `src/config/environment.js`

```bash
# Desenvolvimento
NODE_ENV=development npm run dev

# Produção
NODE_ENV=production npm start
```

**Configurações diferentes:**
- Database (localhost vs servidor)
- CORS (liberado vs restrito)
- Logs (detalhados vs mínimos)
- JWT Secret (obrigatório em prod)

## 🗂️ Estrutura do projeto

```
academic-api/
├── src/
│   ├── config/
│   │   ├── database.js          # Conexão MySQL
│   │   └── environment.js       # Config por ambiente
│   ├── controllers/
│   │   ├── authController.js    # Registro, login, tokens
│   │   ├── materiasController.js
│   │   ├── atividadesController.js
│   │   ├── lembretesController.js
│   │   ├── pomodoroController.js
│   │   └── calendarioController.js
│   ├── middlewares/
│   │   ├── auth.js              # Middleware JWT
│   │   └── errorHandler.js      # Tratamento global de erros
│   ├── services/
│   │   └── jwtService.js        # ⭐ Serviço JWT centralizado
│   ├── utils/
│   │   └── ApiError.js          # Classe de erro customizada
│   ├── routes/
│   │   └── index.js             # Todas as rotas
│   └── server.js                # Entrada da aplicação
├── database.sql                 # Script MySQL
├── test-jwt.js                  # Testes com Node.js
├── test-jwt.sh                  # Testes com cURL
├── .env.example
├── package.json
├── README.md
├── JWT_COMPLETO.md              # 📖 Documentação JWT
├── GUIA_ERROS_E_AMBIENTE.md
└── .gitignore
```
