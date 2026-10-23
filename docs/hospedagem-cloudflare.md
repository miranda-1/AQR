# Hospedagem na Cloudflare

Guia para publicar a branch `master` (só a comparação de PDFs, login fictício `admin`/`admin`).

## Como fica

```
navegador ──► Cloudflare (Worker "aqr")
                ├─ /, /comparacao, …  → arquivos estáticos do site (dist/, gerado por npm run build)
                └─ /api/*             → contêiner com o servidor de comparação (Dockerfile da raiz)
```

- **Site:** servido direto pelos arquivos estáticos da Cloudflare (sem custo por pedido). Endereços como `/comparacao` devolvem o `index.html` (SPA).
- **Comparação:** o servidor Node.js (Fastify, pdf.js, canvas, OCR local) precisa de um processo de verdade, então roda em **Cloudflare Containers**, a partir do `Dockerfile` da raiz. Ele não cabe num Worker comum nem no Cloudflare Pages.
- **Uma instância só** (`max_instances: 1`): as tarefas de comparação ficam na memória do servidor, então o envio e as consultas ao andamento precisam chegar ao mesmo contêiner.
- **Dorme sem uso:** depois de 15 min sem pedidos, o contêiner para (e para de custar). A primeira comparação depois disso espera alguns segundos a mais, enquanto ele acorda.
- Arquivos: `cloudflare/wrangler.jsonc` (configuração), `cloudflare/src/index.ts` (Worker e contêiner), `Dockerfile` e `.dockerignore`.

## Antes de publicar

1. **Plano pago dos Workers** (Workers Paid, US$ 5/mês): o Containers não existe no plano gratuito. O uso do contêiner (CPU, memória e tempo ligado) é cobrado à parte, por consumo. A instância escolhida é a `standard-1` (4 GiB), para duas comparações ao mesmo tempo, de até 768 MB cada.
2. **Docker** instalado e aberto no computador que publica: o `wrangler` constrói a imagem localmente e envia para a Cloudflare.
3. Conta na Cloudflare e login no `wrangler` (abre o navegador):
   ```bash
   cd cloudflare
   npm install
   npx wrangler login
   ```

## Publicar

```bash
cd cloudflare
npm run deploy      # gera o site (npm run build na raiz), constrói a imagem e publica
```

O endereço sai no fim do comando (`https://aqr.<sua-conta>.workers.dev`). Na primeira vez, o contêiner leva alguns minutos para ficar disponível. Domínio próprio: painel da Cloudflare → Workers → `aqr` → Settings → Domains & Routes.

Testar no computador antes de publicar (precisa do Docker):

```bash
npm run build       # na raiz
cd cloudflare && npm run dev    # http://localhost:8787
```

## Limites e cuidados

- **Tamanho do envio:** a Cloudflare aceita até 100 MB por pedido nos planos Free e Pro. O AQR aceita até 50 MB por PDF, então dois PDFs no limite (100 MB juntos) podem ser recusados pela Cloudflare. Na prática, requerimentos ficam bem abaixo disso.
- **O login não protege nada:** `admin`/`admin` é conferido no navegador e está no código do site. A API de comparação fica aberta para quem souber o endereço. Para restringir o acesso de verdade sem mexer no código, use o **Cloudflare Access** (Zero Trust, gratuito até 50 pessoas): painel → Zero Trust → Access → Applications → proteger o domínio do AQR, liberando só os e-mails escolhidos.
- **Nada fica guardado:** os PDFs e os resultados vivem só na memória do contêiner e são descartados depois de entregues (ou 5 min depois de prontos). Reiniciar ou adormecer o contêiner apaga as comparações em andamento.
- **Login real e administração** (Keycloak, banco SQLite) estão só na branch `dev`. Quando forem para produção, vão precisar de outro desenho de hospedagem (banco persistente e o Keycloak); ver `docs/login-keycloak.md` na `dev`.

## Outra hospedagem para o servidor

O `Dockerfile` serve em qualquer lugar que rode contêineres (VPS, Fly.io, Render…). Nesse caso, o site pode ficar no Cloudflare Pages ou Workers (pasta `dist/`), mas os pedidos a `/api/*` precisam chegar ao servidor **pela mesma origem** do site (por um proxy ou uma rota), porque o servidor não libera CORS.

```bash
docker build -t aqr-comparador .
docker run -p 3000:3000 aqr-comparador     # http://localhost:3000/api/health
```
