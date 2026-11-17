import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * A bancada da IA local fica FORA do servidor: o teste de segurança da E10.3 proíbe rede em
 * `server/triage` e `server/documents`, e a bancada fala com o modelo em 127.0.0.1. Este teste
 * garante o outro lado: nenhum código do servidor, da tela ou dos contratos importa a bancada,
 * e o único endereço de rede que a bancada usa é o loopback.
 */

const RAIZ = path.resolve(import.meta.dirname, '../../..')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === 'node_modules' ? [] : arquivos(caminho)
    return /\.(ts|tsx|mts)$/u.test(nome) ? [caminho] : []
  })

describe('bancada da IA local isolada do sistema', () => {
  it('servidor, tela e contratos não importam a bancada', () => {
    const importam = ['server', 'src', 'shared']
      .flatMap((dir) => arquivos(path.join(RAIZ, dir)))
      .filter((arquivo) => /ia-local\/bancada|scripts\/ia-local/u.test(readFileSync(arquivo, 'utf8')))
    expect(importam.map((arquivo) => path.relative(RAIZ, arquivo))).toEqual([])
  })

  it('a bancada só cita endereços de loopback (10.0.0.1 só aparece na prova de que endereço externo é recusado)', () => {
    const externos = arquivos(path.join(RAIZ, 'scripts/ia-local/bancada'))
      .filter((arquivo) => !arquivo.endsWith('.test.ts'))
      .flatMap((arquivo) => [...readFileSync(arquivo, 'utf8').matchAll(/https?:\/\/([a-z0-9.[\]:-]+)/giu)].map((m) => ({ arquivo, host: m[1] ?? '' })))
      .filter(({ host }) => !host.startsWith('127.0.0.1') && !host.startsWith('10.0.0.1'))
    expect(externos).toEqual([])
  })
})
