# Limites operacionais do MVP de triagem (E10.6)

**Situação em 16/11/2026, branch `dev`.** O MVP faz triagem experimental de **desdobro na abertura**, só com **pacotes sintéticos**. Passar nos testes sintéticos **não** torna o sistema pronto para produção institucional.

## Como o MVP funciona hoje

| Aspecto | Funcionamento real | Onde |
|---|---|---|
| Instância | Uma só. O banco é um arquivo SQLite local e o estado das análises vive nele. Não há coordenação entre duas instâncias. | `server/db/`, `DATABASE_PATH` |
| Fila | Em memória, com `TRIAGEM_WORKERS` threads (padrão 1, máximo 4) e até `TRIAGEM_QUEUE_LIMIT` pedidos à espera (padrão 4). Fila cheia responde 503. | `server/triage/worker-pool.ts`, `server/documents/` |
| Reinício | Análise em andamento vira `interrompida` na inicialização seguinte. A retomada é **manual** ("Tentar de novo"), feita pelo analista, e só funciona se o conteúdo cifrado ainda existir. Não há retomada automática. | `recuperarInterrompidas`, `iniciarRetomada` |
| Envio | Multipart lido **inteiro em memória** antes de cifrar e enfileirar: até `TRIAGEM_MAX_ANEXOS` arquivos (padrão 40), 50 MB cada e `TRIAGEM_MAX_BYTES_PACOTE` no total (padrão 200 MB). Os limites valem no servidor, qualquer que seja o cliente. Não há envio em partes nem retomável. | `server/triage/api/routes.ts` |
| Processamento | Thread isolada com limite de memória (`TRIAGEM_WORKER_MEMORY_MB`, padrão 1.536) e de tempo (`TRIAGEM_TIMEOUT_MS`, padrão 10 min). OCR local opcional (`TRIAGEM_OCR`). | `server/triage/worker.ts` |
| Andamento na tela | A tela consulta o servidor a cada 2 s, porque a API não envia eventos. | `src/features/triage/hooks/use-processo.ts` |
| Conteúdo dos anexos | Guardado cifrado (AES-256-GCM) **só com `TRIAGEM_CONTEUDO_CHAVE`**. Sem a chave, não há visualização do original nem retomada: ficam só os metadados, os resultados e as evidências estruturadas. A chave fica em variável de ambiente, não em cofre. | `server/triage/store/conteudo.ts` |
| Retenção | `TRIAGEM_RETENCAO_HORAS` (padrão 72 h, de 1 h a 1 ano), fixada na criação e imutável no banco. O expurgo roda na inicialização e a cada hora, é verificado (o arquivo deixa de existir) e fica registrado. Os resultados e metadados sintéticos permanecem. | `expurgarVencidos` |
| Anexo suspeito | Isolado na inspeção, nunca aberto nem classificado, e seu conteúdo **não é entregue** (403 `ANEXO_ISOLADO`, desde a E10.3). | `lerConteudo` |
| Regras | 19 regras do catálogo `1.0-review`, **não homologadas pela GCA**. Garantias 040 e 041 ativas; hipóteses 045 e 047 desativadas. Reprocessamento sempre integral. | `server/triage/engine/` |
| Validação | Só com conjuntos sintéticos (DSD, VAL, IND, NOV). **Nenhuma validação com documentos reais.** | `docs/triagem/avaliacao-e4-e6.md` |
| Integrações | Nenhuma com SAP ou SEI: os pacotes entram por envio manual. | — |
| IA | Nenhuma. Não há modelo local nem externo. O encaixe para um modelo local existe só como contrato, sem chamadas. | `server/triage/model/` |
| Ligar a triagem | Desligada por padrão. `experimental-sintetico` é recusado com `NODE_ENV=production` e exige login real ou modo de desenvolvimento só local. | `server/config.ts` |

## O que cada limite impede

**Impede uso experimental** (demonstração com dados sintéticos em ambiente de teste autorizado): **nenhum** dos itens acima. O MVP já roda esse uso, com as barreiras de ambiente ativas.

Condições para esse uso:

- usar só pacotes sintéticos;
- definir `TRIAGEM_CONTEUDO_CHAVE` para que o visualizador de evidência mostre o original;
- avisar quem assiste que o resultado é verificação técnica, não decisão.

**Impede piloto institucional** (servidores da GCA com processos reais, mesmo em paralelo ao fluxo oficial):

1. Regras ainda não homologadas pela GCA. Também faltam as respostas às perguntas 2, 5, 8 e 9 do dossiê, às divergências R1, R6 e R9, à contagem de prazo da regra 009 e aos formatos de folha do TR 001 e do TR 003.
2. Falta validação com documentos reais, mesmo anonimizados, autorizada e com gabarito da GCA.
3. Falta a política de retenção e de acesso a documentos reais homologada (LGPD), com base legal, prazos, perfis e registro.
4. A chave do conteúdo está em variável de ambiente. Ela precisa ir para um cofre, com rotação e um procedimento de perda.
5. Faltam backup, restauração e expurgo do banco SQLite (hoje o expurgo é só do conteúdo cifrado).
6. Faltam operação e monitoramento: alerta de fila cheia, falhas, expurgo e espaço em disco.
7. O fluxo de entrada é por envio manual. Sem SAP ou SEI, o piloto depende de alguém baixar e reenviar documentos reais, o que precisa de regra própria.

**Evolução futura** (não impede piloto pequeno, mas limita escala ou conforto):

- Instância única e fila em memória: servem para poucos analistas. Escalar pede fila persistente e coordenação entre instâncias.
- Retomada manual depois de reinício. Poderia ser automática, com limite de tentativas.
- Envio lido em memória: com o padrão de 200 MB por pacote e poucas filas simultâneas, cabe. Para mais uso, conviria gravar em disco temporário cifrado durante o envio.
- Consulta a cada 2 s em vez de eventos do servidor.
- Outras modalidades e etapas, que precisam de catálogo e gabaritos próprios.
- IA documental (E11), só depois da medição e com o mesmo regime de evidência e revisão.
- Fontes padrão do PDF.js. No navegador, o leitor de PDF avisa que `standardFontDataUrl` não foi configurado: PDFs sem fontes embutidas são desenhados com fonte substituta. Isso afeta também o comparador.
