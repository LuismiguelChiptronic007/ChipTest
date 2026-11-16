import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { analisarPlanilhaFuncoes, ErroImportacaoPlanilha } from './importacao-funcoes'

function celula(referencia: string, valor: string) {
  const escapado = valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  return `<c r="${referencia}" t="inlineStr"><is><t>${escapado}</t></is></c>`
}

async function criarPlanilha(rows: string[][]) {
  const zip = new JSZip()
  const referencias = ['AI', 'AJ', 'AP', 'AT', 'AX']
  const conteudoLinhas = rows.map((row, index) => {
    const numero = index + 4
    return `<row r="${numero}">${row.map((value, valueIndex) => celula(`${referencias[valueIndex]}${numero}`, value)).join('')}</row>`
  }).join('')
  zip.file('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Funções" sheetId="1" r:id="rId1"/></sheets></workbook>')
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
  zip.file('xl/worksheets/sheet1.xml', `<worksheet><sheetData>${conteudoLinhas}</sheetData></worksheet>`)
  return zip.generateAsync({ type: 'uint8array' })
}

describe('importação das funções da planilha Excel', () => {
  it('lê as cinco colunas e agrupa os tipos em suas categorias', async () => {
    const bytes = await criarPlanilha([
      ['Versão_ONTIME', 'Tipo da Função', 'Função Dieseldiag', 'Equipamento Base', 'Desenvolvido'],
      ['2026-MARÇO', 'INFORMAÇÃO CENTRAL', 'Função básica', 'PDL 8100', 'Liberado Teste'],
      ['2026-MARÇO', 'SENSORES', 'Sensor de rotação', 'PDL 8100', 'Liberado Teste'],
      ['2026-MARÇO', 'ESTADOS', 'Estado de direção', 'PDL 8100', 'Em teste'],
      ['2026-MARÇO', 'ATUADORES', 'Acionamento', 'PDL 8100', 'Não desenvolvido'],
      ['2026-MARÇO', 'AJUSTE', 'Ajuste de pressão', 'PDL 8100', 'Liberado Teste'],
      ['2026-MARÇO', 'PARAMETRIZAÇÃO', 'Parâmetro configurável', 'PDL 8100', 'Liberado Teste'],
      ['2026-MARÇO', 'FUNÇÃO ADVANCED', 'Função avançada', 'PDL 8100', 'Liberado Teste'],
    ])

    await expect(analisarPlanilhaFuncoes(bytes)).resolves.toEqual([
      { category: 'basico', versionOntime: '2026-MARÇO', functionType: 'INFORMAÇÃO CENTRAL', functionDieseldiag: 'Função básica', equipmentBase: 'PDL 8100', developed: 'Liberado Teste' },
      { category: 'sensores', versionOntime: '2026-MARÇO', functionType: 'SENSORES', functionDieseldiag: 'Sensor de rotação', equipmentBase: 'PDL 8100', developed: 'Liberado Teste' },
      { category: 'estados', versionOntime: '2026-MARÇO', functionType: 'ESTADOS', functionDieseldiag: 'Estado de direção', equipmentBase: 'PDL 8100', developed: 'Em teste' },
      { category: 'atuadores', versionOntime: '2026-MARÇO', functionType: 'ATUADORES', functionDieseldiag: 'Acionamento', equipmentBase: 'PDL 8100', developed: 'Não desenvolvido' },
      { category: 'ajustes', versionOntime: '2026-MARÇO', functionType: 'AJUSTE', functionDieseldiag: 'Ajuste de pressão', equipmentBase: 'PDL 8100', developed: 'Liberado Teste' },
      { category: 'parametrizacoes', versionOntime: '2026-MARÇO', functionType: 'PARAMETRIZAÇÃO', functionDieseldiag: 'Parâmetro configurável', equipmentBase: 'PDL 8100', developed: 'Liberado Teste' },
      { category: 'funcao_avancada', versionOntime: '2026-MARÇO', functionType: 'FUNÇÃO ADVANCED', functionDieseldiag: 'Função avançada', equipmentBase: 'PDL 8100', developed: 'Liberado Teste' },
    ])
  })

  it('recusa tipos de função desconhecidos em vez de descartá-los', async () => {
    const bytes = await criarPlanilha([
      ['Versão_ONTIME', 'Tipo da Função', 'Função Dieseldiag', 'Equipamento Base', 'Desenvolvido'],
      ['2026-MARÇO', 'CATEGORIA DESCONHECIDA', 'Função', '', ''],
    ])

    await expect(analisarPlanilhaFuncoes(bytes)).rejects.toBeInstanceOf(ErroImportacaoPlanilha)
  })
})
