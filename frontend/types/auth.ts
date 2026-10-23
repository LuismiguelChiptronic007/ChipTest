export const papeis = ['admin', 'engenharia', 'bancada', 'campo'] as const

export type Papel = typeof papeis[number]

export interface Perfil {
  id: string
  nome: string
  setor_id: string
  setor: string
  papel: Papel
  ativo: boolean
}

export interface UsuarioSessao {
  id: string
  email: string
}

export interface Setor {
  id: string
  nome: string
}

export interface UsuarioAdmin extends Perfil {
  email: string
  setor: string
}

export type Acao =
  | 'usuarios:ler'
  | 'usuarios:gerenciar'
  | 'codigos:ler'
  | 'codigos:gerenciar'
  | 'codigos:excluir'
  | 'secoes:gerenciar'
  | 'testes:ler'
  | 'testes:bancada'
  | 'testes:campo'
  | 'ocorrencias:relatar'
  | 'ocorrencias:gerenciar'
