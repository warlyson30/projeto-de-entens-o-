

### 1. **POST /api/auth/registro**
Registra novo usuário

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "senha": "senha123"
  }'
```

**Response (201):**
```json
{
  "mensagem": "Usuário registrado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tipoToken": "Bearer",
    "expiracaoAccessTokenSegundos": 900
  }
}
```

---

### 2. **POST /api/auth/login**
Autentica usuário existente

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "senha": "senha123"
  }'
```

**Response (200):**
```json
{
  "mensagem": "Login realizado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tipoToken": "Bearer",
    "expiracaoAccessTokenSegundos": 900
  }
}
```

---

### 3. **POST /api/auth/renovar**


**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200):**
```json
{
  "mensagem": "Token renovado com sucesso",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tipoToken": "Bearer",
    "expiracaoAccessTokenSegundos": 900
  }
}
```

---

### 4. **GET /api/auth/perfil**


**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/perfil \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "criado_em": "2025-06-10T10:30:00.000Z"
  }
}
```

---

### 5. **GET /api/auth/info-token**


**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/info-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "token": {
    "usuarioId": 1,
    "tipo": "access",
    "expiraEm": "2025-06-10T11:15:00.000Z",
    "tempoRestanteMilisegundos": 350000,
    "estaValido": true
  }
}
```

---

### 6. **POST /api/auth/logout**
Realiza logout (opcional - o token continua válido até expirar)

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "mensagem": "Logout realizado com sucesso"
}
```

---

## 🛠️ Usando em Todos os Outros Endpoints

Qualquer rota protegida (matérias, atividades, etc) requer o header:

```bash
Authorization: Bearer <accessToken>
```

**Exemplo com cURL:**
```bash
curl -X GET http://localhost:3000/api/materias \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Exemplo com JavaScript/Fetch:**
```javascript
const response = await fetch('http://localhost:3000/api/materias', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Exemplo com Axios:**
```javascript
axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
// Todas as requisições usarão o header automaticamente
```

---

## 🏗️ Estrutura do JWT

### **Access Token**

```json
{
  "id": 1,
  "tipo": "access",
  "iat": 1623345600,
  "exp": 1623346500,
  "iss": "academic-api",
  "aud": "academic-app",
  "alg": "HS256"
}
```

- **id**: ID do usuário
- **tipo**: "access"
- **exp**: Data de expiração (15 minutos)
- **iss**: Emissor do token
- **aud**: Audiência (para qual app)

### **Refresh Token**

```json
{
  "id": 1,
  "tipo": "refresh",
  "iat": 1623345600,
  "exp": 1624209600,
  "iss": "academic-api",
  "aud": "academic-app",
  "alg": "HS256"
}
```

- **exp**: Data de expiração (7 dias)
- **tipo**: "refresh"

---

## 📱 Implementação no Front-End

### **React/React Native**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Após login
const { tokens } = loginResponse;
await AsyncStorage.setItem('accessToken', tokens.accessToken);
await AsyncStorage.setItem('refreshToken', tokens.refreshToken);

// Em toda requisição
const accessToken = await AsyncStorage.getItem('accessToken');
const response = await fetch('/api/materias', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Se receber 401 (token expirado)
const refreshToken = await AsyncStorage.getItem('refreshToken');
const newTokens = await fetch('/api/auth/renovar', {
  method: 'POST',
  body: JSON.stringify({ refreshToken })
});

await AsyncStorage.setItem('accessToken', newTokens.tokens.accessToken);
await AsyncStorage.setItem('refreshToken', newTokens.tokens.refreshToken);

// Tentar requisição novamente
```

---

## 🔒 Segurança

### ✅ O que está implementado:

1. **Access Token curto** (15 min) - menos tempo de exposição se roubado
2. **Refresh Token longo** (7 dias) - comodidade do usuário
3. **Algoritmo HS256** - padrão de indústria
4. **Validação de assinatura** - garante que token não foi alterado
5. **Validação de tipo** - access token não pode ser usado como refresh
6. **Issuer e Audience** - verifica origem e destino do token
7. **Bcryptjs** - senha com hash seguro

### ⚠️ Para máxima segurança em produção:

1. **Usar HTTPS** (não HTTP)
2. **Usar Refresh Token em HttpOnly Cookie** em vez de localStorage
3. **Implementar blacklist de tokens** com Redis
4. **Rate limiting** nas rotas de login
5. **2FA** (autenticação de dois fatores)
6. **CORS** restrito a apenas seus domínios

---

## 🧪 Testando o JWT

### Com Postman:

1. **Abra Postman** e vá a `File` → `New` → `Request`

2. **Registrar usuário:**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/registro`
   - Body (raw JSON):
   ```json
   {
     "nome": "Teste User",
     "email": "teste@email.com",
     "senha": "senha123"
   }
   ```

3. **Copiar o `accessToken`**

4. **Testar rota protegida:**
   - Method: GET
   - URL: `http://localhost:3000/api/materias`
   - Headers: 
     - Key: `Authorization`
     - Value: `Bearer <cola_aqui_o_token>`

5. **Ver expiração:**
   - Espere 15 minutos OU abra https://jwt.io e cole o token lá

6. **Renovar token:**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/renovar`
   - Body (raw JSON):
   ```json
   {
     "refreshToken": "<seu_refresh_token>"
   }
   ```

---

## 📚 Referências

- [JWT.io](https://jwt.io)
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken)
- [Bcryptjs npm](https://www.npmjs.com/package/bcryptjs)

---

## ✨ Resumo

| Aspecto | Detalhes |
|---------|----------|
| **Access Token** | 15 minutos |
| **Refresh Token** | 7 dias |
| **Algoritmo** | HS256 (HMAC SHA-256) |
| **Hash de Senha** | Bcryptjs (10 rounds) |
| **Segurança** | ✅ Assinatura verificada |
| **Validação** | ✅ Tipo, expiração, issuer |
| **Erro 401** | Token inválido ou expirado |

