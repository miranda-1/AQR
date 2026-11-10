import type { MailMessage, Mailer } from '../auth/mailer.ts'

/** Caixa de e-mail em memória: guarda o que o AQR enviaria, sem SMTP. */
export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = []
  /** Quando verdadeiro, o envio falha como se o SMTP estivesse fora do ar. */
  down = false

  async send(message: MailMessage): Promise<void> {
    if (this.down) throw new Error('SMTP fora do ar')
    this.sent.push(message)
  }

  /** Último e-mail enviado ao endereço, ou `undefined`. */
  lastTo(email: string): MailMessage | undefined {
    return this.sent.findLast((message) => message.para === email)
  }

  /** O código do link (depois do `#`) do último e-mail enviado ao endereço. */
  codeFor(email: string): string | undefined {
    return /\/definir-senha#([A-Za-z0-9_-]+)/u.exec(this.lastTo(email)?.texto ?? '')?.[1]
  }
}
