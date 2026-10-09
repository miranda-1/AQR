# Identidade visual: decisões e pontos para validação institucional

Este documento registra como o Manual da Marca PREFCG foi aplicado ao AQR e as situações que **o manual não prevê** para aplicações web. Pelo próprio manual (p. 31), casos não previstos dependem de aprovação da Diretoria Executiva de Comunicação Social.

## Fontes analisadas

| Documento | Conteúdo relevante |
|---|---|
| Manual da Marca PREFCG (31 p.) | Paleta, fontes, versões negativas, 10 aplicações incorretas, composição com secretarias (impresso e redes sociais), hierarquia de marcas, orientações complementares |
| SEMADES – Marca e Slogan 2026 | Marca SEMADES (com e sem descrição), slogan e PREFCG, nas versões colorida, azul e amarela |
| SEMADES – Logo 2025 | Composição SEMADES + PREFCG pronta, nas versões colorida, azul, amarela e branca |
| Brasão Prefeitura Campo Grande | Identidade anterior (brasão + "Prefeitura de Campo Grande", azul-marinho) |

## Decisões aplicadas

1. **Marca:** apenas PREFCG, na versão monocromática azul sobre branco, em versão digital (sem "Siga @prefcg"). Procedência em `src/assets/brand/README.md`.
2. **Cor da marca:** `#283587`, conforme o manual. O arquivo 2026 traz azuis ligeiramente diferentes entre si.
3. **SEMADES:** aparece apenas como texto no rodapé (sigla e nome completo), não como marca gráfica.
4. **Paleta da interface:**
   - Azul `#283587` como cor principal.
   - Amarelo `#FFCC00`: usado apenas como destaque dentro do símbolo do AQR. Ele nunca deve ser usado em texto ou foco, porque sobre branco o contraste é de 1,5:1.
   - Branco predominante.
   - Tons neutros e de estado são de apoio e estão em `src/styles/tokens.css`.
5. **Tipografia da interface:** Plus Jakarta Sans (licença SIL OFL, hospedada no próprio projeto). As fontes da marca (Gunterz, Qanelas, Goldplay) **não** são usadas como fontes web:
   - A Gunterz embutida no manual está identificada como `FONTSPRINGDEMO`, ou seja, licença de demonstração.
   - Qanelas e Goldplay são comerciais, e a licença para uso web não foi confirmada.
6. **Cores das diferenças:** verde (adição), vermelho (exclusão) e âmbar (modificação). O âmbar foi escolhido distinto do amarelo institucional para não confundir marca com estado. Cor nunca é o único indicador: sempre há ícone, rótulo e tratamento do texto (sublinhado, riscado ou sublinhado tracejado).

## Pontos que precisam de validação

| # | Situação | O que foi feito | Por que validar |
|---|---|---|---|
| 1 | Aplicação web/sistema | O manual trata de impresso, redes sociais e sinalização, mas não de interfaces | Caso não previsto (p. 31) |
| 2 | Tamanho mínimo digital | Marca com 30 px de altura (24 px no celular) | O manual define mínimos apenas em centímetros, para impresso |
| 3 | Posição da marca | PREFCG alinhada à direita da barra superior. À esquerda ficam o menu "Ferramentas" e "AQR" em texto | O manual não prevê marca junto a nome de sistema nem a posição em interfaces |
| 4 | Ajuste de cor | Preenchimentos do SVG unificados em `#283587` | Divergência entre o arquivo 2026 e o manual |
| 5 | Marca SEMADES omitida | Sigla e nome apenas em texto | Confirmar se a Comunicação aceita a ausência da marca da secretaria em sistemas |
| 6 | Barra superior de sistema interno | Barra branca de 56 px, separada do conteúdo por sombra suave (sem linhas divisórias) | Composição da marca com elementos de navegação não prevista no manual |
| 7 | Logo e favicon do AQR | Logo "Lente Q" (Proposta 3) na barra superior; o símbolo da lente é o favicon. Ver `src/assets/aqr/README.md` | Identidade própria de sistema ao lado da marca PREFCG |
| 8 | Fontes oficiais | Substituídas na interface | Confirmar se há licença web da Qanelas, o que permitiria usá-la nos títulos |
| 9 | Arquivos oficiais | A extração foi feita a partir dos PDFs | O manual (p. 31) informa que as pastas recebem `.AI`, `.PDF` e `.PNG`. Se houver SVG ou AI oficial da versão digital azul, ele deve substituir o arquivo extraído |
| 10 | Ilustrações da página inicial | Desenhos próprios em SVG (documentos, feixe de comparação, lupa, indicadores), só com as cores dos tokens. O amarelo `#FFCC00` aparece apenas como detalhe decorativo (traço acima de "Ferramentas AQR" e ponto central do feixe) | Elementos gráficos de interface não previstos no manual |
