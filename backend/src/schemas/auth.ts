import { z } from 'zod'

const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.')
  .regex(/[a-z]/, 'A senha deve conter uma letra minúscula.')
  .regex(/[A-Z]/, 'A senha deve conter uma letra maiúscula.')
  .regex(/\d/, 'A senha deve conter um número.')

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe seu nome completo.').max(120, 'O nome deve ter no máximo 120 caracteres.'),
    email: z.string().trim().email('Informe um e-mail válido.').max(254, 'O e-mail é muito longo.').transform(value => value.toLowerCase()),
    setorId: z.string().uuid('Selecione um setor válido.'),
    senha: senhaSchema,
    confirmarSenha: z.string(),
  })
  .refine(data => data.senha === data.confirmarSenha, {
    message: 'As senhas não conferem.',
    path: ['confirmarSenha'],
  })

export const emailSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').max(254, 'O e-mail é muito longo.').transform(value => value.toLowerCase()),
})

export const loginSchema = z.object({
  email: emailSchema.shape.email,
  senha: z.string().min(1, 'Informe sua senha.'),
})

const camposNovaSenhaSchema = z.object({
  senha: senhaSchema,
  confirmarSenha: z.string(),
})

export const novaSenhaSchema = camposNovaSenhaSchema.refine(data => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem.',
  path: ['confirmarSenha'],
})

export const redefinirSenhaSchema = camposNovaSenhaSchema.extend({
  token: z.string().min(40, 'O link de redefinição é inválido.').max(100, 'O link de redefinição é inválido.'),
}).refine(data => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem.',
  path: ['confirmarSenha'],
})

export const atualizarUsuarioSchema = z.object({
  id: z.string().uuid('Usuário inválido.'),
  papel: z.enum(['admin', 'engenharia', 'bancada', 'campo']).optional(),
  ativo: z.boolean().optional(),
}).refine(data => data.papel !== undefined || data.ativo !== undefined, {
  message: 'Informe o papel ou o status que deve ser atualizado.',
})

export type CadastroInput = z.infer<typeof cadastroSchema>
export type LoginInput = z.infer<typeof loginSchema>
