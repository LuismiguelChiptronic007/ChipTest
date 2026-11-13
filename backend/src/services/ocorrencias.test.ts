import { describe, expect, it } from 'vitest'
import { criarOcorrenciaSchema } from '../schemas/ocorrencias'
import {
  arquivoOcorrenciaValido,
  itemTestePodeGerarOcorrencia,
  papelPodeEditarConteudoOcorrencia,
  papelPodeExcluirAnexo,
  papelPodeGerenciarFluxoOcorrencia,
  transicaoOcorrenciaPermitida,
} from './ocorrencias'
import { TAMANHO_MAXIMO_ANEXO_BYTES } from './ocorrencias-config'

describe('permissões de ocorrências', () => {
  it('permite editar conteúdo ao relator, engenharia e admin', () => {
    expect(papelPodeEditarConteudoOcorrencia('campo', 'u1', 'u1')).toBe(true)
    expect(papelPodeEditarConteudoOcorrencia('engenharia', 'u2', 'u1')).toBe(true)
    expect(papelPodeEditarConteudoOcorrencia('admin', 'u3', 'u1')).toBe(true)
    expect(papelPodeEditarConteudoOcorrencia('bancada', 'u2', 'u1')).toBe(false)
  })

  describe('criação de ocorrência', () => {
    const entradaBase = {
      codigoId: 'f3c6f066-8057-4b61-8b66-8fc6ce8c7de0',
      tipoTeste: 'Teste de bancada',
      titulo: 'Falha observada',
      descricao: 'O resultado diverge do esperado.',
      gravidade: 'media',
    }

    it('exige e valida tipo de teste, aceita o status inicial e usa Erro por padrão', () => {
      expect(criarOcorrenciaSchema.parse(entradaBase)).toMatchObject({
        tipoTeste: 'Teste de bancada',
        status: 'aberta',
      })
      expect(criarOcorrenciaSchema.parse({ ...entradaBase, status: 'em_analise' }).status).toBe('em_analise')
      expect(criarOcorrenciaSchema.safeParse({ ...entradaBase, tipoTeste: ' ' }).success).toBe(false)
    })
  })

  it('reserva alterações de status, responsável e resolução a engenharia e admin', () => {
    expect(papelPodeGerenciarFluxoOcorrencia('engenharia')).toBe(true)
    expect(papelPodeGerenciarFluxoOcorrencia('admin')).toBe(true)
    expect(papelPodeGerenciarFluxoOcorrencia('campo')).toBe(false)
    expect(papelPodeGerenciarFluxoOcorrencia('bancada')).toBe(false)
  })

  it('permite excluir anexos apenas ao relator, engenharia e admin', () => {
    expect(papelPodeExcluirAnexo('campo', 'u1', 'u1')).toBe(true)
    expect(papelPodeExcluirAnexo('engenharia', 'u3', 'u1')).toBe(true)
    expect(papelPodeExcluirAnexo('admin', 'u4', 'u1')).toBe(true)
    expect(papelPodeExcluirAnexo('bancada', 'u2', 'u1')).toBe(false)
  })
})

describe('fluxo de status de ocorrência', () => {
  it('permite avançar para análise e resolução e reabrir uma ocorrência', () => {
    expect(transicaoOcorrenciaPermitida('aberta', 'em_analise')).toBe(true)
    expect(transicaoOcorrenciaPermitida('em_analise', 'resolvida')).toBe(true)
    expect(transicaoOcorrenciaPermitida('resolvida', 'em_analise')).toBe(true)
  })

  it('rejeita saltos de fluxo e considera descartada um estado que pode ser reaberto', () => {
    expect(transicaoOcorrenciaPermitida('aberta', 'resolvida')).toBe(false)
    expect(transicaoOcorrenciaPermitida('resolvida', 'aberta')).toBe(false)
    expect(transicaoOcorrenciaPermitida('descartada', 'em_analise')).toBe(true)
  })
})

describe('validação de anexo', () => {
  it('valida extensão permitida e tamanho máximo configurado', () => {
    expect(arquivoOcorrenciaValido(
      { nomeOriginal: 'foto.webp', tipoMime: 'image/webp', tamanhoBytes: 1024 },
      TAMANHO_MAXIMO_ANEXO_BYTES,
    )).toBe(true)
    expect(arquivoOcorrenciaValido(
      { nomeOriginal: 'foto.exe', tipoMime: 'image/webp', tamanhoBytes: 1024 },
      TAMANHO_MAXIMO_ANEXO_BYTES,
    )).toBe(false)
    expect(arquivoOcorrenciaValido(
      { nomeOriginal: 'foto.png', tipoMime: 'image/png', tamanhoBytes: TAMANHO_MAXIMO_ANEXO_BYTES + 1 },
      TAMANHO_MAXIMO_ANEXO_BYTES,
    )).toBe(false)
  })

  it('só permite criar uma ocorrência associada a item reprovado', () => {
    expect(itemTestePodeGerarOcorrencia('reprovado')).toBe(true)
    expect(itemTestePodeGerarOcorrencia('aprovado')).toBe(false)
    expect(itemTestePodeGerarOcorrencia('nao_testado')).toBe(false)
  })
})
