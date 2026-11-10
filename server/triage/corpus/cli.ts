import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gerarCorpus } from './generate.ts'

/**
 * `npm run triagem:corpus -- <pasta>`: grava o corpus sintético para inspeção. Cada pacote vira uma
 * pasta com os arquivos e o `gabarito.json`; `indice.md` resume tudo. Só dados fictícios.
 */
const destino = process.argv[2]
if (!destino) {
  console.error('Uso: npm run triagem:corpus -- <pasta de destino>')
  process.exit(1)
}

const corpus = await gerarCorpus()
const linhas = ['# Corpus sintético de desdobro', '', '| Pacote | Título | Categorias | Arquivos | Regras com expectativa |', '|---|---|---|---|---|']
for (const { gabarito, arquivos } of corpus) {
  const pasta = path.join(destino, gabarito.id)
  mkdirSync(pasta, { recursive: true })
  for (const arquivo of arquivos) writeFileSync(path.join(pasta, arquivo.nome), arquivo.bytes)
  writeFileSync(path.join(pasta, 'gabarito.json'), `${JSON.stringify(gabarito, null, 2)}\n`)
  linhas.push(
    `| ${gabarito.id} | ${gabarito.titulo} | ${gabarito.categorias.join(', ')} | ${arquivos.map((arquivo) => arquivo.nome).join(', ')} | ${Object.keys(gabarito.regras).length} |`,
  )
}
writeFileSync(path.join(destino, 'indice.md'), `${linhas.join('\n')}\n`)
console.log(`${corpus.length} pacotes gravados em ${destino}.`)
