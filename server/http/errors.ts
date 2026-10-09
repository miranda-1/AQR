import type { FastifyError, FastifyInstance } from 'fastify'
import type { ApiErrorBody } from '../../shared/contracts/api-error.ts'
import type { DocumentRole } from '../../shared/contracts/comparison.ts'

/** Erro com resposta pronta para a API: status, código estável e mensagem em português. */
export class ApiError extends Error {
  override name = 'ApiError'
  readonly statusCode: number
  readonly code: string
  readonly fields: Record<string, string> | undefined
  readonly document: DocumentRole | undefined

  constructor(
    statusCode: number,
    code: string,
    message: string,
    extra: { fields?: Record<string, string>; document?: DocumentRole } = {},
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.fields = extra.fields
    this.document = extra.document
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
        ...(this.document ? { document: this.document } : {}),
      },
    }
  }
}

/** Erros do plugin de upload, traduzidos. Os demais erros inesperados viram uma mensagem genérica. */
const knownFastifyErrors: Record<string, ApiError> = {
  FST_REQ_FILE_TOO_LARGE: new ApiError(
    413,
    'FILE_TOO_LARGE',
    'O arquivo passa do limite de 50 MB. Reduza o tamanho do PDF (por exemplo, exportando de novo) e envie outra vez.',
  ),
  FST_FILES_LIMIT: new ApiError(400, 'TOO_MANY_FILES', 'Envie exatamente dois PDFs: o original e o atualizado.'),
  FST_PARTS_LIMIT: new ApiError(400, 'TOO_MANY_FILES', 'Envie exatamente dois PDFs: o original e o atualizado.'),
  FST_FIELDS_LIMIT: new ApiError(400, 'UNEXPECTED_FIELD', 'Envie apenas os campos "original" e "updated", com os PDFs.'),
  FST_INVALID_MULTIPART_CONTENT_TYPE: new ApiError(
    415,
    'MULTIPART_REQUIRED',
    'Envie os PDFs como formulário (multipart/form-data), nos campos "original" e "updated".',
  ),
  FST_ERR_CTP_INVALID_MEDIA_TYPE: new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato de envio não aceito por este endereço.'),
  FST_ERR_CTP_BODY_TOO_LARGE: new ApiError(413, 'BODY_TOO_LARGE', 'O conteúdo enviado é grande demais.'),
  FST_ERR_CTP_INVALID_JSON_BODY: new ApiError(400, 'INVALID_JSON', 'O conteúdo enviado não é um JSON válido.'),
  FST_ERR_CTP_EMPTY_JSON_BODY: new ApiError(400, 'INVALID_JSON', 'O conteúdo enviado está vazio.'),
}

/**
 * Respostas de erro uniformes (`ApiErrorBody`). Nunca devolve a mensagem interna de um erro
 * inesperado: ela vai só para o log, sem o conteúdo da requisição.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    const known = error instanceof ApiError ? error : knownFastifyErrors[error.code]
    if (known) return reply.status(known.statusCode).send(known.toBody())
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send(new ApiError(error.statusCode, 'BAD_REQUEST', 'Requisição inválida.').toBody())
    }
    request.log.error({ err: { name: error.name, code: error.code, message: error.message } }, 'erro inesperado')
    return reply
      .status(500)
      .send(new ApiError(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor. Tente de novo em instantes.').toBody())
  })

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send(new ApiError(404, 'NOT_FOUND', 'Endereço não encontrado.').toBody()),
  )
}
