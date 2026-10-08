# Recursos institucionais

## `prefcg-azul.svg`

Marca PREFCG, versão monocromática azul, para meios digitais. Não tem "Prefeitura de Campo Grande" nem "Siga @prefcg" abaixo da marca.

| Item | Valor |
|---|---|
| Arquivo de origem | `SEMADES - MARCA e SLOGAN 2026.pdf` (Adobe Illustrator 30.4) |
| SHA-256 da origem | `17581394e89ac1561523795ec6f7e026b02585f80045fd4c6d47e540c37c3551` |
| Página | 2, "Para redes sociais", segunda linha (versão azul) |
| Região extraída (pt) | x 495–800, y 280–360 |
| Conteúdo | 48 caminhos vetoriais copiados literalmente, sem imagens nem texto |
| Proporção | 4,6365 : 1 (`viewBox 504.65 288.36 290.28 62.61`) |
| Script | `scripts/brand/extract_svg.py` |

### Única alteração: a cor

No arquivo 2026, os preenchimentos desta versão usam CMYK 0.973 / 0.793 / 0.055 / 0, cerca de `#27438B`. O mesmo arquivo usa outros tons de azul em outras peças. O Manual da Marca PREFCG (p. 3) define o azul institucional como **C100 M90 Y5 K0, `#283587`**, que é também o valor usado no arquivo SEMADES 2025 e no próprio manual.

Por decisão aprovada pelo responsável do projeto, todos os preenchimentos receberam **`#283587`**. A geometria, as proporções, o alinhamento e os elementos internos não foram alterados.

### Verificação

O SVG renderizado a 288 dpi foi comparado pixel a pixel com a mesma região do PDF de origem. Cerca de 1,5% das amostras divergem, todas no antialiasing das bordas, sem diferença de forma.

### Regras de uso na interface

- Usar sempre via `<BrandMark />`, que preserva a proporção. Nunca definir largura e altura independentes.
- Usar somente sobre fundo branco.
- Não recolorir por CSS, não aplicar filtros, sombras ou opacidade.
- Manter área livre mínima de 2X ao redor (X = metade da altura da letra "P" do PREFCG, conforme o manual).

### Arquivos não utilizados

- **Marca SEMADES** (2025 e 2026): por decisão do projeto, a interface usa apenas a marca PREFCG. A sigla SEMADES aparece como texto.
- **Slogan "É fazendo o certo que a gente traz resultado"**: é peça de campanha e não se aplica a uma ferramenta de trabalho.
- **`Brasão Prefeitura Campo Grande.pdf`**: é a identidade anterior, em azul-marinho `#0D143D`, fora da paleta vigente. O brasão não pode ser isolado da marca PREFCG sem remover elementos.
