import { describe, expect, it } from 'vitest'
import {
  papelPodeEditarTeste,
  papelPodeTestar,
  criarSnapshotsItensTeste,
  proximoNumeroTeste,
  sugerirStatusTeste,
} from './testes'

describe('regras de testes por item', () => {
  it('sugere o próximo número sequencial por tipo', () => {
    expect(proximoNumeroTeste([1, 2, 4])).toBe(5)
    expect(proximoNumeroTeste([])).toBe(1)
  })

  it('cria snapshots independentes para itens com nomes repetidos', () => {
    const snapshots = criarSnapshotsItensTeste([
      { id: 'item-a', tipo_secao: 'sensores', nome_completo: 'RPM', ordem: 1 },
      { id: 'item-b', tipo_secao: 'sensores', nome_completo: 'RPM', ordem: 2 },
    ])
    expect(snapshots).toEqual([
      { codigo_item_id: 'item-a', tipo_secao: 'sensores', nome_snapshot: 'RPM', ordem: 1 },
      { codigo_item_id: 'item-b', tipo_secao: 'sensores', nome_snapshot: 'RPM', ordem: 2 },
    ])
  })

  it('sugere reprovado quando há ao menos um item reprovado', () => {
    expect(sugerirStatusTeste([{ resultado: 'aprovado' }, { resultado: 'reprovado' }])).toBe('reprovado')
  })

  it('sugere aprovado quando todos os itens foram aprovados ou não se aplicam', () => {
    expect(sugerirStatusTeste([{ resultado: 'aprovado' }, { resultado: 'nao_se_aplica' }])).toBe('aprovado')
  })

  it('sugere cancelado quando há itens sem testar e nenhum reprovado', () => {
    expect(sugerirStatusTeste([{ resultado: 'aprovado' }, { resultado: 'nao_testado' }])).toBe('cancelado')
  })

  it('sugere cancelado se não há itens importados para testar', () => {
    expect(sugerirStatusTeste([])).toBe('cancelado')
  })

  it('bloqueia bancada de criar ou editar testes de campo', () => {
    expect(papelPodeTestar('bancada', 'campo')).toBe(false)
    expect(papelPodeEditarTeste('bancada', 'campo', 'em_andamento')).toBe(false)
  })

  it('permite campo somente no tipo campo e bancada somente no tipo bancada', () => {
    expect(papelPodeTestar('bancada', 'bancada')).toBe(true)
    expect(papelPodeTestar('campo', 'campo')).toBe(true)
    expect(papelPodeTestar('campo', 'bancada')).toBe(false)
  })

  it('permite engenharia nos dois tipos e só admin altera teste finalizado', () => {
    expect(papelPodeTestar('engenharia', 'campo')).toBe(true)
    expect(papelPodeEditarTeste('engenharia', 'campo', 'aprovado')).toBe(false)
    expect(papelPodeEditarTeste('admin', 'campo', 'aprovado')).toBe(true)
  })

  it('respeita cancelado como teste finalizado', () => {
    expect(papelPodeEditarTeste('bancada', 'bancada', 'cancelado')).toBe(false)
  })
})
