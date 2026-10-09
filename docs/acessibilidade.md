# Acessibilidade (meta: WCAG 2.2 AA)

## Verificações automatizadas

- `src/test/a11y.test.tsx` roda o **axe-core** (regras WCAG 2.0/2.1/2.2 A e AA) na seleção de arquivos (com o menu "Ferramentas" aberto e "Como funciona" expandido), na triagem, no workspace e nos painéis de estado. Para confirmar que o teste detecta problemas reais, ele foi validado contra uma violação plantada.
- O ESLint usa o `eslint-plugin-jsx-a11y`.
- Os testes de interação usam consultas por papel e nome acessível (Testing Library), o que também valida a semântica.

## Contraste (medido)

| Par | Contraste |
|---|---|
| Texto padrão `#1B2040` / branco | 15,8:1 |
| Texto secundário `#4A5072` / branco | 7,8:1 |
| Texto auxiliar `#626886` / fundo do visualizador `#E9EBF2` | 4,6:1 |
| Azul institucional / branco (texto, foco) | 10,8:1 |
| Texto de adição, exclusão e modificação sobre seus fundos | 6,1:1, 6,4:1 e 6,6:1 |
| Bordas de controles `#8D92AB` / branco | 3,1:1 |

O contraste não é avaliado pelo axe no jsdom, por isso foi calculado à parte.

## Práticas aplicadas

- **Teclado:**
  - Link "Pular para o conteúdo".
  - Foco visível em azul, com contorno de 2 a 3 px afastado do elemento.
  - Regiões roláveis dos documentos são focáveis.
  - Destaques no documento são acionáveis com Enter ou Espaço.
  - Atalhos Alt + ↑ e Alt + ↓ navegam entre diferenças. São atalhos com modificador, em conformidade com o critério 2.1.4.
- **Diferenças:** cor + ícone + rótulo + tratamento do texto. Leitores de tela ouvem "Adição 2: …".
- **Estados anunciados:** erros de arquivo (`aria-live="assertive"`), prontidão para comparar, etapas de processamento e posição "3 de 10" (`aria-live="polite"`). Erros de comparação usam `role="alert"`.
- **Formulário:** cada campo de arquivo tem nome acessível e descrição (formato, limite e erro).
- **Login:** campos com rótulo visível; erros ("Informe o usuário.") ligados por `aria-describedby`, com `aria-invalid` e foco no primeiro campo com erro. O botão "Mostrar/Ocultar senha" usa `aria-pressed`. A entrada animada é decorativa (`aria-hidden`); um `role="status"` anuncia "Entrando no AQR…". Com movimento reduzido, a animação é pulada.
- **Ação indisponível:** "Exportar relatório" usa `aria-disabled` com o texto visível "indisponível". O botão continua focável para que o motivo possa ser lido.
- **Áreas de clique:** os controles têm no mínimo 36 a 40 px de altura, acima do mínimo de 24 px do critério 2.5.8.
- **Movimento reduzido:** `prefers-reduced-motion` desliga animações e a rolagem suave.
- **Título da página** atualizado a cada rota.

## Limitações conhecidas

- Não houve teste com leitores de tela reais (NVDA, JAWS, VoiceOver). É recomendado antes da homologação.
- Os destaques usam `role="button"` em `span`. A experiência deve ser confirmada com leitor de tela quando houver documentos reais.
