# GreenHerb

Plataforma web de gestão inteligente de uma estufa de ervas aromáticas. Permite registar e consultar planos de cultivo (regulares, de emergência e pontuais), gerir lotes, tarefas operacionais e medições ambientais, com autenticação por perfis (Técnico, Responsável, Administrador), geração automática de alertas e suporte a utilização offline.

## Requisitos

- Node.js v18+
- MongoDB v8+ (local na porta 27017)
- npx (incluído com npm)

## Instalação e execução

### 1. Backend

```bash
cd backend
npm install
node seed.js
node server.js
```

Servidor disponível em http://localhost:5000

### 2. Frontend

```bash
cd frontend
npx serve -l 3000 .
```

Aplicação disponível em http://localhost:3000

## Credenciais de demonstração

| Perfil | Email | Password |
|--------|-------|----------|
| Administrador | admin@greenherb.local | admin123 |
| Responsável | responsavel@greenherb.local | responsavel123 |
| Técnico | tecnico@greenherb.local | tecnico123 |

## Variáveis de ambiente

Copia `backend/.env.example` para `backend/.env` e ajusta os valores se necessário.

| Variável | Valor padrão | Descrição |
|----------|-------------|-----------|
| PORT | 5000 | Porta do servidor Express |
| MONGODB_URI | mongodb://127.0.0.1:27017/greenherb | Ligação ao MongoDB |
| JWT_SECRET | greenherb_secret_dev | Segredo para assinar tokens JWT |
| JWT_EXPIRES_IN | 8h | Validade do token JWT |
| CORS_ORIGIN | * | Origens permitidas (usar * em desenvolvimento) |

## Importação de ervas aromáticas (CSV)

Existe um ficheiro de demonstração em `frontend/dados/ervas-exemplo.csv` que pode ser importado na vista de Relatórios ou via API:

```
POST http://localhost:5000/api/ervas/importar
Content-Type: multipart/form-data
Authorization: Bearer <token-admin>
Campo: ficheiro = ervas-exemplo.csv
```

## Documentação da API

Ficheiro: `backend/docs/openapi.yaml` (OpenAPI 3.0.3)

Pode ser visualizado em https://editor.swagger.io importando o ficheiro.

## Arquitetura de armazenamento no browser

Documento: `frontend/ARQUITETURA-BROWSER.md`

Descreve os mecanismos utilizados (localStorage, IndexedDB, Cache API e Service Worker) com justificações, políticas de expiração e comportamento offline.

## Tecnologias

### Frontend
- HTML, CSS, JavaScript puro (SPA com router por hash)
- IndexedDB (dados estruturados offline)
- localStorage (preferências de UI e token JWT)
- Cache API + Service Worker (suporte offline completo)
- Tipografia: Inter + IBM Plex Mono

### Backend
- Node.js + Express
- Mongoose + MongoDB
- JWT (autenticação)
- bcrypt (hash de passwords)
- multer + xlsx (importação de ficheiros)
- OpenAPI 3.0.3 (documentação da API)

## Estrutura do repositório

```
greenherb/
├── frontend/          # SPA em HTML/CSS/JS
│   ├── index.html
│   ├── sw.js          # Service Worker
│   ├── manifest.json
│   ├── css/
│   ├── js/
│   │   ├── app.js
│   │   ├── views/
│   │   ├── storage/
│   │   └── api/
│   ├── dados/
│   │   └── ervas-exemplo.csv
│   └── ARQUITETURA-BROWSER.md
└── backend/           # API REST Node.js
    ├── server.js
    ├── seed.js
    ├── models/
    ├── routes/
    ├── middleware/
    └── docs/
        └── openapi.yaml
```
