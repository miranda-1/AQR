# Hospedagem na Cloudflare (grátis)

Guia para publicar a branch `master`: só o frontend, com a comparação demonstrativa e o login fictício `admin`/`admin`.

## Como fica

A `master` não tem servidor. O site é um conjunto de arquivos estáticos (`dist/`, gerado por `npm run build`), e a Cloudflare serve esses arquivos no **plano gratuito**, sem Worker e sem contêiner. Endereços como `/comparacao` devolvem o `index.html`, e o roteamento acontece no navegador (configurado em `wrangler.jsonc`, na raiz).

Ao comparar, os PDFs escolhidos não saem do navegador: o resultado é o demonstrativo, com documentos e diferenças fictícios e o aviso "Demonstração com dados fictícios". A comparação real (servidor Node.js) fica na branch `dev` e não está hospedada.

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
- **Restringir quem vê:** o `admin`/`admin` não protege nada (os valores estão no código do site). Para liberar só para pessoas escolhidas, use o **Cloudflare Access** (Zero Trust, gratuito até 50 pessoas): painel → Zero Trust → Access → Applications → proteger o endereço do AQR, liberando os e-mails escolhidos.

## Limites do plano gratuito

Sem servidor, nada aqui consome os limites de pedidos dos Workers: arquivos estáticos são servidos sem custo e sem limite de acessos. O limite que importa é de 20.000 arquivos e 25 MiB por arquivo, e o AQR tem 16 arquivos.

## Quando a comparação real for para o ar

O servidor de comparação (branch `dev`) precisa de um processo Node.js com cerca de 1,5 GB de memória, o que não cabe no plano gratuito da Cloudflare. Opções levantadas em 22/10/2026: Cloudflare Containers (pago), uma VM gratuita da Oracle Cloud ou levar a comparação para o próprio navegador. Ver `docs/CONTEXTO.md` → Pendências.
