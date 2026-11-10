import { createTransport, type Transporter } from 'nodemailer'

/**
 * Envio de e-mail pelo próprio AQR (convites e recuperação de senha). O protocolo SMTP, com TLS e
 * autenticação, fica com o `nodemailer` (biblioteca madura, sem dependências próprias).
 */

export interface MailMessage {
  para: string
  assunto: string
  texto: string
}

export interface Mailer {
  send(message: MailMessage): Promise<void>
}

export interface SmtpSettings {
  host: string
  port: number
  /** "tls": TLS desde o início (porta 465). "starttls": exige subir para TLS. "nenhuma": só desenvolvimento. */
  seguranca: 'tls' | 'starttls' | 'nenhuma'
  usuario: string | null
  senha: string | null
  /** Remetente, ex.: "AQR <nao-responda@exemplo.gov.br>". */
  remetente: string
}

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter
  private readonly from: string

  constructor(settings: SmtpSettings) {
    this.from = settings.remetente
    this.transport = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.seguranca === 'tls',
      requireTLS: settings.seguranca === 'starttls',
      ignoreTLS: settings.seguranca === 'nenhuma',
      ...(settings.usuario ? { auth: { user: settings.usuario, pass: settings.senha ?? '' } } : {}),
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      // O conteúdo é só texto montado pelo servidor: nada de anexos, arquivos ou URLs a buscar.
      disableFileAccess: true,
      disableUrlAccess: true,
    })
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, to: message.para, subject: message.assunto, text: message.texto })
  }
}
