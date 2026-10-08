import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeFile } from '@/test/files'
import { renderApp } from '@/test/render'

/** A página é carregada sob demanda; aguarda o título antes de interagir. */
async function openSetup() {
  const utils = renderApp('/comparacao')
  await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
  return utils
}

function slot(name: 'original' | 'updated') {
  return screen.getByRole('region', { name: name === 'original' ? 'Documento original' : 'Documento atualizado' })
}

function fileInput(name: 'original' | 'updated') {
  return within(slot(name)).getByLabelText(/\(PDF\)$/)
}

describe('Comparação de PDFs — seleção de arquivos', () => {
  it('só habilita a comparação com os dois documentos válidos', async () => {
    const user = userEvent.setup()
    await openSetup()
    const compare = screen.getByRole('button', { name: 'Comparar documentos' })
    expect(compare).toBeDisabled()
    expect(screen.getByText('Selecione os dois documentos para continuar.')).toBeInTheDocument()

    await user.upload(fileInput('original'), makeFile('versao-1.pdf'))
    expect(await within(slot('original')).findByText('versao-1.pdf')).toBeInTheDocument()
    expect(screen.getByText('Selecione o documento atualizado para continuar.')).toBeInTheDocument()
    expect(compare).toBeDisabled()

    await user.upload(fileInput('updated'), makeFile('versao-2.pdf'))
    expect(await within(slot('updated')).findByText('versao-2.pdf')).toBeInTheDocument()
    expect(compare).toBeEnabled()
  })

  it('mostra erro compreensível para arquivo inválido', async () => {
    const user = userEvent.setup({ applyAccept: false })
    await openSetup()
    await user.upload(fileInput('original'), makeFile('planilha.pdf', 'conteúdo qualquer'))
    expect(
      await screen.findByText('“planilha.pdf” não foi aceito. O conteúdo do arquivo não corresponde a um PDF válido.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comparar documentos' })).toBeDisabled()
  })

  it('permite substituir e remover um arquivo', async () => {
    const user = userEvent.setup()
    await openSetup()
    await user.upload(fileInput('original'), makeFile('primeiro.pdf'))
    await within(slot('original')).findByText('primeiro.pdf')

    await user.upload(fileInput('original'), makeFile('segundo.pdf'))
    expect(await within(slot('original')).findByText('segundo.pdf')).toBeInTheDocument()
    expect(within(slot('original')).queryByText('primeiro.pdf')).not.toBeInTheDocument()

    await user.click(within(slot('original')).getByRole('button', { name: /Remover/ }))
    expect(within(slot('original')).queryByText('segundo.pdf')).not.toBeInTheDocument()
    expect(within(slot('original')).getByText('Arraste o PDF para cá')).toBeInTheDocument()
  })

  it('mantém o arquivo anterior quando a substituição é inválida', async () => {
    const user = userEvent.setup({ applyAccept: false })
    await openSetup()
    await user.upload(fileInput('updated'), makeFile('valido.pdf'))
    await within(slot('updated')).findByText('valido.pdf')
    await user.upload(fileInput('updated'), makeFile('imagem.png', 'x', 'image/png'))
    expect(await within(slot('updated')).findByText(/não foi aceito/)).toBeInTheDocument()
    expect(within(slot('updated')).getByText('valido.pdf')).toBeInTheDocument()
  })

  it('inverte original e atualizado', async () => {
    const user = userEvent.setup()
    await openSetup()
    await user.upload(fileInput('original'), makeFile('a.pdf'))
    await within(slot('original')).findByText('a.pdf')
    await user.click(screen.getByRole('button', { name: /Inverter/ }))
    expect(within(slot('updated')).getByText('a.pdf')).toBeInTheDocument()
    expect(within(slot('original')).queryByText('a.pdf')).not.toBeInTheDocument()
  })

  it('leva ao resultado demonstrativo ao comparar', async () => {
    const user = userEvent.setup()
    const { router } = await openSetup()
    await user.upload(fileInput('original'), makeFile('a.pdf'))
    await user.upload(fileInput('updated'), makeFile('b.pdf'))
    await within(slot('updated')).findByText('b.pdf')
    await user.click(screen.getByRole('button', { name: 'Comparar documentos' }))
    expect(router.state.location.pathname).toBe('/comparacao/resultado')
    expect(await screen.findByText(/Os arquivos selecionados \(a\.pdf e b\.pdf\) não foram processados/)).toBeInTheDocument()
  })
})
