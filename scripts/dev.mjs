import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = (name) => path.join(root, 'node_modules', '.bin', name)
const children = new Set()
let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill(signal)
}

function start(label, binary, args) {
  const child = spawn(process.execPath, [bin(binary), ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  children.add(child)
  child.on('error', (error) => {
    console.error(`Não foi possível iniciar ${label}:`, error.message)
    process.exitCode = 1
    stop()
  })
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (stopping) return
    console.error(`${label} encerrou (${signal ?? code ?? 'sem código'}). Encerrando o ambiente local.`)
    process.exitCode = code && code !== 0 ? code : 1
    stop()
  })
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))

start('API', 'tsx', ['watch', 'server/main.ts'])
start('site', 'vite', process.argv.slice(2))
