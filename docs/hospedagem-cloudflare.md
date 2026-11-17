# Hospedagem na Cloudflare (grátis)

Guia para publicar a branch `master`: o site público, com o comparador real de PDFs rodando no navegador, sem login.

**No ar:** https://aqr.joaovictor10-miranda.workers.dev (publicado em 22/10/2026 pelo terminal, opção 2).

## Como fica

A `master` não tem servidor. O site é um conjunto de arquivos estáticos (`dist/`, gerado por `npm run build`), e a Cloudflare serve esses arquivos no **plano gratuito**, sem Worker e sem contêiner. Endereços como `/comparacao` devolvem o `index.html`, e o roteamento acontece no navegador (configurado em `wrangler.jsonc`, na raiz).

A comparação é **real e acontece no navegador** de quem usa: o motor de comparação (o mesmo do servidor da `dev`) roda num Web Worker, e os PDFs não saem do computador. Por isso não há servidor para hospedar nem custo por comparação, e nada da comparação passa pela Cloudflare. Os arquivos que o navegador baixa para comparar (o worker do motor, o do pdf.js e os do OCR em `/ocr/7.0.0/`: o worker e o núcleo WebAssembly do tesseract.js e o modelo de português) vêm do próprio site, sem CDN externa. O maior tem cerca de 3,9 MB; o site inteiro, cerca de 18 MB e 51 arquivos.

## Opção 1: publicar pelo GitHub (recomendada)

Cada `git push` na `master` publica o site sozinho.

1. Painel da Cloudflare → **Workers & Pages** → **Create** → **Import a repository**.
2. Conecte o GitHub e escolha o repositório `miranda-1/AQR` (privado; a Cloudflare pede acesso a ele).
3. Configure:
   - **Branch de produção:** `master`
   - **Comando de build:** `npm run build`
   - **Comando de deploy:** `npx wrangler deploy` (lê o `wrangler.jsonc` da raiz)
4. Salve. O primeiro deploy começa na hora; o endereço fica no formato `https://aqr.<sua-conta>.workers.dev`.

## Opção 2: publicar do seu computador

```bash
npm run build
npx wrangler login      # abre o navegador para entrar na conta da Cloudflare
npx wrangler deploy
```

O endereço aparece no fim do comando. Para publicar de novo, repita `npm run build` e `npx wrangler deploy`.

## Domínio e acesso

- **Domínio próprio:** painel → Workers & Pages → `aqr` → Settings → Domains & Routes.
- **Restringir quem vê:** o site é aberto, sem login (decisão de 17/11/2026). Se for preciso liberar só para pessoas escolhidas, use o **Cloudflare Access** (Zero Trust, gratuito até 50 pessoas): painel → Zero Trust → Access → Applications → proteger o endereço do AQR, liberando os e-mails escolhidos.

## Limites do plano gratuito

Sem servidor, nada aqui consome os limites de pedidos dos Workers: arquivos estáticos são servidos sem custo e sem limite de acessos. O limite que importa é de 20.000 arquivos e 25 MiB por arquivo; o AQR tem 51 arquivos, e o maior tem cerca de 3,9 MB. Como a comparação roda no computador de quem usa, ela também não gera custo nem pode ser usada para sobrecarregar um servidor.

## Comparação real sem servidor

Decisão de 17/11/2026: entre um servidor de comparação no Cloudflare Containers (pago, ~US$ 5/mês + uso), uma VM gratuita da Oracle Cloud e o motor no navegador, o responsável escolheu o navegador. Consequências:

- **Privacidade:** os PDFs nunca são enviados; não há registro, fila nem armazenamento de comparações.
- **Abuso:** não há operação pesada exposta na internet; cada visitante usa o próprio processador. Por isso não há limite de requisições nem CORS a configurar.
- **Desempenho:** depende do computador de quem compara. O tempo máximo é de 3 minutos; OCR e comparação visual param em 75% dele e marcam o restante como não analisado, como no servidor.
- **Atualizações do motor:** mudanças nascem na `dev` e vêm para a `master` com `git checkout dev -- <arquivos>` (lista no `docs/CONTEXTO.md`, Histórico de 17/11/2026), seguidas de `npm test` e de um novo deploy.

Se um dia for preciso comparar no servidor (documentos grandes demais para o navegador, por exemplo), as opções continuam as de cima, e a `dev` já tem o servidor pronto.
