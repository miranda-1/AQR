# Avaliação do comparador no corpus sintético

Gerado por `npm run avaliar:corpus` em 2026-10-16. Critérios em `server/comparison/evaluation/evaluate.ts`.

## Por categoria

| Categoria | Casos | Casos sem problema | Esperadas | Encontradas | Omitidas | Classificação errada | Localização errada | Falsas | Toleradas | Tempo médio |
|---|---|---|---|---|---|---|---|---|---|---|
| negativo | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 182 ms |
| texto | 14 | 14 | 18 | 18 | 0 | 0 | 0 | 0 | 0 | 242 ms |
| imagem | 7 | 7 | 7 | 7 | 0 | 0 | 0 | 0 | 0 | 138 ms |
| aparência | 5 | 5 | 5 | 5 | 0 | 0 | 0 | 0 | 4 | 137 ms |
| estrutura | 8 | 8 | 9 | 9 | 0 | 0 | 0 | 0 | 3 | 108 ms |
| digitalizado | 7 | 7 | 6 | 6 | 0 | 0 | 0 | 0 | 1 | 3176 ms |
| entrada | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 ms |

## Por caso

| Caso | Categoria | Situação da análise | Resultado | Tempo |
|---|---|---|---|---|
| 01-identicos PDFs idênticos | negativo | complete | ok | 340 ms |
| 02-palavra-modificada Uma palavra modificada | texto | complete | ok | 175 ms |
| 03-palavra-adicionada Uma palavra adicionada | texto | complete | ok | 158 ms |
| 04-palavra-removida Uma palavra removida | texto | complete | ok | 180 ms |
| 05-paragrafo-inserido Parágrafo inserido (o texto abaixo desce) | texto | complete | ok | 165 ms |
| 06-paragrafo-removido Parágrafo removido | texto | complete | ok | 157 ms |
| 07-paragrafo-movido Parágrafo movido | texto | complete | ok | 165 ms |
| 08-numero-alterado Número alterado | texto | complete | ok | 156 ms |
| 09-data-alterada Data alterada | texto | complete | ok | 131 ms |
| 10-valor-monetario Valor monetário alterado | texto | complete | ok | 176 ms |
| 11-imagem-adicionada Imagem adicionada | imagem | complete | ok | 149 ms |
| 12-imagem-removida Imagem removida | imagem | complete | ok | 142 ms |
| 13-imagem-substituida Imagem substituída | imagem | complete | ok | 145 ms |
| 14-imagem-redimensionada Imagem redimensionada | imagem | complete | ok | 138 ms |
| 15-imagem-reposicionada Imagem reposicionada | imagem | complete | ok | 147 ms |
| 16-figura-vetorial Figura vetorial adicionada | imagem | complete | ok | 125 ms |
| 17-mudanca-de-fonte Mudança de fonte num parágrafo | aparência | complete | ok | 139 ms |
| 18-mudanca-de-tamanho Mudança do tamanho do título | aparência | complete | ok | 131 ms |
| 19-mudanca-de-cor Mudança de cor de um parágrafo | aparência | complete | ok | 139 ms |
| 20-mudanca-de-margens Mudança de margens (todo o texto deslocado) | aparência | complete | ok | 148 ms |
| 21-pagina-adicionada Página adicionada no meio | estrutura | complete | ok | 55 ms |
| 22-pagina-removida Página removida | estrutura | complete | ok | 43 ms |
| 23-paginas-reorganizadas Páginas reorganizadas (2 e 3 trocadas) | estrutura | complete | ok | 44 ms |
| 24-tabela Tabela com uma célula alterada | texto | complete | ok | 115 ms |
| 25-multiplas-colunas Duas colunas desenhadas linha a linha | texto | complete | ok | 119 ms |
| 26-digitalizado PDF digitalizado com um número alterado | digitalizado | with-caveats | ok | 2319 ms |
| 27-misto PDF misto: página de texto e página digitalizada | digitalizado | with-caveats | ok | 2324 ms |
| 28-pagina-rotacionada Página rotacionada com uma palavra alterada | estrutura | complete | ok | 100 ms |
| 29-cabecalho-rodape Cabeçalho e rodapé repetidos; página incluída muda a numeração | estrutura | complete | ok | 480 ms |
| 30-documento-extenso Documento extenso (60 páginas, duas alterações) | texto | complete | ok | 1377 ms |
| 31-corrompido PDF corrompido | entrada | falha esperada | ok | 13 ms |
| 32-protegido-por-senha PDF protegido por senha | entrada | falha esperada | ok | 1 ms |
| 33-gerado-de-outra-forma Visualmente iguais, gerados de formas diferentes | negativo | complete | ok | 127 ms |
| 34-texto-reposicionado Mesmo texto em outra posição da página | aparência | complete | ok | 128 ms |
| 35-quase-imperceptivel Ponto trocado por vírgula; hífen trocado por travessão | texto | complete | ok | 152 ms |
| 36-fontes-incorporadas Helvetica padrão × Liberation Sans incorporada (mesmas métricas) | negativo | complete | ok | 125 ms |
| 37-compressao-de-imagem Mesma imagem em PNG e em JPEG | negativo | complete | ok | 136 ms |
| 38-paginas-repetidas Página repetida removida | estrutura | with-caveats | ok | 58 ms |
| 39-elementos-sobrepostos Carimbo sobreposto ao texto | imagem | complete | ok | 122 ms |
| 40-tabela-financeira Tabela financeira: dois valores alterados e uma linha incluída | texto | complete | ok | 156 ms |
| 41-digitalizado-com-ruido Digitalização com ruído e um valor alterado | digitalizado | with-caveats | ok | 2868 ms |
| 42-digitalizado-inclinado Digitalização inclinada (1,5°) com uma data alterada | digitalizado | with-caveats | ok | 2224 ms |
| 43-digitalizado-texto-pequeno Digitalização com texto pequeno (8 pt) e um número alterado | digitalizado | with-caveats | ok | 2521 ms |
| 44-assinatura-alterada Assinatura digitalizada diferente | digitalizado | with-caveats | ok | 2323 ms |
| 45-ilegivel Digitalização ilegível (desfocada e com muito ruído) | digitalizado | with-caveats | ok | 7655 ms |
| 46-pagina-no-inicio Página incluída no início | estrutura | complete | ok | 42 ms |
| 47-paginas-em-branco Página em branco incluída entre páginas em branco | estrutura | with-caveats | ok | 40 ms |

## Limitações conhecidas dos casos

- **42-digitalizado-inclinado**: Com a inclinação, a posição esperada da palavra não é calculada; só a página é conferida.
- **44-assinatura-alterada**: Assinaturas são comparadas como imagem; a autenticidade não é verificada.
