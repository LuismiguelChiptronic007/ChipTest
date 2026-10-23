export function mensagemDeErro(error: unknown, padrao: string): string {
  if (typeof error !== 'object' || error === null) return padrao

  if ('statusMessage' in error && typeof error.statusMessage === 'string') {
    return error.statusMessage
  }

  if ('data' in error && typeof error.data === 'object' && error.data !== null) {
    const data = error.data
    if ('statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
    if ('message' in data && typeof data.message === 'string') {
      return data.message
    }
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }

  return padrao
}
