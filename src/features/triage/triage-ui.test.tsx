import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PdfDocumentHandle } from '@/features/comparison/viewer/pdf/load-pdf'
import { defined, makeFile } from '@/test/files'
import { renderApp } from '@/test/render'
import { schemas, TriagemServiceError, type TriagemDetalhe, type TriagemService, type TriagemStatus } from './model/types'
import { cenarioDivergencia, cenarioIncompleto, criarFakeService, statusAdmin, statusAnalista, statusDesligado, type Cenario } from './test-data/fake-service'
import { respostasReais } from './test-data/respostas-reais'

/**
 * Interface da triagem (E9) com respostas reais da API (`respostas-reais.ts`). O jsdom não desenha
 * canvas: o PDF é trocado por um documento falso de 3 páginas, como no teste do comparador.
 */

const loadPdf = vi.fn(
  async (): Promise<PdfDocumentHandle> => ({
    pageCount: 3,
    destroy: async () => undefined,
    getPage: async () => ({
      width: 595,
      height: 842,
      render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
      renderText: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
      release: () => undefined,
    }),
  }),
)
vi.mock('@/features/comparison/viewer/pdf/load-pdf', () => ({ loadPdf: () => loadPdf() }))

beforeEach(() => loadPdf.mockClear())

const ID = 'b9a8de93-7306-4248-8e7c-8e535bf62d7c'
const ANEXO_ART = '1500dfbc-1bac-487c-bf79-0b00fdc062c8'
const CAMPO_LOTE_ART = `${ANEXO_ART}:lote`
const PROCESSO = `/triagem/processos/${ID}`

/** Palavras que a interface nunca usa: a triagem não decide nem pontua o processo. */
const PROIBIDAS = /aprovad|reprovad|irregular|deferid|indeferid|pontua[çc][ãa]o/i

async function violacoes(container: Element) {
  const resultado = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultado.violations.map((violacao) => `${violacao.id}: ${violacao.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

function comDetalhe(service: TriagemService, detalhe: TriagemService['detalhe']): TriagemService {
  return { ...service, detalhe }
}

const abrirVerificacao = async (user: ReturnType<typeof userEvent.setup>, nome: RegExp) => {
  await user.click(await screen.findByRole('button', { name: nome }))
  return screen.findByRole('article', { name: nome })
}

describe('triagem desligada ou fora do ar', () => {
  it('informa que não está disponível e não oferece criação quando o servidor diz que está desligada', async () => {
    const service = criarFakeService({ status: statusDesligado() })
    renderApp('/triagem', { triageService: service })
    expect(await screen.findByRole('heading', { name: 'A triagem não está disponível neste ambiente' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nova triagem sintética/ })).not.toBeInTheDocument()
    expect(service.chamadas.map((chamada) => chamada.metodo)).toEqual(['status'])
  })

  it('a página do processo também respeita o modo desligado', async () => {
    renderApp(PROCESSO, { triageService: criarFakeService({ status: statusDesligado(), cenarios: [cenarioDivergencia().antes] }) })
    expect(await screen.findByRole('heading', { name: 'A triagem não está disponível neste ambiente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Processo B9A8DE93/ })).not.toBeInTheDocument()
  })

  it('sem conexão, explica e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    let tentativas = 0
    const status = async (): Promise<TriagemStatus> => {
      tentativas += 1
      if (tentativas === 1) throw new TriagemServiceError(0, 'SEM_CONEXAO', 'Sem conexão.')
      return statusAnalista()
    }
    renderApp('/triagem', { triageService: criarFakeService({ status, cenarios: [cenarioDivergencia().antes] }) })
    expect(await screen.findByRole('heading', { name: 'Não foi possível consultar a triagem' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('link', { name: 'Abrir o processo B9A8DE93' })).toBeInTheDocument()
  })
})

describe('lista de processos', () => {
  it('analista vê os próprios processos com situação, achados e o botão de nova triagem', async () => {
    renderApp('/triagem', { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const linha = (await screen.findByRole('link', { name: 'Abrir o processo B9A8DE93' })).closest('tr')
    const celulas = within(defined(linha, 'linha'))
    expect(celulas.getByText('SINTETICO-001')).toBeInTheDocument()
    expect(celulas.getByText('Análise concluída')).toBeInTheDocument()
    expect(celulas.getByText('2 de 2 achados a revisar')).toBeInTheDocument()
    expect(celulas.getByText('Desdobro · Abertura')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Nova triagem sintética/ }).length).toBeGreaterThan(0)
  })

  it('administrador acompanha, mas não cria', async () => {
    renderApp('/triagem', { triageService: criarFakeService({ status: statusAdmin(), cenarios: [cenarioDivergencia().antes] }) })
    expect(await screen.findByText(/Como administrador, você acompanha todos os processos/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Abrir o processo B9A8DE93' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nova triagem sintética/ })).not.toBeInTheDocument()
  })

  it('lista vazia orienta o analista', async () => {
    renderApp('/triagem', { triageService: criarFakeService() })
    expect(await screen.findByText('Nenhum processo de triagem ainda.')).toBeInTheDocument()
  })
})

describe('nova triagem sintética', () => {
  it('envia vários anexos de desdobro na abertura e abre o processo', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    renderApp('/triagem/nova', { triageService: service })
    await screen.findByRole('heading', { level: 1, name: 'Nova triagem sintética' })

    expect(screen.getByRole('radio', { name: /^Desdobro$/ })).toBeChecked()
    expect(screen.getAllByRole('radio', { name: /ainda não suportada/ }).every((radio) => radio.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByRole('radio', { name: /Abertura/ })).toBeChecked()

    await user.upload(screen.getByLabelText('Selecionar arquivos do pacote'), [makeFile('requerimento.pdf'), makeFile('matricula.pdf'), makeFile('rascunho.pdf')])
    expect(screen.getByText('3 arquivos selecionados', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover rascunho.pdf' }))
    expect(screen.getByText('2 arquivos selecionados', { exact: false })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Referência fictícia/ }), 'SINTETICO-001')
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confirme que os arquivos são sintéticos.')
    expect(service.chamadas.some((chamada) => chamada.metodo === 'criar')).toBe(false)

    await user.click(screen.getByRole('checkbox', { name: /Declaro que todos os arquivos são sintéticos/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))

    expect(await screen.findByRole('heading', { level: 1, name: /Processo B9A8DE93/ })).toBeInTheDocument()
    expect(screen.getByText('Pacote recebido. A análise está na fila.')).toBeInTheDocument()
    const criar = defined(service.chamadas.find((chamada) => chamada.metodo === 'criar'), 'criar')
    const [dados, arquivos, chave] = criar.argumentos as [Record<string, unknown>, File[], string]
    expect(dados).toMatchObject({ modalidade: 'D', etapa: 'abertura', referencia: 'SINTETICO-001' })
    expect(dados.protocoladoEm).toMatch(/T15:00:00\.000Z$/)
    expect(arquivos.map((arquivo) => arquivo.name)).toEqual(['requerimento.pdf', 'matricula.pdf'])
    expect(chave).toMatch(/\S{8,}/)
  })

  it('repete a mesma chave de idempotência quando o envio falha e é tentado de novo', async () => {
    const user = userEvent.setup()
    const base = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    const chaves: string[] = []
    let falhas = 1
    const service: TriagemService = {
      ...base,
      async criar(dados, arquivos, chave) {
        chaves.push(chave)
        if (falhas-- > 0) throw new TriagemServiceError(503, 'OCUPADO', 'A fila da triagem está cheia. Tente de novo em instantes.')
        return base.criar(dados, arquivos, chave)
      },
    }
    renderApp('/triagem/nova', { triageService: service })
    await user.upload(await screen.findByLabelText('Selecionar arquivos do pacote'), [makeFile('requerimento.pdf')])
    await user.click(screen.getByRole('checkbox', { name: /Declaro/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))
    expect(await screen.findByText('Serviço ocupado')).toBeInTheDocument()
    expect(screen.getByText(/A fila da triagem está cheia/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))
    expect(await screen.findByRole('heading', { level: 1, name: /Processo B9A8DE93/ })).toBeInTheDocument()
    expect(chaves).toHaveLength(2)
    expect(chaves[0]).toBe(chaves[1])
  })

  it('recusa no navegador o que passa do limite do servidor, sem enviar', async () => {
    const user = userEvent.setup()
    const status = statusAnalista()
    if (!status.disponivel) throw new Error('status de teste')
    const service = criarFakeService({ status: { ...status, limites: { ...status.limites, maxAnexos: 2 } }, cenarios: [cenarioDivergencia().antes] })
    renderApp('/triagem/nova', { triageService: service })
    await user.upload(await screen.findByLabelText('Selecionar arquivos do pacote'), [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')])
    await user.click(screen.getByRole('checkbox', { name: /Declaro/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))
    expect(screen.getByRole('alert')).toHaveTextContent('São 3 arquivos; o limite é de 2 por pacote. Remova 1.')
    expect(service.chamadas.some((chamada) => chamada.metodo === 'criar')).toBe(false)
  })

  it('mostra a recusa do servidor (arquivo rejeitado)', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({
      cenarios: [cenarioDivergencia().antes],
      erros: { criar: new TriagemServiceError(422, 'PACOTE_INVALIDO', 'O arquivo prancha.exe não é aceito na triagem.') },
    })
    renderApp('/triagem/nova', { triageService: service })
    await user.upload(await screen.findByLabelText('Selecionar arquivos do pacote'), [makeFile('prancha.exe', 'MZ', 'application/octet-stream')])
    expect(screen.getByText(/Formato que a triagem não lê/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Declaro/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar para triagem' }))
    expect(await screen.findByText('O arquivo prancha.exe não é aceito na triagem.')).toBeInTheDocument()
  })

  it('administrador não vê o formulário', async () => {
    renderApp('/triagem/nova', { triageService: criarFakeService({ status: statusAdmin() }) })
    expect(await screen.findByText(/Sua conta não cria processos de triagem/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Selecionar arquivos do pacote')).not.toBeInTheDocument()
  })
})

describe('estados do processamento', () => {
  it('consulta o andamento sozinha e mostra o resultado quando a análise termina', async () => {
    const { antes } = cenarioDivergencia()
    const base = criarFakeService({ cenarios: [antes] })
    let consultas = 0
    const processando: TriagemDetalhe = { ...antes.detalhe, triagem: { ...antes.detalhe.triagem, situacao: 'processando', analiseAtual: null } }
    const service = comDetalhe(base, async (id, options) => {
      consultas += 1
      return consultas === 1 ? processando : base.detalhe(id, options)
    })
    renderApp(PROCESSO, { triageService: service })
    expect(await screen.findByRole('heading', { name: 'Análise em andamento' })).toBeInTheDocument()
    expect(screen.getByText('Processando')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Verificações' }, { timeout: 4000 })).toBeInTheDocument()
    expect(consultas).toBeGreaterThanOrEqual(2)
  })

  it.each([
    ['interrompida', 'A análise foi interrompida', 'Interrompido'],
    ['falhou', 'A análise não foi concluída', 'Falhou'],
  ] as const)('análise %s: explica e oferece tentar de novo', async (situacao, titulo, selo) => {
    const user = userEvent.setup()
    const { antes } = cenarioDivergencia()
    const detalhe: TriagemDetalhe = {
      ...antes.detalhe,
      triagem: { ...antes.detalhe.triagem, situacao: 'falhou', analiseAtual: null, ultimaAnalise: { numero: 1, situacao, encerradaEm: antes.detalhe.triagem.criadaEm } },
    }
    const service = criarFakeService({ cenarios: [{ ...antes, detalhe }] })
    renderApp(PROCESSO, { triageService: service })
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(screen.getByText(selo)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(service.chamadas.some((chamada) => chamada.metodo === 'reprocessar')).toBe(true))
  })

  it('processo inexistente ou de outra pessoa', async () => {
    renderApp('/triagem/processos/outro', { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    expect(await screen.findByText(/Este processo não existe ou não está entre os que você pode acessar/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar aos processos' })).toBeInTheDocument()
  })
})

describe('resultado: achados e abstenções', () => {
  it('agrupa as 19 verificações nas categorias, sem aprovar nem reprovar o processo', async () => {
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const lista = await screen.findByRole('navigation', { name: 'Verificações por categoria' })
    const grupos = within(lista)
    expect(grupos.getByRole('heading', { name: /Possível problema identificado \(1\)/ })).toBeInTheDocument()
    expect(grupos.getByRole('heading', { name: /Depende de confirmação humana \(2\)/ })).toBeInTheDocument()
    expect(grupos.getByRole('heading', { name: /Verificada sem achado \(16\)/ })).toBeInTheDocument()
    expect(grupos.queryByRole('heading', { name: /Não localizado nos anexos/ })).not.toBeInTheDocument()
    expect(grupos.getAllByRole('button')).toHaveLength(19)
    expect(document.body.textContent).not.toMatch(PROIBIDAS)
  })

  it('mostra o quadro de valores divergentes sem dizer qual documento está certo', async () => {
    const user = userEvent.setup()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    const quadro = within(detalhe).getByRole('region', { name: 'Quadro de valores' })
    expect(within(quadro).getByRole('row', { name: /5\. art\.pdf C3/ })).toBeInTheDocument()
    expect(within(quadro).getAllByRole('row', { name: /F7/ })).toHaveLength(2)
    expect(within(quadro).getByText('O sistema não indica qual documento está correto.')).toBeInTheDocument()
    expect(within(detalhe).getAllByText(/AQR-GCA-018/).length).toBeGreaterThan(0)
  })

  it('pacote não confirmado como completo: ausência fica inconclusiva, nunca "não localizado"', async () => {
    const user = userEvent.setup()
    renderApp('/triagem/processos/' + cenarioIncompleto().detalhe.triagem.id, { triageService: criarFakeService({ cenarios: [cenarioIncompleto()] }) })
    const lista = await screen.findByRole('navigation', { name: 'Verificações por categoria' })
    expect(within(lista).getByRole('heading', { name: /Verificação inconclusiva \(2\)/ })).toBeInTheDocument()
    expect(within(lista).queryByRole('heading', { name: /Não localizado nos anexos/ })).not.toBeInTheDocument()
    const detalhe = await abrirVerificacao(user, /Memorial descritivo em PDF/)
    expect(within(detalhe).getByText(/Motivo:/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(PROIBIDAS)
  })

  it('condição pendente aponta para a confirmação no enquadramento', async () => {
    const user = userEvent.setup()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const detalhe = await abrirVerificacao(user, /Guia de diretrizes urbanísticas/)
    expect(within(detalhe).getByText(/Aguarda confirmação do servidor: area-situacao-acima-2ha/)).toBeInTheDocument()
  })
})

describe('evidência no documento', () => {
  it('abre o PDF na página da evidência, com a região destacada e navegação entre páginas', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    renderApp(PROCESSO, { triageService: service })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    const linha = within(detalhe).getByRole('row', { name: /5\. art\.pdf C3/ })
    await user.click(within(linha).getByRole('button', { name: 'Ver no documento' }))

    const painel = await screen.findByRole('dialog', { name: 'Evidência no documento' })
    expect(within(painel).getByText('5. art.pdf')).toBeInTheDocument()
    expect(within(painel).getByText(/AQR-GCA-018 · Lote "C3"/)).toBeInTheDocument()
    expect(await within(painel).findByText(/página da evidência/)).toHaveTextContent('Página 1 de 3 · página da evidência')
    expect(within(painel).getAllByTestId('destaque-evidencia')).toHaveLength(1)
    expect(service.chamadas.find((chamada) => chamada.metodo === 'conteudo')?.argumentos).toEqual([ID, ANEXO_ART])

    await user.click(within(painel).getByRole('button', { name: 'Próxima página' }))
    expect(within(painel).getByText(/Página/, { selector: 'p' })).toHaveTextContent('Página 2 de 3')
    expect(within(painel).queryByTestId('destaque-evidencia')).not.toBeInTheDocument()
    await user.click(within(painel).getByRole('button', { name: 'Voltar à página da evidência (1)' }))
    expect(within(painel).getAllByTestId('destaque-evidencia')).toHaveLength(1)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('arquivo expurgado depois do prazo de guarda: mostra a evidência registrada e não busca o arquivo', async () => {
    const user = userEvent.setup()
    const { antes } = cenarioDivergencia()
    const anexos = defined(antes.anexos[1], 'anexos')
    const cenario: Cenario = { ...antes, anexos: { 1: { ...anexos, itens: anexos.itens.map((item) => ({ ...item, conteudo: 'expurgado' as const })) } } }
    const service = criarFakeService({ cenarios: [cenario] })
    renderApp(PROCESSO, { triageService: service })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    await user.click(within(within(detalhe).getByRole('row', { name: /5\. art\.pdf C3/ })).getByRole('button', { name: 'Ver no documento' }))
    const painel = await screen.findByRole('dialog', { name: 'Evidência no documento' })
    expect(within(painel).getByText(/O arquivo original já foi expurgado/)).toBeInTheDocument()
    expect(within(painel).getByText('Trecho lido')).toBeInTheDocument()
    expect(service.chamadas.some((chamada) => chamada.metodo === 'conteudo')).toBe(false)
  })

  it('servidor responde 404 para o conteúdo: avisa que o original não está mais disponível', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes], erros: { conteudo: new TriagemServiceError(404, 'CONTEUDO_INDISPONIVEL', 'Conteúdo indisponível.') } })
    renderApp(PROCESSO, { triageService: service })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    await user.click(within(within(detalhe).getByRole('row', { name: /5\. art\.pdf C3/ })).getByRole('button', { name: 'Ver no documento' }))
    const painel = await screen.findByRole('dialog', { name: 'Evidência no documento' })
    expect(await within(painel).findByText(/O arquivo original não está mais disponível/)).toBeInTheDocument()
  })

  it('formato sem desenho no navegador (DXF) mostra só metadados', async () => {
    const user = userEvent.setup()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    await screen.findByRole('heading', { name: 'Documentos recebidos' })
    const documentos = defined(document.getElementById('documentos'), 'seção documentos')
    const item = defined(within(documentos).getByText(/prancha\.dxf/).closest('li'), 'item dxf')
    await user.click(within(item).getByRole('button', { name: /Abrir o documento/ }))
    const painel = await screen.findByRole('dialog', { name: 'Evidência no documento' })
    expect(within(painel).getByText(/Este formato \(DXF\) não tem visualização no navegador/)).toBeInTheDocument()
  })
})

describe('revisão humana', () => {
  it('descartar exige justificativa e registra a revisão sem alterar o resultado da regra', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    renderApp(PROCESSO, { triageService: service })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    const form = within(detalhe).getByRole('form', { name: 'Revisar Dados da ART ou RRT batem com o requerimento e a matrícula' })
    await user.click(within(form).getByRole('radio', { name: /Descartar o achado/ }))
    const registrar = within(form).getByRole('button', { name: 'Registrar revisão' })
    expect(registrar).toBeDisabled()
    await user.type(within(form).getByRole('textbox', { name: /Justificativa \(obrigatória/ }), 'abc')
    expect(registrar).toBeDisabled()
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), ' lote conferido na ART física')
    await user.click(registrar)
    expect(await screen.findByText(/A revisão ficou registrada com seu usuário e a data/)).toBeInTheDocument()
    const revisar = defined(service.chamadas.find((chamada) => chamada.metodo === 'revisar'), 'revisar')
    expect(revisar.argumentos).toEqual([ID, { versaoEsperada: 2, decisao: 'descartado', regraId: 'AQR-GCA-018', justificativa: 'abc lote conferido na ART física' }])
    expect(document.body.textContent).not.toMatch(PROIBIDAS)
  })

  it('confirma o achado com o teclado', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    renderApp(PROCESSO, { triageService: service })
    const botao = await screen.findByRole('button', { name: /Dados da ART ou RRT batem/ })
    botao.focus()
    await user.keyboard('{Enter}')
    const detalhe = await screen.findByRole('article', { name: /Dados da ART ou RRT batem/ })
    expect(botao).toHaveAttribute('aria-current', 'true')
    const confirmar = within(detalhe).getByRole('radio', { name: /Confirmar o achado/ })
    expect(confirmar).toBeChecked()
    within(detalhe).getByRole('button', { name: 'Registrar revisão' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(service.chamadas.find((chamada) => chamada.metodo === 'revisar')?.argumentos[1]).toMatchObject({ decisao: 'confirmado', regraId: 'AQR-GCA-018' }))
  })

  it('conflito de versão (409): explica, não registra e oferece atualizar', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({
      cenarios: [cenarioDivergencia().antes],
      erros: { revisar: new TriagemServiceError(409, 'CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação (versão 3).') },
    })
    renderApp(PROCESSO, { triageService: service })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    await user.click(within(detalhe).getByRole('button', { name: 'Registrar revisão' }))
    const alerta = await within(detalhe).findByRole('alert')
    expect(alerta).toHaveTextContent('O processo mudou enquanto você trabalhava')
    expect(alerta).toHaveTextContent('Sua ação não foi registrada')
    const detalhesAntes = service.chamadas.filter((chamada) => chamada.metodo === 'detalhe').length
    await user.click(within(alerta).getByRole('button', { name: 'Atualizar o processo' }))
    await waitFor(() => expect(service.chamadas.filter((chamada) => chamada.metodo === 'detalhe').length).toBeGreaterThan(detalhesAntes))
  })

  it('corrige um campo com justificativa, mostrando o valor anterior e o novo', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Corrigir Lote de art.pdf' }))
    const form = screen.getByRole('form', { name: 'Corrigir Lote' })
    expect(within(form).getByText('“C3”')).toBeInTheDocument()
    const valor = within(form).getByRole('textbox', { name: 'Valor correto' })
    await user.clear(valor)
    await user.type(valor, 'F7')
    const registrar = within(form).getByRole('button', { name: 'Só salvar a correção' })
    expect(registrar).toBeDisabled()
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Leitura errada do OCR')
    await user.click(registrar)
    expect(await screen.findByText(/Correção de Lote registrada \(de “C3” para “F7”\)/)).toBeInTheDocument()
    expect(defined(service.chamadas.find((chamada) => chamada.metodo === 'revisar')).argumentos[1]).toEqual({
      versaoEsperada: 2,
      decisao: 'corrigido',
      campoId: CAMPO_LOTE_ART,
      novoValor: 'F7',
      justificativa: 'Leitura errada do OCR',
    })
  })

  it('confirmar a completude exige justificativa', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioIncompleto()] })
    renderApp('/triagem/processos/' + cenarioIncompleto().detalhe.triagem.id, { triageService: service })
    const form = await screen.findByRole('form', { name: 'Completude do pacote' })
    const registrar = within(form).getByRole('button', { name: 'Registrar completude' })
    expect(registrar).toBeDisabled()
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Conferido com o protocolo')
    await user.click(registrar)
    await waitFor(() =>
      expect(service.chamadas.find((chamada) => chamada.metodo === 'confirmar')?.argumentos[1]).toMatchObject({ tipo: 'integridade', valor: 'completo', justificativa: 'Conferido com o protocolo' }),
    )
  })
})

describe('reprocessamento e histórico', () => {
  it('reprocessa, mantém a análise anterior e compara as duas', async () => {
    const user = userEvent.setup()
    const { antes, depois } = cenarioDivergencia()
    const service = criarFakeService({ cenarios: [antes], depoisDeReprocessar: { [ID]: depois } })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Reprocessar' }))
    expect(await screen.findByText(/Análise nº 2 criada\..*A análise anterior continua no histórico\./)).toBeInTheDocument()
    expect(defined(service.chamadas.find((chamada) => chamada.metodo === 'reprocessar')).argumentos).toEqual([ID, 2])

    expect(await screen.findByRole('heading', { name: 'Visão geral da análise nº 2' })).toBeInTheDocument()
    const historico = defined(document.getElementById('historico'), 'histórico')
    expect(within(historico).getByText('Campos corrigidos por servidor')).toBeInTheDocument()
    expect(within(historico).getByText(/“C3”/)).toBeInTheDocument()
    const comparacao = await within(historico).findByRole('region', { name: 'Comparação entre as análises 1 e 2' })
    const linha = within(comparacao).getByRole('row', { name: /Dados da ART ou RRT batem/ })
    expect(within(linha).getByText('mudou')).toBeInTheDocument()
    expect(within(linha).getByText('Possível problema identificado')).toBeInTheDocument()
    expect(within(linha).getByText('Verificada sem achado')).toBeInTheDocument()

    // Regressão: o aviso do reprocessamento não pode esconder o da ação seguinte.
    const detalhe = await abrirVerificacao(user, /Data de emissão da matrícula/)
    await user.click(within(detalhe).getByRole('button', { name: 'Registrar revisão' }))
    expect(await screen.findByText('Achado confirmado (AQR-GCA-009). A revisão ficou registrada com seu usuário e a data.')).toBeInTheDocument()
    expect(screen.queryByText(/Análise nº 2 criada/)).not.toBeInTheDocument()
  })

  it('mostra uma análise anterior só para consulta', async () => {
    const user = userEvent.setup()
    const { depois } = cenarioDivergencia()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [depois] }) })
    await screen.findByRole('heading', { name: 'Visão geral da análise nº 2' })
    await user.selectOptions(screen.getByRole('combobox', { name: /Análise exibida/ }), '1')
    expect(await screen.findByRole('heading', { name: 'Visão geral da análise nº 1' })).toBeInTheDocument()
    expect(screen.getByText(/Você está vendo uma análise anterior/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reprocessar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar revisão' })).not.toBeInTheDocument()
  })
})

describe('permissões', () => {
  it('administrador vê o processo de outro analista só para consulta', async () => {
    const { antes } = cenarioDivergencia()
    const cenario: Cenario = { ...antes, detalhe: schemas.detalhe.parse(respostasReais.detalheAdmin) }
    renderApp(PROCESSO, { triageService: criarFakeService({ status: statusAdmin(), cenarios: [cenario] }) })
    expect(await screen.findByText(/Você acompanha este processo/)).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Verificações' })
    expect(screen.queryByRole('button', { name: 'Reprocessar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar revisão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Corrigir / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirmar modalidade/ })).not.toBeInTheDocument()
  })

  it('403 do servidor vira mensagem clara', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes], erros: { reprocessar: new TriagemServiceError(403, 'SEM_PERMISSAO', 'Só o analista que criou o processo pode reprocessá-lo.') } })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Reprocessar' }))
    expect(await screen.findByText('Sem permissão para esta ação')).toBeInTheDocument()
  })
})

describe('acessibilidade da triagem (axe)', () => {
  it('lista, nova triagem e processo não têm violações', async () => {
    const service = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    const lista = renderApp('/triagem', { triageService: service })
    await screen.findByRole('link', { name: 'Abrir o processo B9A8DE93' })
    expect(await violacoes(lista.container)).toEqual([])
    lista.unmount()

    const nova = renderApp('/triagem/nova', { triageService: service })
    await screen.findByLabelText('Selecionar arquivos do pacote')
    expect(await violacoes(nova.container)).toEqual([])
    nova.unmount()

    const processo = renderApp(PROCESSO, { triageService: service })
    await screen.findByRole('heading', { name: 'Verificações' })
    expect(await violacoes(processo.container)).toEqual([])
  }, 20000)

  it('painel de evidência aberto não tem violações', async () => {
    const user = userEvent.setup()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    await user.click(within(within(detalhe).getByRole('row', { name: /5\. art\.pdf C3/ })).getByRole('button', { name: 'Ver no documento' }))
    const painel = await screen.findByRole('dialog', { name: 'Evidência no documento' })
    await within(painel).findByText(/página da evidência/)
    expect(await violacoes(document.body)).toEqual([])
  }, 20000)
})

describe('E10.1: estados, linguagem e correção com reprocessamento', () => {
  it('separa processamento, revisão humana, condições pendentes e não avaliáveis; "revisado" não encerra a triagem', async () => {
    const { antes } = cenarioDivergencia()
    const triagem = { ...antes.detalhe.triagem, situacao: 'revisado' as const, achados: 2, pendentesRevisao: 0, condicoesPendentes: 1, naoAvaliaveis: 0 }
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [{ ...antes, detalhe: { ...antes.detalhe, triagem } }] }) })
    const estado = await screen.findByRole('region', { name: 'Estado do processo' })
    expect(within(estado).getByText('Processamento').nextElementSibling).toHaveTextContent('Análise concluída (análise nº 1)')
    expect(within(estado).getByText('Revisão humana dos achados').nextElementSibling).toHaveTextContent('2 achados revisados')
    expect(within(estado).getByRole('link', { name: '1 a confirmar' })).toHaveAttribute('href', '#enquadramento')
    expect(within(estado).getByText('Verificações não avaliáveis').nextElementSibling).toHaveTextContent('Nenhuma')
    expect(within(estado).getByText(/Os achados foram revisados, mas uma verificação ainda aguarda a confirmação de enquadramento/)).toBeInTheDocument()
    expect(screen.queryByText('Revisado', { exact: true })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(PROIBIDAS)
  })

  it('título legível sem perder o ID, o título do catálogo, a versão, a condição de aplicação e a fonte', async () => {
    const user = userEvent.setup()
    renderApp(PROCESSO, { triageService: criarFakeService({ cenarios: [cenarioDivergencia().antes] }) })
    const detalhe = await abrirVerificacao(user, /Dados da ART ou RRT batem/)
    expect(within(detalhe).getByRole('heading', { name: 'Dados da ART ou RRT batem com o requerimento e a matrícula' })).toBeInTheDocument()
    expect(within(detalhe).getByText(/título no catálogo: “Campos da ART RRT coerentes”/)).toBeInTheDocument()
    expect(within(detalhe).getByText('AQR-GCA-018@1.0-review+fd9b3e3b9db5')).toBeInTheDocument()
    expect(within(detalhe).getByText('Quando se aplica').nextElementSibling).toHaveTextContent('ART/RRT legível')
    expect(within(detalhe).getByText(/art\.3 §3/)).toBeInTheDocument()
    expect(within(detalhe).getAllByRole('link', { name: 'fonte oficial' }).length).toBeGreaterThan(0)
  })

  it('"Salvar correção e reprocessar": salva, reprocessa com a versão devolvida e mostra a nova análise', async () => {
    const user = userEvent.setup()
    const { antes, depois } = cenarioDivergencia()
    const service = criarFakeService({ cenarios: [antes], depoisDeReprocessar: { [ID]: depois } })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Corrigir Lote de art.pdf' }))
    const form = screen.getByRole('form', { name: 'Corrigir Lote' })
    await user.clear(within(form).getByRole('textbox', { name: 'Valor correto' }))
    await user.type(within(form).getByRole('textbox', { name: 'Valor correto' }), 'F7')
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Lote conferido na ART')
    await user.click(within(form).getByRole('button', { name: 'Salvar correção e reprocessar' }))
    expect(await screen.findByText(/Correção de Lote registrada \(de “C3” para “F7”\) e análise nº 2 solicitada\. A análise anterior continua no histórico\./)).toBeInTheDocument()
    const metodos = service.chamadas.map((chamada) => chamada.metodo).filter((metodo) => metodo === 'revisar' || metodo === 'reprocessar')
    expect(metodos).toEqual(['revisar', 'reprocessar'])
    // Reprocessa com a versão que o salvamento devolveu (2 → 3), não com a antiga.
    expect(defined(service.chamadas.find((chamada) => chamada.metodo === 'reprocessar')).argumentos).toEqual([ID, 3])
    expect(await screen.findByRole('heading', { name: 'Visão geral da análise nº 2' })).toBeInTheDocument()
  })

  it('se o reprocessamento falha depois de salvar, diz que a correção ficou registrada', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({
      cenarios: [cenarioDivergencia().antes],
      erros: { reprocessar: new TriagemServiceError(503, 'FILA_CHEIA', 'A fila da triagem está cheia.') },
    })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Corrigir Lote de art.pdf' }))
    const form = screen.getByRole('form', { name: 'Corrigir Lote' })
    await user.clear(within(form).getByRole('textbox', { name: 'Valor correto' }))
    await user.type(within(form).getByRole('textbox', { name: 'Valor correto' }), 'F7')
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Lote conferido na ART')
    await user.click(within(form).getByRole('button', { name: 'Salvar correção e reprocessar' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('A correção de Lote foi registrada (de “C3” para “F7”), mas a nova análise não foi concluída: A fila da triagem está cheia.')
    expect(service.chamadas.filter((chamada) => chamada.metodo === 'revisar')).toHaveLength(1)
  })

  it('conflito ao salvar: nada é reprocessado e a tela oferece atualizar', async () => {
    const user = userEvent.setup()
    const service = criarFakeService({
      cenarios: [cenarioDivergencia().antes],
      erros: { revisar: new TriagemServiceError(409, 'CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação.') },
    })
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Corrigir Lote de art.pdf' }))
    const form = screen.getByRole('form', { name: 'Corrigir Lote' })
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Lote conferido na ART')
    await user.click(within(form).getByRole('button', { name: 'Salvar correção e reprocessar' }))
    expect(await within(form).findByText('O processo mudou enquanto você trabalhava')).toBeInTheDocument()
    expect(service.chamadas.some((chamada) => chamada.metodo === 'reprocessar')).toBe(false)
  })

  it('cliques repetidos não duplicam a correção', async () => {
    const user = userEvent.setup()
    const base = criarFakeService({ cenarios: [cenarioDivergencia().antes] })
    let liberar: () => void = () => undefined
    let revisoes = 0
    const service: TriagemService = {
      ...base,
      async revisar(id, entrada) {
        revisoes += 1
        await new Promise<void>((resolve) => {
          liberar = resolve
        })
        return base.revisar(id, entrada)
      },
    }
    renderApp(PROCESSO, { triageService: service })
    await user.click(await screen.findByRole('button', { name: 'Corrigir Lote de art.pdf' }))
    const form = screen.getByRole('form', { name: 'Corrigir Lote' })
    await user.type(within(form).getByRole('textbox', { name: /Justificativa/ }), 'Lote conferido na ART')
    const botao = within(form).getByRole('button', { name: 'Salvar correção e reprocessar' })
    botao.click()
    botao.click()
    within(form).getByRole('button', { name: 'Só salvar a correção' }).click()
    await waitFor(() => expect(revisoes).toBe(1))
    liberar()
    await waitFor(() => expect(base.chamadas.some((chamada) => chamada.metodo === 'revisar')).toBe(true))
    expect(revisoes).toBe(1)
  })
})
