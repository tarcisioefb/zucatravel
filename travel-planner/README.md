# ZucaTravel ✈️

Planejador de viagens com inteligência artificial, usando modelos do **OpenCode Go**.

Converse em linguagem natural para descobrir destinos, comparar épocas, calcular orçamentos e montar roteiros completos.

## Funcionalidades

- **Chat com IA** — conversa natural com modelo DeepSeek V4 Flash via OpenCode Go
- **Busca web** — pesquisa preços reais de passagens, hotéis e atrações (via Tavily)
- **Orçamento detalhado** — calcula custo total com passagem, hospedagem, alimentação, passeios e transporte
- **Roteiro dia a dia** — sugere roteiros personalizados baseados no destino e interesses
- **Memória persistente** — o assistente lembra suas preferências entre sessões
- **Autenticação** — login e cadastro com senha criptografada
- **BYOK (Bring Your Own Key)** — use sua própria chave do OpenCode Go

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Frontend | React, Tailwind CSS |
| Banco | SQLite via Prisma |
| Autenticação | NextAuth v5 |
| IA | OpenCode Go (API compatível com OpenAI) |
| Busca web | Tavily (opcional) |

## Pré-requisitos

- Node.js >= 20.9.0
- Assinatura do [OpenCode Go](https://opencode.ai/auth) (US$ 10/mês)

## Configuração

```bash
# Clone o repositório
git clone https://github.com/tarcisioefb/zucatravel.git
cd zucatravel

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
OPENCODE_GO_KEY=sk-sua-chave-do-opencode-go
TAVILY_API_KEY=sua-chave-tavily  # opcional, cadastre em tavily.com
AUTH_SECRET=um-segredo-aleatorio  # gere com: openssl rand -base64 32
```

```bash
# Rode em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## Deploy na Hostinger

1. No hPanel → **Avançado → Node.js**, crie uma aplicação:
   - Caminho: `travel-planner` (ou nome da pasta)
   - Entry point: `npm start`
   - Modo: `production`

2. Conecte o repositório via Git no hPanel

3. Configure as variáveis de ambiente:
   ```
   OPENCODE_GO_KEY=sk-sua-chave
   TAVILY_API_KEY=sk-sua-chave-tavily
   AUTH_SECRET=seu-segredo
   DATABASE_URL=file:./dev.db
   ```

4. Faça o deploy — o `postinstall` cria o banco automaticamente

## API

O app expõe endpoints para gerenciar memórias do usuário:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/memories` | Lista memórias do usuário |
| `POST` | `/api/memories` | Salva uma memória (`{ key, value }`) |
| `DELETE` | `/api/memories` | Remove uma memória (`{ key }`) |

## Licença

MIT
