/**
 * Fontes padrão do pdf.js (as 14 fontes-base do PDF: Helvetica, Times, Courier, Symbol,
 * ZapfDingbats) servidas pelo próprio AQR. Um PDF que usa uma dessas fontes sem embuti-la precisa
 * dos arquivos de `pdfjs-dist/standard_fonts`; sem eles, o pdf.js desenha com fonte substituta e
 * avisa no console. Os arquivos entram no build pelo Vite (com hash, mesma origem), carregados só
 * quando um PDF pede: nada de CDN, rede externa ou fontes do sistema.
 *
 * O pdf.js chama `fetch({ kind, filename })` desta fábrica no lugar de buscar por URL. Os outros
 * tipos (CMaps, wasm) continuam sem fonte configurada, como antes: o pdf.js usa o caminho em JS.
 */

const arquivos = import.meta.glob('/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>

const porNome = new Map(Object.entries(arquivos).map(([caminho, carregar]) => [caminho.slice(caminho.lastIndexOf('/') + 1), carregar]))

/** Nomes dos arquivos de fonte disponíveis (para teste e diagnóstico). */
export const fontesPadraoDisponiveis = (): string[] => [...porNome.keys()].sort()

export class FontesPadraoLocais {
  // O pdf.js instancia a fábrica com as URLs configuradas; aqui elas não são usadas.
  constructor(_opcoes?: unknown) {
    void _opcoes
  }

  async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
    if (kind !== 'standardFontDataUrl') throw new Error(`Ensure that the \`${kind}\` API parameter is provided.`)
    const carregar = porNome.get(filename)
    if (!carregar) throw new Error(`Fonte padrão não incluída no AQR: ${filename}`)
    const resposta = await fetch(await carregar())
    if (!resposta.ok) throw new Error(`Não foi possível carregar a fonte padrão ${filename} (${resposta.status})`)
    return new Uint8Array(await resposta.arrayBuffer())
  }
}
