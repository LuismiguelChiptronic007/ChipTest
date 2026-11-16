import { describe, expect, it } from 'vitest'
import {
  atualizarStatusTesteOcorrenciaSchema,
  atualizarTesteOcorrenciaSchema,
  criarTesteOcorrenciaSchema,
  iniciarAnexoTesteOcorrenciaSchema,
} from '../schemas/ocorrencia-testes'
<<<<<<< HEAD
import { atualizarLoadOverviewSchema, criarLoadFunctionSchema } from '../schemas/load-overview'
=======
import { atualizarLoadOverviewSchema } from '../schemas/load-overview'
>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
import { identificarTesteCarga } from './ocorrencia-testes'

const testeValido = {
  kind: 'bancada',
  status: 'pendente',
  testedAt: '2026-10-26T13:00:00.000Z',
  responsibleIds: ['11111111-1111-4111-8111-111111111111'],
  result: 'Aguardando execução',
  notes: null,
  segment: null,
  model: null,
  version: null,
  loadStatus: null,
  structureStatus: null,
  needsBench: null,
  needsField: null,
  benchSolves: null,
}

describe('validação de testes vinculados a ocorrências', () => {
  it('reconhece o vínculo textual do teste de campo ou bancada da carga', () => {
    expect(identificarTesteCarga('CAMPO - 01')).toEqual({ kind: 'campo', sequence: 1 })
    expect(identificarTesteCarga('Bancada · teste 12')).toEqual({ kind: 'bancada', sequence: 12 })
    expect(identificarTesteCarga('Ensaio do veículo')).toBeNull()
  })

  it('aceita dados de teste com tipo, status e data válidos', () => {
    expect(criarTesteOcorrenciaSchema.safeParse(testeValido).success).toBe(true)
  })

  it('valida campos para a tabela geral de testes da carga', () => {
    expect(criarTesteOcorrenciaSchema.safeParse({
      ...testeValido,
      responsibleIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
      segment: 'Diesel',
      model: 'DSD',
      version: 'v2',
      loadStatus: 'aprovada',
      structureStatus: 'reprovada',
      needsBench: false,
      needsField: true,
      benchSolves: null,
    }).success).toBe(true)
    expect(criarTesteOcorrenciaSchema.safeParse({
      ...testeValido,
      responsibleIds: [],
      needsField: 'sim',
    }).success).toBe(false)
  })

  it('aceita somente URLs http(s) e datas de calendário válidas na visão geral', () => {
    const overview = {
      requestNumber: 1,
      launchedOn: '2026-10-26',
      responsibleId: null,
      demandType: 'novo_sistema',
      demandStatus: 'campo_com_programador',
      sgaPrintUrl: 'https://example.com/print',
      systemInfoUrl: null,
      notes: null,
    }
    expect(atualizarLoadOverviewSchema.safeParse(overview).success).toBe(true)
<<<<<<< HEAD
    expect(atualizarLoadOverviewSchema.safeParse({
      ...overview,
      sgaPrintUrl: '/api/codigos/11111111-1111-4111-8111-111111111111/visao-geral/imagens/22222222-2222-4222-8222-222222222222',
    }).success).toBe(true)
    expect(atualizarLoadOverviewSchema.safeParse({ ...overview, sgaPrintUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(atualizarLoadOverviewSchema.safeParse({ ...overview, sgaPrintUrl: '/uploads/foto.png' }).success).toBe(false)
    expect(atualizarLoadOverviewSchema.safeParse({ ...overview, launchedOn: '2026-02-31' }).success).toBe(false)
  })

  it('aceita categorias de atuadores e ajustes para as funções da carga', () => {
    expect(criarLoadFunctionSchema.safeParse({ category: 'atuadores' }).success).toBe(true)
    expect(criarLoadFunctionSchema.safeParse({ category: 'ajustes' }).success).toBe(true)
  })

=======
    expect(atualizarLoadOverviewSchema.safeParse({ ...overview, sgaPrintUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(atualizarLoadOverviewSchema.safeParse({ ...overview, launchedOn: '2026-02-31' }).success).toBe(false)
  })

>>>>>>> 41adb1fc253204582bb8dd3c45979b8c141581c3
  it('rejeita um tipo de teste ou uma data inválidos', () => {
    expect(criarTesteOcorrenciaSchema.safeParse({ ...testeValido, kind: 'misto' }).success).toBe(false)
    expect(criarTesteOcorrenciaSchema.safeParse({ ...testeValido, testedAt: 'ontem' }).success).toBe(false)
  })

  it('exige alterações para atualizar e restringe o status aos valores suportados', () => {
    expect(atualizarTesteOcorrenciaSchema.safeParse({}).success).toBe(false)
    expect(atualizarStatusTesteOcorrenciaSchema.safeParse({ status: 'aprovado' }).success).toBe(true)
    expect(atualizarStatusTesteOcorrenciaSchema.safeParse({ status: 'cancelado' }).success).toBe(false)
  })

  it('valida nome e quantidade coerente de partes dos anexos', () => {
    expect(iniciarAnexoTesteOcorrenciaSchema.safeParse({
      fileName: 'evidencia.pdf',
      tipoMime: 'application/pdf',
      tamanhoBytes: 12,
      totalPartes: 1,
    }).success).toBe(true)
    expect(iniciarAnexoTesteOcorrenciaSchema.safeParse({
      fileName: 'evidencia.pdf',
      tipoMime: 'application/pdf',
      tamanhoBytes: 12,
      totalPartes: 2,
    }).success).toBe(false)
  })
})
