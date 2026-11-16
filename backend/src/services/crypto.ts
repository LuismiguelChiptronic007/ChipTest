const PASSWORD_ITERATIONS = 100_000
const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_BITS = 256
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

interface SessionPayload {
  sub: string
  sv: number
  iat: number
  exp: number
}

function encodeBase64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function copyBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

async function passwordKey(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: copyBufferSource(salt), iterations, hash: 'SHA-256' },
    material,
    PASSWORD_KEY_BITS,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES))
  const key = await passwordKey(password, salt)
  return `pbkdf2$${PASSWORD_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(key)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, iterationText, saltText, hashText] = storedHash.split('$')
  const iterations = Number(iterationText)
  if (
    algorithm !== 'pbkdf2'
    || !Number.isInteger(iterations)
    || iterations < 100_000
    || iterations > 1_000_000
    || !saltText
    || !hashText
  ) {
    return false
  }

  try {
    const salt = decodeBase64Url(saltText)
    const expected = decodeBase64Url(hashText)
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: copyBufferSource(salt), iterations, hash: 'SHA-256' },
      material,
      expected.length * 8,
    )
    const actual = new Uint8Array(bits)
    if (actual.length !== expected.length) return false

    let difference = 0
    for (let index = 0; index < actual.length; index += 1) {
      difference |= actual[index]! ^ expected[index]!
    }
    return difference === 0
  } catch {
    return false
  }
}

async function jwtKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.')
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signSession(userId: string, sessionVersion: number, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    sub: userId,
    sv: sessionVersion,
    iat: now,
    exp: now + SESSION_DURATION_SECONDS,
  })))
  const data = `${header}.${payload}`
  const signature = await crypto.subtle.sign('HMAC', await jwtKey(secret), new TextEncoder().encode(data))
  return `${data}.${encodeBase64Url(signature)}`
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerPart, payloadPart, signaturePart] = parts
    const header: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerPart!)))
    const payload: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart!)))
    if (
      typeof header !== 'object'
      || header === null
      || !('alg' in header)
      || header.alg !== 'HS256'
      || typeof payload !== 'object'
      || payload === null
      || !('sub' in payload)
      || typeof payload.sub !== 'string'
      || !('sv' in payload)
      || typeof payload.sv !== 'number'
      || !('exp' in payload)
      || typeof payload.exp !== 'number'
      || payload.exp <= Math.floor(Date.now() / 1000)
      || !('iat' in payload)
      || typeof payload.iat !== 'number'
    ) {
      return null
    }

    const valid = await crypto.subtle.verify(
      'HMAC',
      await jwtKey(secret),
      copyBufferSource(decodeBase64Url(signaturePart!)),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    )
    return valid ? payload as SessionPayload : null
  } catch {
    return null
  }
}

export function createResetToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hashResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return encodeBase64Url(digest)
}
