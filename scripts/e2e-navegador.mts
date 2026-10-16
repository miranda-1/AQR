// Ponta a ponta no navegador real: Chromium sem janela, conduzido pelo protocolo DevTools (WebSocket
// nativo do Node, sem dependências), contra a API e o site locais.
// Uso: com `npm run dev` rodando (API em 127.0.0.1:3000, site em localhost:5173):
//   node --import tsx scripts/e2e-navegador.mts [pasta-das-capturas]
// Gera pares de PDFs do corpus sintético, envia pela tela, confere o resultado (situação da análise,
// modos, categorias, destaques, exportação) e guarda capturas de tela para conferência visual.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { corpusCases } from '../server/comparison/evaluation/cases.ts'

const APP = process.env.AQR_APP_URL ?? 'http://localhost:5173'
const CHROMIUM = process.env.CHROMIUM ?? 'chromium'
const captures = process.argv[2] ?? path.join(tmpdir(), 'aqr-capturas')
mkdirSync(captures, { recursive: true })
const work = mkdtempSync(path.join(tmpdir(), 'aqr-e2e-'))
const downloads = path.join(work, 'downloads')
mkdirSync(downloads)

const results: boolean[] = []
const check = (name: string, ok: boolean, extra = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${name}${extra ? ` — ${extra}` : ''}`)
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const port = 9300 + Math.floor(Math.random() * 500)
const browser = spawn(CHROMIUM, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(work, 'perfil')}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,1000',
  'about:blank',
], { stdio: 'ignore' })

async function pageSocketUrl(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]
      const page = list.find((item) => item.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // ainda iniciando
    }
    await sleep(200)
  }
  throw new Error('Chromium não respondeu')
}

const socket = new WebSocket(await pageSocketUrl())
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let nextId = 1
const pending = new Map<number, (value: { result?: unknown; error?: { message: string } }) => void>()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } }
  if (message.id !== undefined) pending.get(message.id)?.(message)
})
async function send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const id = nextId++
  socket.send(JSON.stringify({ id, method, params }))
  const reply = await new Promise<{ result?: unknown; error?: { message: string } }>((resolve) => pending.set(id, resolve))
  if (reply.error) throw new Error(`${method}: ${reply.error.message}`)
  return reply.result as T
}
async function evaluate<T>(expression: string): Promise<T> {
  const { result } = await send<{ result: { value: T } }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return result.value
}
async function waitFor(expression: string, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate<boolean>(`Boolean(${expression})`)) return true
    await sleep(250)
  }
  return false
}
async function screenshot(name: string) {
  const { data } = await send<{ data: string }>('Page.captureScreenshot', { format: 'png' })
  writeFileSync(path.join(captures, `${name}.png`), Buffer.from(data, 'base64'))
}
const text = () => evaluate<string>('document.body.innerText')
const click = (selector: string) => evaluate<boolean>(`(() => { const el = ${selector}; if (!el) return false; el.click(); return true })()`)
const byText = (tag: string, value: string) => `[...document.querySelectorAll('${tag}')].find((el) => el.textContent.trim().startsWith(${JSON.stringify(value)}))`

await send('Page.enable')
await send('Runtime.enable')
await send('DOM.enable')
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads }).catch(() => undefined)
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

async function compareCase(caseId: string, captureName: string) {
  const item = corpusCases.find((entry) => entry.id === caseId)
  if (!item) throw new Error(caseId)
  const built = await item.build()
  const originalPath = path.join(work, `${caseId}-original.pdf`)
  const updatedPath = path.join(work, `${caseId}-atualizado.pdf`)
  writeFileSync(originalPath, built.original)
  writeFileSync(updatedPath, built.updated)

  await send('Page.navigate', { url: `${APP}/entrar` })
  await waitFor('document.readyState === "complete"')
  // Login visual: a sessão é o nome guardado na aba (sem animação de entrada no teste).
  await evaluate(`sessionStorage.setItem('aqr.sessao', 'Revisora'); true`)
  await send('Page.navigate', { url: `${APP}/comparacao` })
  await waitFor(`document.querySelectorAll('input[type=file]').length === 2`, 20_000)
  const { root } = await send<{ root: { nodeId: number } }>('DOM.getDocument')
  const { nodeIds } = await send<{ nodeIds: number[] }>('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'input[type=file]' })
  await send('DOM.setFileInputFiles', { nodeId: nodeIds[0], files: [originalPath] })
  await send('DOM.setFileInputFiles', { nodeId: nodeIds[1], files: [updatedPath] })
  await sleep(300)
  await click(byText('button', 'Comparar documentos'))
  const done = await waitFor(`document.querySelector('[aria-label="Situação da análise"]') || document.querySelector('#sem-diferencas-titulo') || document.querySelector('[role=alert]')`, 120_000)
  check(`${caseId}: a comparação terminou na tela`, done)
  await sleep(1500)
  await screenshot(captureName)
  return text()
}

try {
  // 1. Texto, valor e data: diferenças confirmadas por texto e aparência.
  let body = await compareCase('10-valor-monetario', '01-valor-monetario')
  check('situação da análise visível', body.includes('Análise concluída'))
  check('lista mostra o antes e o depois do valor', body.includes('Original: 15.000,00') || body.includes('Original: R$ 15.000,00'), '')
  check('descrição do subtipo', body.includes('Valor monetário alterado.'))
  check('método e evidência na lista', body.includes('Confirmada por texto do PDF e comparação visual'))
  const marks = await evaluate<number>(`document.querySelectorAll('[data-diff-id]').length`)
  check('destaques sobre as páginas reais', marks >= 2, `${marks} destaques`)

  // 2. Modo Visual esconde a diferença de texto.
  await click(`[...document.querySelectorAll('[role=radio]')].find((el) => el.textContent.trim().startsWith('Visual'))`)
  await sleep(500)
  body = await text()
  check('modo Visual sem diferenças de texto', body.includes('Nenhuma diferença neste modo de comparação'))
  await click(`[...document.querySelectorAll('[role=radio]')].find((el) => el.textContent.trim().startsWith('Completo'))`)

  // 3. Exportação: relatório HTML gerado no navegador.
  await click(byText('button', 'Exportar relatório'))
  await sleep(500)
  await click(`[...document.querySelectorAll('[role=menuitem]')].find((el) => el.textContent.includes('Relatório para leitura'))`)
  await sleep(1500)
  const exported = readdirSync(downloads).filter((name) => name.endsWith('.html'))
  check('relatório HTML baixado', exported.length === 1, exported[0] ?? '')
  if (exported[0]) {
    const html = readFileSync(path.join(downloads, exported[0]), 'utf8')
    check('relatório traz a situação e o valor alterado', html.includes('Análise concluída') && html.includes('18.000,00'))
  }

  // 4. Imagem trocada e página incluída: categorias e correspondência de páginas.
  body = await compareCase('13-imagem-substituida', '02-imagem-substituida')
  check('imagem trocada na lista', body.includes('Imagem trocada ou modificada.'))
  body = await compareCase('21-pagina-adicionada', '03-pagina-incluida')
  check('página incluída na lista', body.includes('Página incluída.'))
  check('correspondência mostrada na página', body.includes('Corresponde à p. 2 do original') || body.includes('Corresponde à p. 3'), '')

  // 5. Digitalizado: OCR e ressalvas.
  body = await compareCase('26-digitalizado', '04-digitalizado-ocr')
  check('ressalva do OCR visível', body.includes('com ressalvas'))
  check('página marcada como lida por OCR', body.includes('Texto lido por OCR'))

  // 6. Idênticos: mensagem honesta.
  body = await compareCase('01-identicos', '05-sem-diferencas')
  check('sem diferenças: "nas áreas analisadas", sem afirmar igualdade', body.includes('Nenhuma diferença foi detectada nas áreas analisadas.') && body.includes('não comprova'))
} finally {
  socket.close()
  browser.kill()
  rmSync(work, { recursive: true, force: true })
}

const failures = results.filter((ok) => !ok).length
console.log(`\n${results.length - failures} de ${results.length} verificações OK. Capturas em ${captures}`)
process.exitCode = failures > 0 ? 1 : 0
