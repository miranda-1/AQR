/**
 * Complementos do navegador para o motor de comparação, carregados antes dele no Web Worker.
 *
 * `ReadableStream` iterável (`for await (const parte of stream)`): o pdf.js lê o texto das páginas
 * assim (`getTextContent`), e o Safari (até a versão 26) não implementa essa iteração. Sem ela,
 * toda comparação falhava no Safari logo na leitura do primeiro PDF. A versão abaixo segue a
 * especificação: lê com um `reader`, entrega cada parte e libera o `reader` no fim ou na saída.
 */

interface StreamIteravel {
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>
}

const prototipo = ReadableStream.prototype as unknown as StreamIteravel

if (typeof prototipo[Symbol.asyncIterator] !== 'function') {
  Object.defineProperty(prototipo, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* (this: ReadableStream<unknown>) {
      const reader = this.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    },
  })
}

export {}
