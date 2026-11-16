import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { analisarDocx, sanitizarConteudoHtml } from './importacao-docx'

describe('análise de documentos DOCX', () => {
  it('converte o exemplo em itens de Heading 2 e exclui falhas e texto corrido', async () => {
    const arquivo = await readFile(new URL('../../../docs/exemplo-importacao.docx', import.meta.url))
    const resultado = await analisarDocx({
      nomeArquivo: 'CHP-0231.docx',
      bytes: arquivo,
    })

    expect(resultado.codigoSugerido).toBe('CHP-0231')
    expect(resultado.secoes).toHaveLength(8)
    expect(resultado.secoes.find(secao => secao.tipoSecao === 'dados_central')?.itens).toHaveLength(2)
    expect(resultado.secoes.find(secao => secao.tipoSecao === 'sensores')?.itens[0]).toMatchObject({
      nomeOriginal: 'Rotação do motor',
      nomePt: 'Engine speed',
    })
    expect(resultado.secoes.find(secao => secao.tipoSecao === 'estados')?.itens).toHaveLength(1)
    expect(resultado.secoes.find(secao => secao.status === 'fora_escopo')).toMatchObject({
      tituloOriginal: 'Comando de código de falhas',
      itens: [],
    })
    expect(resultado.secoes.flatMap(secao => secao.itens).some(item => item.nomeCompleto.includes('parágrafo'))).toBe(false)
  })

  it('remove atributos ativos e tags perigosas do HTML', () => {
    expect(sanitizarConteudoHtml('<p onclick="alert(1)">Texto</p><script>alert(1)</script>'))
      .toBe('<p>Texto</p>')
    expect(sanitizarConteudoHtml('<p class="fixed inset-0">Classe ativa</p><p class="Heading 2">Título</p>'))
      .toBe('<p>Classe ativa</p><p class="Heading 2">Título</p>')
  })
})
