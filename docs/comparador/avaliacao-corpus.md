# Avaliação do comparador no corpus sintético

Gerado por `npm run avaliar:corpus` em 2026-10-15. Critérios em `server/comparison/evaluation/evaluate.ts`.

## Por categoria

| Categoria | Casos | Casos sem problema | Esperadas | Encontradas | Omitidas | Classificação errada | Localização errada | Falsas | Toleradas | Tempo médio |
|---|---|---|---|---|---|---|---|---|---|---|
| negativo | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 147 ms |
| texto | 14 | 14 | 18 | 18 | 0 | 0 | 0 | 0 | 0 | 237 ms |
| imagem | 7 | 7 | 7 | 7 | 0 | 0 | 0 | 0 | 0 | 117 ms |
| aparência | 5 | 5 | 5 | 5 | 0 | 0 | 0 | 0 | 4 | 209 ms |
| estrutura | 8 | 8 | 9 | 9 | 0 | 0 | 0 | 0 | 3 | 66 ms |
| digitalizado | 7 | 7 | 6 | 6 | 0 | 0 | 0 | 0 | 1 | 3010 ms |
| entrada | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 ms |

## Por caso

| Caso | Categoria | Situação da análise | Resultado | Tempo |
|---|---|---|---|---|
| 01-identicos PDFs idênticos | negativo | complete | ok | 342 ms |
| 02-palavra-modificada Uma palavra modificada | texto | complete | ok | 149 ms |
| 03-palavra-adicionada Uma palavra adicionada | texto | complete | ok | 155 ms |
| 04-palavra-removida Uma palavra removida | texto | complete | ok | 139 ms |
| 05-paragrafo-inserido Parágrafo inserido (o texto abaixo desce) | texto | complete | ok | 391 ms |
| 06-paragrafo-removido Parágrafo removido | texto | complete | ok | 201 ms |
| 07-paragrafo-movido Parágrafo movido | texto | complete | ok | 361 ms |
| 08-numero-alterado Número alterado | texto | complete | ok | 84 ms |
| 09-data-alterada Data alterada | texto | complete | ok | 80 ms |
| 10-valor-monetario Valor monetário alterado | texto | complete | ok | 78 ms |
| 11-imagem-adicionada Imagem adicionada | imagem | complete | ok | 98 ms |
| 12-imagem-removida Imagem removida | imagem | complete | ok | 85 ms |
| 13-imagem-substituida Imagem substituída | imagem | complete | ok | 99 ms |
| 14-imagem-redimensionada Imagem redimensionada | imagem | complete | ok | 128 ms |
| 15-imagem-reposicionada Imagem reposicionada | imagem | complete | ok | 180 ms |
| 16-figura-vetorial Figura vetorial adicionada | imagem | complete | ok | 94 ms |
| 17-mudanca-de-fonte Mudança de fonte num parágrafo | aparência | complete | ok | 146 ms |
| 18-mudanca-de-tamanho Mudança do tamanho do título | aparência | complete | ok | 133 ms |
| 19-mudanca-de-cor Mudança de cor de um parágrafo | aparência | complete | ok | 114 ms |
| 20-mudanca-de-margens Mudança de margens (todo o texto deslocado) | aparência | complete | ok | 540 ms |
| 21-pagina-adicionada Página adicionada no meio | estrutura | complete | ok | 42 ms |
| 22-pagina-removida Página removida | estrutura | complete | ok | 43 ms |
| 23-paginas-reorganizadas Páginas reorganizadas (2 e 3 trocadas) | estrutura | complete | ok | 43 ms |
| 24-tabela Tabela com uma célula alterada | texto | complete | ok | 66 ms |
| 25-multiplas-colunas Duas colunas desenhadas linha a linha | texto | complete | ok | 68 ms |
| 26-digitalizado PDF digitalizado com um número alterado | digitalizado | with-caveats | ok | 2117 ms |
| 27-misto PDF misto: página de texto e página digitalizada | digitalizado | with-caveats | ok | 2174 ms |
| 28-pagina-rotacionada Página rotacionada com uma palavra alterada | estrutura | complete | ok | 70 ms |
| 29-cabecalho-rodape Cabeçalho e rodapé repetidos; página incluída muda a numeração | estrutura | complete | ok | 192 ms |
| 30-documento-extenso Documento extenso (60 páginas, duas alterações) | texto | complete | ok | 1319 ms |
| 31-corrompido PDF corrompido | entrada | falha esperada | ok | 12 ms |
| 32-protegido-por-senha PDF protegido por senha | entrada | falha esperada | ok | 1 ms |
| 33-gerado-de-outra-forma Visualmente iguais, gerados de formas diferentes | negativo | complete | ok | 84 ms |
| 34-texto-reposicionado Mesmo texto em outra posição da página | aparência | complete | ok | 112 ms |
| 35-quase-imperceptivel Ponto trocado por vírgula; hífen trocado por travessão | texto | complete | ok | 126 ms |
| 36-fontes-incorporadas Helvetica padrão × Liberation Sans incorporada (mesmas métricas) | negativo | complete | ok | 78 ms |
| 37-compressao-de-imagem Mesma imagem em PNG e em JPEG | negativo | complete | ok | 85 ms |
| 38-paginas-repetidas Página repetida removida | estrutura | with-caveats | ok | 53 ms |
| 39-elementos-sobrepostos Carimbo sobreposto ao texto | imagem | complete | ok | 136 ms |
| 40-tabela-financeira Tabela financeira: dois valores alterados e uma linha incluída | texto | complete | ok | 95 ms |
| 41-digitalizado-com-ruido Digitalização com ruído e um valor alterado | digitalizado | with-caveats | ok | 2705 ms |
| 42-digitalizado-inclinado Digitalização inclinada (1,5°) com uma data alterada | digitalizado | with-caveats | ok | 2022 ms |
| 43-digitalizado-texto-pequeno Digitalização com texto pequeno (8 pt) e um número alterado | digitalizado | with-caveats | ok | 2229 ms |
| 44-assinatura-alterada Assinatura digitalizada diferente | digitalizado | with-caveats | ok | 2143 ms |
| 45-ilegivel Digitalização ilegível (desfocada e com muito ruído) | digitalizado | with-caveats | ok | 7679 ms |
| 46-pagina-no-inicio Página incluída no início | estrutura | complete | ok | 44 ms |
| 47-paginas-em-branco Página em branco incluída entre páginas em branco | estrutura | with-caveats | ok | 40 ms |

## Limitações conhecidas dos casos

- **42-digitalizado-inclinado**: Com a inclinação, a posição esperada da palavra não é calculada; só a página é conferida.
- **44-assinatura-alterada**: Assinaturas são comparadas como imagem; a autenticidade não é verificada.
