#!/bin/bash
# Servidor local do modelo (Ollama) para a bancada da IA documental (E11.1). Nunca para produção.
#
#   scripts/ia-local/ollama.sh baixar <modelo>   rede liberada, só para baixar pesos (ollama pull)
#   scripts/ia-local/ollama.sh inferencia        sem rede: o kernel bloqueia toda saída (sem-rede.sb)
#   scripts/ia-local/ollama.sh parar
#
# Sempre: só 127.0.0.1, recursos de nuvem desligados, um pedido por vez, um modelo carregado,
# fila curta, pesos fora do Git (AQR_IA_MODELOS, padrão ~/.aqr-ia/modelos) e log sem conteúdo
# (o Ollama não registra prompts nem respostas fora do modo de depuração, que fica desligado).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ESTADO="${AQR_IA_ESTADO:-$HOME/.aqr-ia}"
mkdir -p "$ESTADO"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_NO_CLOUD=1
export OLLAMA_MODELS="${AQR_IA_MODELOS:-$ESTADO/modelos}"
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_MAX_QUEUE=4
export OLLAMA_KEEP_ALIVE=10m
export OLLAMA_CONTEXT_LENGTH=8192
export OLLAMA_ORIGINS=""
export OLLAMA_DEBUG=0
unset OLLAMA_FLASH_ATTENTION OLLAMA_KV_CACHE_TYPE

PID="$ESTADO/ollama.pid"
MODO="$ESTADO/modo"
LOG="$ESTADO/ollama.log"

parar() {
  if [[ -f "$PID" ]] && kill -0 "$(cat "$PID")" 2>/dev/null; then kill "$(cat "$PID")"; sleep 1; fi
  rm -f "$PID" "$MODO"
}

esperar() {
  for _ in $(seq 1 50); do
    curl -sf "http://$OLLAMA_HOST/api/version" >/dev/null && return 0
    sleep 0.2
  done
  echo "O servidor do modelo não respondeu em 127.0.0.1:11434 (log: $LOG)." >&2
  return 1
}

case "${1:-}" in
  baixar)
    [[ -n "${2:-}" ]] || { echo "Informe o modelo: ollama.sh baixar <modelo>" >&2; exit 2; }
    parar
    ollama serve >>"$LOG" 2>&1 & echo $! >"$PID"; echo baixar >"$MODO"
    esperar
    ollama pull "$2"
    parar
    ;;
  inferencia)
    parar
    sandbox-exec -f "$DIR/sem-rede.sb" ollama serve >>"$LOG" 2>&1 & echo $! >"$PID"; echo inferencia >"$MODO"
    esperar
    echo "Servidor do modelo sem rede em http://$OLLAMA_HOST (pid $(cat "$PID"))."
    ;;
  parar) parar ;;
  *) echo "Uso: ollama.sh baixar <modelo> | inferencia | parar" >&2; exit 2 ;;
esac
