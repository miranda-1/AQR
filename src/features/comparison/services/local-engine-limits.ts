/**
 * Limites da comparação feita no navegador (`local-comparison-service.ts`). O tamanho é o mesmo
 * do servidor; o tempo é maior que os 2 min do servidor porque o computador de quem usa pode ser
 * mais lento. Passado o tempo, o Web Worker é encerrado e a memória, liberada.
 */
export const LOCAL_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
export const LOCAL_COMPARISON_TIMEOUT_MS = 180_000
/** Margem depois do tempo da tarefa para o motor terminar de organizar o resultado. */
export const LOCAL_TIMEOUT_GRACE_MS = 15_000
