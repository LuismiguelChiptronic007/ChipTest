import { describe, expect, it, vi } from 'vitest'
import { createCloudflareApiDatabase } from './database'

describe('adaptador HTTP para Cloudflare D1', () => {
  it('envia consultas preparadas à API e converte o resultado para o formato D1', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: [{
        success: true,
        results: [{ id: 'codigo-1' }],
        meta: { changes: 0, duration: 2 },
      }],
    }), { status: 200 }))
    const db = createCloudflareApiDatabase('conta', 'banco', 'token-secreto', fetcher)

    const registro = await db.prepare('SELECT id FROM codigos WHERE id = ?')
      .bind('codigo-1')
      .first<{ id: string }>()

    expect(registro).toEqual({ id: 'codigo-1' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/conta/d1/database/banco/query',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-secreto' }),
        body: JSON.stringify({ sql: 'SELECT id FROM codigos WHERE id = ?', params: ['codigo-1'] }),
      }),
    )
  })

  it('envia operações em lote numa única chamada e mantém a ordem dos resultados', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: [
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
      ],
    }), { status: 200 }))
    const db = createCloudflareApiDatabase('conta', 'banco', 'token-secreto', fetcher)

    const resultados = await db.batch([
      db.prepare('UPDATE codigos SET modelo = ? WHERE id = ?').bind('Modelo novo', 'codigo-1'),
      db.prepare('INSERT INTO historico_alteracoes (id) VALUES (?)').bind('historico-1'),
    ])

    expect(resultados).toHaveLength(2)
    expect(resultados.map(item => item.meta.changes)).toEqual([1, 1])
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      batch: [
        { sql: 'UPDATE codigos SET modelo = ? WHERE id = ?', params: ['Modelo novo', 'codigo-1'] },
        { sql: 'INSERT INTO historico_alteracoes (id) VALUES (?)', params: ['historico-1'] },
      ],
    })
  })

  it('preserva parâmetros nulos e numéricos e não altera pontos de interrogação no SQL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: [{ success: true, results: [], meta: {} }],
    }), { status: 200 }))
    const db = createCloudflareApiDatabase('conta', 'banco', 'token-secreto', fetcher)

    await db.prepare("SELECT '?' AS literal FROM codigos WHERE motor = ? AND ano = ? AND modelo = ? -- ?")
      .bind(null, 2025, "Modelo d'água")
      .all()

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      sql: "SELECT '?' AS literal FROM codigos WHERE motor = NULL AND ano = ? AND modelo = ? -- ?",
      params: ['2025', "Modelo d'água"],
    })
  })

  it('retorna erro explícito quando a API Cloudflare rejeita a consulta', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      errors: [{ message: 'Token inválido' }],
    }), { status: 403 }))
    const db = createCloudflareApiDatabase('conta', 'banco', 'token-invalido', fetcher)

    await expect(db.prepare('SELECT 1').first()).rejects.toThrow('Cloudflare D1 API (403): Token inválido')
  })
})
