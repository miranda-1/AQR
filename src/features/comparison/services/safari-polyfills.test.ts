import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * O Safari (até a versão 26) não deixa percorrer um `ReadableStream` com `for await`, e o pdf.js
 * lê o texto das páginas assim. Sem o complemento, toda comparação no navegador falhava no Safari.
 */
type Iteravel = { [Symbol.asyncIterator]?: unknown }
const prototipo = ReadableStream.prototype as unknown as Iteravel
const original = Object.getOwnPropertyDescriptor(prototipo, Symbol.asyncIterator)

afterEach(() => {
  if (original) Object.defineProperty(prototipo, Symbol.asyncIterator, original)
})

/** Simula o Safari: o protótipo sem a iteração assíncrona. */
function tirarIteracao() {
  Reflect.deleteProperty(prototipo, Symbol.asyncIterator)
}

function stream(partes: string[]) {
  return new ReadableStream<string>({
    start(controller) {
      for (const parte of partes) controller.enqueue(parte)
      controller.close()
    },
  })
}

describe('complementos do motor no navegador', () => {
  it('torna o ReadableStream iterável quando o navegador não oferece a iteração (Safari)', async () => {
    tirarIteracao()
    expect(prototipo[Symbol.asyncIterator]).toBeUndefined()
    vi.resetModules()
    await import('../local-engine/polyfills')

    const lidas: string[] = []
    for await (const parte of stream(['a', 'b', 'c']) as unknown as AsyncIterable<string>) lidas.push(parte)
    expect(lidas).toEqual(['a', 'b', 'c'])
  })

  it('libera o leitor ao sair no meio, para o stream poder ser lido de novo', async () => {
    tirarIteracao()
    vi.resetModules()
    await import('../local-engine/polyfills')

    const s = stream(['a', 'b'])
    for await (const parte of s as unknown as AsyncIterable<string>) {
      expect(parte).toBe('a')
      break
    }
    expect(s.locked).toBe(false)
  })

  it('não troca a iteração nativa quando ela existe', async () => {
    const nativa = prototipo[Symbol.asyncIterator]
    vi.resetModules()
    await import('../local-engine/polyfills')
    expect(prototipo[Symbol.asyncIterator]).toBe(nativa)
  })
})
