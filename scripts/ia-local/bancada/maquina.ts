import { execFileSync } from 'node:child_process'
import { loadavg } from 'node:os'

/** Estado da máquina durante as medições (energia, térmico, memória, swap, carga) e RSS do runtime. */

const comando = (programa: string, args: string[]) => {
  try {
    return execFileSync(programa, args, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

export interface EstadoDaMaquina {
  energia: string
  cargaBateria: string
  baixoConsumo: string
  termico: string
  memoriaLivre: string
  swap: string
  carga1min: string
}

export function estadoDaMaquina(): EstadoDaMaquina {
  const bateria = comando('pmset', ['-g', 'batt'])
  const ajustes = comando('pmset', ['-g'])
  const termico = comando('pmset', ['-g', 'therm'])
  const pressao = comando('memory_pressure', ['-Q'])
  return {
    energia: /AC Power/u.test(bateria) ? 'tomada' : /Battery Power/u.test(bateria) ? 'bateria' : 'desconhecida',
    cargaBateria: /(\d+)%/u.exec(bateria)?.[1] ?? '?',
    baixoConsumo: /lowpowermode\s+1/u.test(ajustes) ? 'ligado' : 'desligado',
    termico: /CPU_Speed_Limit\s*=\s*(\d+)/u.exec(termico)?.[1] ?? (/No thermal warning/u.test(termico) ? 'sem aviso' : '?'),
    memoriaLivre: /free percentage:\s*(\d+)%/u.exec(pressao)?.[1] ?? '?',
    swap: /used = ([\d.,]+\w)/u.exec(comando('sysctl', ['vm.swapusage']))?.[1] ?? '?',
    carga1min: loadavg()[0]?.toFixed(2) ?? '?',
  }
}

/** Memória residente somada dos processos do runtime (servidor e executor do modelo), em MB. */
export function rssDoRuntimeMb(): number {
  let kb = 0
  for (const linha of comando('ps', ['-axo', 'rss=,comm=']).split('\n')) {
    const [rss, ...nome] = linha.trim().split(/\s+/u)
    if (nome.join(' ').includes('ollama') || nome.join(' ').includes('llama-server')) kb += Number(rss) || 0
  }
  return Math.round(kb / 1024)
}
