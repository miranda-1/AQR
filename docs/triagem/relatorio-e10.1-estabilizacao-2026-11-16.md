# Estabilização final da E10 (E10.1)

**Data:** 16/11/2026 · **Branch:** `dev` · **Push:** só o da E10 (`cedb842..9d1487c`). Os commits da estabilização estão **só locais**, aguardando autorização.

Resolve os quatro pontos de qualidade deixados pela E10 (relatório da E10, seção 10, itens 4, 5 e 6, e a captura 17).

## 1. Histórico de revisão depois do reprocessamento

**Problema:** a revisão humana é presa à análise. Depois de reprocessar, um achado já revisado voltava a aparecer só como "a revisar", sem relação visível com a decisão anterior.

**Solução:**

- Cada avaliação da API traz `historicoRevisao`: a revisão mais recente da mesma regra numa análise anterior, comparada com a avaliação atual.
- A comparação (`server/triage/store/correspondencia.ts`) considera versão da regra, resultado, tipo do achado, condições pendentes, evidências (anexo, hash, página, trecho, região), valores comparados e texto do achado.
- **Equivalente:** nada disso mudou. A tela mostra a decisão anterior e oferece **"Manter a decisão anterior"**. Isso é uma **revisão nova**, feita pela pessoa, com autor e data, vinculada à original (`base_revisao_id`, migração 0009). O servidor só aceita o vínculo se a decisão for a mesma e o achado continuar idêntico.
- **Modificado:** a tela diz o que mudou, avisa que a decisão anterior não vale para o resultado atual e pede revisão nova. Se alguém tentar manter a decisão mesmo assim, recebe 409 `ACHADO_MODIFICADO`.
- **Nada é transportado sozinho.** A análise nova continua "aguardando revisão" até a pessoa agir. Análises e revisões antigas não mudam, e as tabelas continuam só de inserção.

**Testes:**

- **Serviço:** achado equivalente com decisão mantida; revisões da análise 1 intactas; decisão diferente recusada como "mantida"; achado que continua achado com outros valores recusado.
- **Rota real:** histórico na API; análise 1 sem histórico; vínculo gravado.
- **Interface:** equivalente com o botão, modificado sem o botão, administrador só vê.

## 2. Acessibilidade (WCAG 2.5.3, rótulo no nome)

**Problema:** no navegador real, o `axe` apontava que o nome acessível não continha o texto visível no link do logotipo, no botão da conta e nas opções da página inicial.

**Solução, sem mudança visual:**

- **Logotipo e conta:** um único texto oculto contém o que aparece ("AQR Análise e Qualificação de Requerimentos — página inicial"; "Conta de ana.analista"). As partes visíveis ficam `aria-hidden`.
- **Opções da página inicial:** o link envolve só o título e o selo ("Triagem documental Experimental"). A descrição sai do link e continua como `aria-describedby`. O cartão inteiro segue clicável pelo link esticado, e o foco aparece no cartão.

**Resultado:**

- `axe` no Chromium, em início, lista, envio, processo, painel de evidência e celular: **zero violações**, contraste incluído.
- O teste de regressão (`src/test/a11y.test.tsx`) roda a regra `label-content-name-mismatch` e **falha com a marcação antiga**.

## 3. Fontes padrão do pdf.js

**Problema:** PDFs com as fontes-base sem embutir (Helvetica, Times, Courier, Symbol) eram desenhados com fonte substituta, e o console avisava que faltava `standardFontDataUrl`.

**Solução:**

- `standard-fonts.ts` é uma `BinaryDataFactory` do pdf.js que entrega os 14 arquivos de `pdfjs-dist/standard_fonts`.
- O Vite os empacota com hash, na mesma origem (816 KB), e eles só são baixados quando um PDF pede.
- Não há CDN, nem dependência nova, nem fontes do sistema.
- Licenças: as dos próprios arquivos (`LICENSE_FOXIT` e `LICENSE_LIBERATION`, distribuídos com o `pdfjs-dist`).

**Validação:**

- **Testes unitários:** lista das fontes, carga da mesma origem e recusa de CMap, wasm e nomes desconhecidos.
- **No Chromium:** PDFs sintéticos com Helvetica, Helvetica-Bold, Times-Roman, Times-Italic, Courier, Courier-Bold e Symbol sem fonte embutida, e a ART sintética do corpus (Helvetica).
  - Nenhum aviso de fonte.
  - As fontes foram pedidas só à própria origem, sem nenhum pedido externo.
  - O desenho saiu certo (serifa, monoespaçada, letras gregas).
  - A comparação continua apontando as 5 diferenças.
  - O destaque da evidência continua alinhado (capturas 26 e 27).

## 4. Capturas

Todas as capturas de `docs/triagem/telas-e10/` foram **refeitas com banco limpo e o código atual**:

- 17: anexo isolado com o motivo em português.
- 23 e 24: revisão em análise anterior e decisão mantida.
- 26 e 27: fontes padrão.

Os resultados e as evidências mostrados são os que o sistema produziu. Nada foi ajustado para a documentação.

Auditoria no navegador repetida:

- nenhum erro de página;
- nenhuma URL de objeto pendente;
- 390 px no celular, sem rolagem lateral;
- nenhum botão de ação para o administrador;
- o único erro no console é o 409 provocado de propósito no teste de conflito.

## 5. Verificação

| Verificação | Resultado |
|---|---|
| `npm run lint` | sem avisos |
| `npm run typecheck` | sem erros |
| `npm test` | **78 arquivos, 700 testes passando, 4 pulados** (Ghostscript, como antes) |
| `npm run build` | ok |

**Testes antigos com expectativa ajustada,** por mudança intencional:

- O inventário de migrações (`migrate.test.ts`) passa a incluir a 0009.
- O nome do link do logotipo em `navigation.test.tsx` agora é "AQR Análise e Qualificação de Requerimentos — página inicial".

As respostas gravadas de teste ganharam `baseRevisaoId: null` nas revisões, como o servidor responde agora.

## 6. Commits (locais, sem push)

| Commit | Entrega |
|---|---|
| `e037a8f` | Histórico de revisão entre análises, sem transportar decisões |
| `eaf8f70` | Nome acessível com o texto visível (WCAG 2.5.3) |
| `33d8b7d` | Fontes padrão do pdf.js servidas pelo AQR |
| *(seguinte)* | Capturas refeitas, documentação e este relatório |
