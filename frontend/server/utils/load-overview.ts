import type { H3Event } from 'h3'

function obterId(event: H3Event, nome: string) {
  const value = getRouterParam(event, nome)
  if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `O identificador de ${nome} é inválido.` })
  }
  return value
}

export function obterCodigoId(event: H3Event) {
  return obterId(event, 'id')
}

export function obterFuncaoId(event: H3Event) {
  return obterId(event, 'functionId')
}
