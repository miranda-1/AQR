# Escopo da E10: validação integral do MVP de triagem

**Registrado em:** 16/11/2026, antes de qualquer mudança de código da E10. **Branch:** `dev`.

## Objetivo

Validar o primeiro MVP da triagem documental assistida como produto integrado, do envio dos documentos à revisão e ao histórico. Vale só para **desdobro (D) na etapa de abertura** e só com **dados sintéticos**.

## Fora do escopo

- Integração com modelos de IA, locais ou externos. A E11 trata da IA documental.
- Novas modalidades ou etapas.
- Decisões administrativas automáticas: não há aprovação, indeferimento, arquivamento nem pontuação.
- Uso com documentos reais, triagem ligada em produção e integração com SAP/SEI.
- Mudanças no catálogo normativo, nos gabaritos ou em interpretações pendentes de homologação, como a contagem de prazo da regra 009 e o gatilho de GDU da regra 028.
- Push dos commits da E10 sem nova autorização. Também ficam fora: `master`, force push, release, `AGENTS.md` e o dossiê privado.

## Entregas

| Item | Conteúdo |
|---|---|
| **E10.1 Experiência e semântica** | **Navegação:** a triagem deixa de aparecer como "Em breve" ou "Em desenvolvimento" e passa a ser identificada como experimental (ambientes autorizados, só dados sintéticos). Com a triagem desligada pelo servidor, a tela continua só informativa. **Estado:** processamento, revisão humana, condições pendentes e verificações não avaliáveis aparecem separados, sem mudar o significado do estado `revisado` no servidor e sem nenhum estado servir de sinônimo de aprovação. **Regras:** títulos e explicações legíveis, preservando o ID AQR-GCA, o título original, a versão, a fonte e as condições, sem alterar o catálogo. **Correção:** ação "Salvar correção e reprocessar" (validar, salvar, confirmar, reprocessar, mostrar a nova análise mantendo a anterior), com tratamento de falha depois do salvamento, proteção contra clique repetido e 409. Salvar sem reprocessar continua possível. |
| **E10.2 Fluxos completos** | Os 20 cenários pedidos, testados contra o servidor real (HTTP, porta de verdade, threads de verdade) e, quando possível, no navegador. Usa os pacotes sintéticos existentes; pacote novo só se faltar algum. |
| **E10.3 Segurança e privacidade** | Revisão de ponta a ponta de: autenticação e autorização por rota, isolamento, limites, arquivos maliciosos e isolamento de suspeitos, endpoint de conteúdo (cache e exposição), logs, operação sem chave, retenção e expurgo, imutabilidade da trilha, falhas transacionais, reinício, duplicação de ações e ausência de chamada externa de IA. No navegador: revogação de URLs de objeto, cache de conteúdo sensível e logs de diagnóstico. Falha importante é corrigida com teste de regressão. |
| **E10.4 Motor e regras** | Reexecução dos conjuntos de desenvolvimento, validação, IND e NOV, preservando os registros das primeiras execuções e sem mudar gabaritos. Comparação entre o reprocessamento incremental e a execução integral; se houver divergência não resolvida, prevalece a integral. |
| **E10.5 Visual e acessibilidade** | Fluxo no navegador: navegação, envio de vários arquivos, processamento, achados, evidências, páginas, confiança, revisões, histórico, erros, administrador, celular, teclado e leitor de tela (axe e árvore de acessibilidade). Capturas sintéticas das telas principais. |
| **E10.6 Limites operacionais** | Limites reais do MVP, classificados entre o que impede uso experimental, o que impede piloto institucional e o que é evolução futura. |
| **E10.7 Entrega** | Lint, typecheck, testes e build; `CONTEXTO.md` e arquitetura atualizados; commits locais separados; relatório final com os 15 itens pedidos. |

## Critério de conclusão

O AQR executa uma triagem experimental de desdobro de ponta a ponta, preserva evidências e histórico, permite revisão humana, trata incertezas corretamente e não tem falha crítica conhecida nos fluxos avaliados.

A conclusão técnica **não** é homologação normativa, não é aprovação da GCA e não autoriza processar documentos reais.
