# Deploy na Vercel

O repositório suporta duas hospedagens:

- Sites: Vinext + Cloudflare Workers + D1, com sala e regras no servidor atual.
- Vercel: Next.js nativo, com `/api/room` encaminhando os pedidos ao servidor atual. Ambos os endereços compartilham a mesma sala, inclusive resets e partidas. Nenhum banco adicional é necessário nesta configuração.

## Configuração

1. Envie este commit ao GitHub e importe o repositório na Vercel.
2. Framework Preset: **Next.js**. Root Directory: raiz do repositório.
3. Build Command: **npm run build:vercel**, definido também em `vercel.json`. Remova qualquer override antigo que use `npm run build` ou `vinext build`.
4. Output Directory: padrão do Next.js (`.next`), sem override para `dist`.
5. Node.js: **22.x**.
6. Faça o deploy do commit novo. Não refaça o deploy do commit antigo `eb15324`.

A variável de servidor opcional `KRON_ROOM_API_URL` troca o endereço completo da API autoritativa. O padrão é `https://kron-card-game-prototipo.nicelime36.chatgpt.site/api/room`. Não aponte para a própria API da Vercel, pois isso criaria um ciclo. Não é necessário configurar essa variável para usar a sala atual.

Essa configuração depende da disponibilidade do servidor original. Uma migração independente exigiria um banco persistente compatível com a Vercel e a transferência da API; não use arquivos locais ou memória de uma função serverless para guardar a partida.

## Verificação local

`npm run build:vercel` deve produzir `.next/routes-manifest.json`.

Para testar a API sem alterar a sala de produção, execute o preview Cloudflare local na porta 8787 e inicie `npm run start:vercel -- --port 3000` com `KRON_ROOM_API_URL=http://127.0.0.1:8787/api/room`. Os testes de integração aceitam `KRON_TEST_BASE_URL=http://127.0.0.1:3000/api/room` para usar essa ponte local.
