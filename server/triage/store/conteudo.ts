import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Armazenamento privado do conteúdo dos anexos da triagem, cifrado em repouso (AES-256-GCM).
 *
 * - A chave vem da configuração (`TRIAGEM_CONTEUDO_CHAVE`) e nunca é gravada na pasta do conteúdo
 *   nem no log; sem chave, nada é armazenado (só metadados e resultados).
 * - Cada arquivo tem nome aleatório (não é o nome original nem o hash), IV próprio e etiqueta de
 *   autenticação; a referência entra como dado autenticado, então trocar arquivos de lugar é detectado.
 * - Na leitura, o SHA-256 do conteúdo decifrado é conferido com o registrado no banco.
 * - O expurgo apaga o arquivo e confere que ele não existe mais (expurgo verificável).
 * - Pasta com permissão 700 e arquivos 600.
 */

const MAGICO = Buffer.from('AQRT1')
const REF = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

export class ConteudoIndisponivel extends Error {
  override name = 'ConteudoIndisponivel'
}

export class ConteudoCifrado {
  private readonly dir: string
  private readonly chave: Buffer

  constructor(dir: string, chave: Buffer) {
    if (chave.length !== 32) throw new Error('A chave do conteúdo precisa ter 32 bytes')
    this.dir = path.resolve(dir)
    this.chave = Buffer.from(chave)
    mkdirSync(this.dir, { recursive: true, mode: 0o700 })
    chmodSync(this.dir, 0o700)
  }

  private caminho(ref: string): string {
    // A referência é sempre um UUID gerado aqui: nada de caminho vindo de fora.
    if (!REF.test(ref)) throw new ConteudoIndisponivel('Referência de conteúdo inválida')
    return path.join(this.dir, `${ref}.bin`)
  }

  guardar(bytes: Uint8Array): string {
    const ref = randomUUID()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.chave, iv)
    cipher.setAAD(Buffer.from(ref))
    const cifrado = Buffer.concat([cipher.update(bytes), cipher.final()])
    const tag = cipher.getAuthTag()
    writeFileSync(this.caminho(ref), Buffer.concat([MAGICO, iv, tag, cifrado]), { mode: 0o600, flag: 'wx' })
    return ref
  }

  ler(ref: string, sha256: string): Uint8Array {
    const arquivo = this.caminho(ref)
    if (!existsSync(arquivo)) throw new ConteudoIndisponivel('Conteúdo não encontrado (expurgado ou nunca armazenado)')
    const dados = readFileSync(arquivo)
    if (!dados.subarray(0, MAGICO.length).equals(MAGICO)) throw new ConteudoIndisponivel('Arquivo de conteúdo com formato desconhecido')
    const iv = dados.subarray(MAGICO.length, MAGICO.length + 12)
    const tag = dados.subarray(MAGICO.length + 12, MAGICO.length + 28)
    const decipher = createDecipheriv('aes-256-gcm', this.chave, iv)
    decipher.setAAD(Buffer.from(ref))
    decipher.setAuthTag(tag)
    let claro: Buffer
    try {
      claro = Buffer.concat([decipher.update(dados.subarray(MAGICO.length + 28)), decipher.final()])
    } catch {
      throw new ConteudoIndisponivel('Conteúdo adulterado ou chave diferente da usada ao guardar')
    }
    if (createHash('sha256').update(claro).digest('hex') !== sha256) throw new ConteudoIndisponivel('O conteúdo decifrado não confere com o hash registrado')
    return new Uint8Array(claro)
  }

  /** Apaga e confere que sumiu. Devolve `true` se o arquivo não existe mais. */
  expurgar(ref: string): boolean {
    const arquivo = this.caminho(ref)
    rmSync(arquivo, { force: true })
    return !existsSync(arquivo)
  }
}
