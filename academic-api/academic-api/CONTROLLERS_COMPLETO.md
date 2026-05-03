# 📚 Controllers Revisados e Completos

## Visão Geral

Este documento descreve todos os 6 controllers do projeto Academic API, completamente revisados e prontos para produção.

---

## 📋 Índice de Controllers

1. **authController** - Autenticação e JWT
2. **materiasController** - Gerenciamento de disciplinas
3. **atividadesController** - Gerenciamento de atividades (provas, trabalhos)
4. **lembretesController** - Gerenciamento de lembretes
5. **pomodoroController** - Sessões de estudo (Pomodoro)
6. **calendarioController** - Tela inicial com eventos

---

## 1️⃣ authController.REVISADO.js

### Responsabilidade
Gerenciar autenticação, registro, login e geração de JWT tokens.

### Funções

#### `registro(req, res, next)`
- **Rota**: `POST /api/auth/registro`
- **Validações**:
  - Email válido com padrão regex
  - Senha mínimo 6 caracteres
  - Nome mínimo 3 caracteres
  - Email único (não pode repetir)
- **Segurança**: Bcryptjs 10 rounds
- **Retorno**: User + access token + refresh token

#### `login(req, res, next)`
- **Rota**: `POST /api/auth/login`
- **Validações**:
  - Email e senha obrigatórios
  - Verificação com bcryptjs
- **Segurança**: Mensagem genérica se falhar (não revela se email existe)
- **Retorno**: User + tokens

#### `renovarToken(req, res, next)`
- **Rota**: `POST /api/auth/renovar`
- **Entrada**: Refresh token válido
- **Retorno**: Novo access token + novo refresh token
- **Uso**: Quando access token expirar (15 minutos)

#### `perfil(req, res, next)`
- **Rota**: `GET /api/auth/perfil`
- **Proteção**: Requer token JWT válido
- **Retorno**: Dados do usuário logado

#### `logout(req, res, next)`
- **Rota**: `POST /api/auth/logout`
- **Proteção**: Requer token JWT válido
- **Nota**: Token continua válido até expirar. Para revogação imediata, implemente Redis blacklist

#### `infoToken(req, res, next)`
- **Rota**: `GET /api/auth/info-token`
- **Proteção**: Requer token JWT válido
- **Retorno**: ID do usuário, tipo, expiração, tempo restante
- **Uso**: Debug e monitoramento

### Padrões de Validação
```javascript
// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) throw error;

// Cor (hex)
const corRegex = /^#[0-9A-F]{6}$/i;
if (!corRegex.test(cor)) throw error;

// ID
if (!id || isNaN(id)) throw error;
```

---

## 2️⃣ materiasController.REVISADO.js

### Responsabilidade
Gerenciar disciplinas/matérias do usuário.

### Funções

#### `listar(req, res, next)`
- **Rota**: `GET /api/materias`
- **Retorno**: Array de matérias ordenadas por nome
- **Paginação**: Nenhuma (geralmente poucas matérias)

#### `criar(req, res, next)`
- **Rota**: `POST /api/materias`
- **Body obrigatório**: `nome`
- **Body opcional**: `professor`, `cor`
- **Validações**:
  - Nome 2-100 caracteres
  - Cor em formato hex (#RRGGBB)
  - Cor padrão: #6366f1 (azul)
- **Retorno**: ID + dados da matéria criada

#### `atualizar(req, res, next)`
- **Rota**: `PUT /api/materias/:id`
- **Validações**:
  - Verifica se matéria pertence ao usuário
  - Mesmas validações de `criar()`
  - Pelo menos 1 campo deve ser enviado
- **Retorno**: Confirmação de sucesso

#### `remover(req, res, next)`
- **Rota**: `DELETE /api/materias/:id`
- **Validações**:
  - Verifica propriedade
- **Cascata**: Remove todas as atividades da matéria
- **Retorno**: Confirmação

### Exemplo de Request

```bash
# Criar matéria
POST /api/materias
{
  "nome": "Cálculo I",
  "professor": "Dr. Silva",
  "cor": "#f59e0b"
}

# Atualizar cor
PUT /api/materias/1
{
  "cor": "#8b5cf6"
}

# Listar
GET /api/materias
```

---

## 3️⃣ atividadesController.REVISADO.js

### Responsabilidade
Gerenciar atividades (provas, trabalhos, exercícios) com filtros.

### Funções

#### `listar(req, res, next)`
- **Rota**: `GET /api/atividades`
- **Filtros opcionais**:
  - `materia_id`: Filtrar por matéria
  - `tipo`: prova | trabalho | exercicio | outro
  - `status`: pendente | em_andamento | concluida
- **Ordenação**: Por prazo (próximas primeiro), depois por data de criação
- **Exemplo**: `GET /api/atividades?tipo=prova&status=pendente`

#### `buscarPorId(req, res, next)`
- **Rota**: `GET /api/atividades/:id`
- **Retorno**: Atividade completa com nome da matéria

#### `criar(req, res, next)`
- **Rota**: `POST /api/atividades`
- **Body obrigatório**: `titulo`
- **Body opcional**: `descricao`, `tipo`, `status`, `prazo`, `materia_id`, `nota`
- **Validações**:
  - Título 2-150 caracteres
  - Tipo: validação contra array TIPOS_VALIDOS
  - Status: validação contra array STATUS_VALIDOS
  - Data: formato ISO (2025-06-10T14:00:00)
  - Nota: 0-10
  - Matéria: verifica propriedade do usuário
- **Padrões**:
  - Tipo padrão: "outro"
  - Status padrão: "pendente"

#### `atualizar(req, res, next)`
- **Rota**: `PUT /api/atividades/:id`
- **Validações**: Mesmas de `criar()`
- **Requisito**: Pelo menos 1 campo para atualizar

#### `remover(req, res, next)`
- **Rota**: `DELETE /api/atividades/:id`
- **Validações**: Propriedade

#### `rendimento(req, res, next)`
- **Rota**: `GET /api/atividades/rendimento`
- **Retorno**: Estatísticas por matéria:
  - Nome da matéria
  - Total de atividades
  - Quantidade concluída
  - Média de notas
- **Uso**: Para gráficos de desempenho

### Exemplo de Request

```bash
# Criar prova
POST /api/atividades
{
  "titulo": "Prova P1",
  "descricao": "Capítulos 1-5",
  "tipo": "prova",
  "status": "pendente",
  "prazo": "2025-06-20T14:00:00",
  "materia_id": 1,
  "nota": null
}

# Listar com filtros
GET /api/atividades?materia_id=1&tipo=prova&status=pendente

# Obter rendimento
GET /api/atividades/rendimento
```

---

## 4️⃣ lembretesController.REVISADO.js

### Responsabilidade
Gerenciar lembretes com data/hora específica.

### Funções

#### `listar(req, res, next)`
- **Rota**: `GET /api/lembretes`
- **Ordenação**: Por data/hora (próximos primeiro)
- **Retorno**: Array de lembretes

#### `criar(req, res, next)`
- **Rota**: `POST /api/lembretes`
- **Body obrigatório**: `titulo`, `data_hora`
- **Body opcional**: `descricao`
- **Validações**:
  - Título 2-150 caracteres
  - Data não pode ser no passado
  - Formato ISO
- **Retorno**: ID + dados

#### `concluir(req, res, next)`
- **Rota**: `PATCH /api/lembretes/:id/concluir`
- **Validações**: Propriedade
- **Nota**: Se já concluído, apenas confirma
- **Retorno**: Confirmação

#### `remover(req, res, next)`
- **Rota**: `DELETE /api/lembretes/:id`
- **Validações**: Propriedade
- **Retorno**: Confirmação

### Exemplo de Request

```bash
# Criar lembrete
POST /api/lembretes
{
  "titulo": "Entregar TCC",
  "descricao": "Capítulo 3 faltando",
  "data_hora": "2025-06-15T23:59:00"
}

# Marcar como concluído
PATCH /api/lembretes/1/concluir

# Deletar
DELETE /api/lembretes/1
```

---

## 5️⃣ pomodoroController.REVISADO.js

### Responsabilidade
Gerenciar sessões Pomodoro (técnica de estudo).

### Funções

#### `listar(req, res, next)`
- **Rota**: `GET /api/pomodoro`
- **Limit**: Últimas 50 sessões
- **Ordenação**: Mais recentes primeiro
- **Retorno**: Array com `id`, `duracao_minutos`, `tipo`, `concluida`, `materia_nome`

#### `iniciar(req, res, next)`
- **Rota**: `POST /api/pomodoro`
- **Body opcional**:
  - `materia_id`: Qual matéria estudar
  - `duracao_minutos`: Duração (1-120 min, padrão: 25)
  - `tipo`: foco | pausa_curta | pausa_longa (padrão: foco)
- **Validações**:
  - Matéria pertence ao usuário
  - Duração 1-120 minutos
  - Tipo válido
- **Retorno**: ID da sessão

#### `concluir(req, res, next)`
- **Rota**: `PATCH /api/pomodoro/:id/concluir`
- **Validações**: Propriedade
- **Nota**: Se já concluído, apenas confirma
- **Retorno**: Confirmação

#### `resumo(req, res, next)`
- **Rota**: `GET /api/pomodoro/resumo`
- **Filtro**: Apenas sessões de FOCO concluídas
- **Retorno**: Total de minutos estudados por matéria
- **Uso**: Dashboard e estatísticas

### Tipos de Sessão

| Tipo | Duração Padrão | Uso |
|------|---------------|----|
| `foco` | 25 min | Estudo concentrado |
| `pausa_curta` | 5 min | Descanso breve |
| `pausa_longa` | 15 min | Descanso mais longo |

### Exemplo de Request

```bash
# Iniciar sessão de foco
POST /api/pomodoro
{
  "materia_id": 1,
  "duracao_minutos": 25,
  "tipo": "foco"
}

# Concluir sessão
PATCH /api/pomodoro/1/concluir

# Ver resumo (minutos por matéria)
GET /api/pomodoro/resumo
```

---

## 6️⃣ calendarioController.REVISADO.js

### Responsabilidade
Alimentar a tela inicial com eventos (atividades + lembretes).

### Funções

#### `obterHoje(req, res, next)`
- **Rota**: `GET /api/calendario/hoje`
- **Retorno**:
  ```json
  {
    "data": "2025-06-10",
    "atividades": [...],
    "lembretes": [...],
    "resumo": {
      "total": 3,
      "concluidas": 1,
      "pendentes": 1,
      "em_andamento": 1
    }
  }
  ```
- **Uso**: Widget do dia / Home screen

#### `obterProximos(req, res, next)`
- **Rota**: `GET /api/calendario/proximos`
- **Query**: `dias=7` (padrão: 7)
- **Filtro**: Apenas atividades pendentes/em_andamento + lembretes não concluídos
- **Retorno**: Array de eventos próximos, ordenados por data
- **Uso**: Timeline / Próximas tarefas

#### `obterMes(req, res, next)`
- **Rota**: `GET /api/calendario?mes=6&ano=2025`
- **Parâmetros obrigatórios**: `mes` (1-12), `ano` (2000-2100)
- **Retorno**:
  ```json
  {
    "mes": 6,
    "ano": 2025,
    "eventos": {
      "2025-06-10": [...],
      "2025-06-15": [...]
    }
  }
  ```
- **Uso**: Visualização de calendário full-month (tipo Google Calendar)

### Estrutura de Evento

```javascript
// Atividade
{
  "id": 1,
  "titulo": "Prova P1",
  "tipo": "prova",
  "status": "pendente",
  "prazo": "2025-06-10T14:00:00Z",
  "nota": null,
  "materia_nome": "Cálculo I",
  "materia_cor": "#f59e0b",
  "tipo_evento": "atividade"
}

// Lembrete
{
  "id": 1,
  "titulo": "Entregar TCC",
  "data_hora": "2025-06-15T23:59:00Z",
  "concluido": false,
  "tipo_evento": "lembrete"
}
```

---

## 🔒 Segurança em Todos os Controllers

### ✅ Implementado

1. **Validação de entrada**: Todos os campos validados (tipo, tamanho, formato)
2. **Sanitização**: `trim()` em strings, parsing seguro de números
3. **Propriedade**: Verifica se recurso pertence ao usuário antes de modificar
4. **Errors padronizados**: `ApiError` com status codes apropriados
5. **Async/await**: Sem callbacks aninhados
6. **Try/catch**: Todos os erros capturados e passados ao middleware global
7. **SQL injection**: Usa parameterized queries sempre
8. **Rate limiting**: Implementar em produção (middleware externo)
9. **Autenticação**: JWT token obrigatório em rotas protegidas

### ⚠️ Considerações para Produção

- Adicionar logging detalhado
- Implementar rate limiting
- Adicionar monitoria de erros (Sentry)
- Implementar blacklist de tokens com Redis
- CORS restrito a domínios conhecidos
- HTTPS obrigatório
- Headers de segurança (helmet.js)

---

## 📝 Padrão de Código

Todos os controllers seguem o mesmo padrão:

```javascript
async function funcao(req, res, next) {
  try {
    // 1. Extrai dados
    const { campo } = req.body;
    
    // 2. Valida
    if (!campo) throw new ApiError('msg', 400);
    
    // 3. Consulta banco
    const [resultado] = await db.query(sql, [params]);
    
    // 4. Verifica resultado
    if (resultado.length === 0) throw new ApiError('Não encontrado', 404);
    
    // 5. Retorna
    return res.status(200).json(resultado);
    
  } catch (err) {
    next(err);  // Middleware de erro
  }
}
```

---

## ✨ Resumo

| Controller | Funções | Rotas | Tipo |
|------------|---------|-------|------|
| **auth** | 6 | 6 | Autenticação |
| **materias** | 4 | 4 | CRUD |
| **atividades** | 6 | 6 | CRUD + Filtros + Stats |
| **lembretes** | 4 | 4 | CRUD |
| **pomodoro** | 4 | 4 | CRUD + Stats |
| **calendario** | 3 | 3 | Read-only (Dashboard) |
| **TOTAL** | 27 | 27 funções | - |

Todos **revisados**, **testados** e **prontos para produção**. ✅

