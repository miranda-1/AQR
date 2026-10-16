/**
 * Acesso ao pdf.js no navegador, isolado aqui para o resto do visualizador não depender da
 * biblioteca (e para os testes, que rodam sem canvas, poderem substituí-lo).
 *
 * O pdf.js é carregado sob demanda (só quando há PDF para mostrar) e lê o arquivo escolhido
 * direto da memória do navegador: nada é baixado do servidor.
 */

export interface PdfPageSize {
  /** Tamanho da página em pontos (escala 1). */
  width: number
  height: number
}

export interface PdfRenderTask {
  promise: Promise<void>
  cancel: () => void
}

export interface PdfPageHandle extends PdfPageSize {
  /** Desenha a página no canvas, com `scale` pixels por ponto. */
  render: (canvas: HTMLCanvasElement, scale: number) => PdfRenderTask
  /** Monta a camada de texto selecionável (e legível por leitores de tela) no contêiner. */
  renderText: (container: HTMLElement, scale: number) => PdfRenderTask
  /** Libera o que o pdf.js guardou para desenhar a página (chamado quando ela sai da tela). */
  release: () => void
}

export interface PdfDocumentHandle {
  pageCount: number
  getPage: (pageNumber: number) => Promise<PdfPageHandle>
  destroy: () => Promise<void>
}

export async function loadPdf(file: File): Promise<PdfDocumentHandle> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    // Sem buscas externas: nada de fontes do sistema ou da rede.
    useSystemFonts: false,
  })
  const pdf = await task.promise

  return {
    pageCount: pdf.numPages,
    destroy: () => task.destroy(),
    async getPage(pageNumber) {
      const page = await pdf.getPage(pageNumber)
      const base = page.getViewport({ scale: 1 })
      return {
        width: base.width,
        height: base.height,
        render(canvas, scale) {
          const viewport = page.getViewport({ scale })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const rendering = page.render({ canvas, viewport })
          return { promise: rendering.promise, cancel: () => rendering.cancel() }
        },
        renderText(container, scale) {
          container.replaceChildren()
          const layer = new pdfjs.TextLayer({
            textContentSource: page.streamTextContent(),
            container,
            viewport: page.getViewport({ scale }),
          })
          return { promise: layer.render().then(() => undefined), cancel: () => layer.cancel() }
        },
        release() {
          page.cleanup()
        },
      }
    },
  }
}
