import { ApiError, SESSION_EXPIRED, createApi } from './api'

const authHeaders = { Authorization: 'Bearer test-token', 'Authorization-Provider': 'google' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

/** The Request the client handed to fetch. */
const sent = (fetchMock: ReturnType<typeof mockFetch>, call = 0) => fetchMock.mock.calls[call][0] as Request

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('createApi', () => {
  it('sends the auth headers and trims a trailing slash from the base URL', async () => {
    const fetchMock = mockFetch(json({ notes: [], hasMore: false }))

    await createApi('https://api.example.com/', authHeaders).listNotes()

    const request = sent(fetchMock)
    expect(request.url).toBe('https://api.example.com/notes')
    expect(request.method).toBe('GET')
    expect(request.headers.get('Authorization')).toBe('Bearer test-token')
    expect(request.headers.get('Authorization-Provider')).toBe('google')
  })

  // Only the params a caller actually sets end up on the query string, so a bare `listNotes()`
  // still reads as a plain `/notes` request above.
  it('carries listNotes params on the query string', async () => {
    const fetchMock = mockFetch(json({ notes: [], hasMore: false }))

    await createApi('https://api.example.com', authHeaders).listNotes({
      limit: 10,
      startAfter: '2026-08-01T00:00:00Z',
    })

    expect(sent(fetchMock).url).toBe('https://api.example.com/notes?limit=10&startAfter=2026-08-01T00%3A00%3A00Z')
  })

  it('serialises a JSON body for writes', async () => {
    const fetchMock = mockFetch(json({ id: 'note1' }, 201))

    await createApi('https://api.example.com', authHeaders).createNote({
      title: 'Hello',
      body: '',
      visibility: 'public',
    })

    const request = sent(fetchMock)
    expect(request.method).toBe('POST')
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(await request.json()).toEqual({ title: 'Hello', body: '', visibility: 'public' })
  })

  // 204 has no body, so parsing it as JSON would throw.
  it('returns without parsing a body on 204', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(createApi('https://api.example.com', authHeaders).deleteNote('note1')).resolves.toBeUndefined()
  })

  // The status is what lets a caller treat "no profile yet" differently from a real failure.
  it('throws an ApiError carrying the status and the API error message', async () => {
    mockFetch(json({ error: 'user not found' }, 404))

    const error = await createApi('https://api.example.com', authHeaders)
      .getUser('missing')
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).toBe('user not found')
  })

  it('addresses a single note by its id', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(json({ id: 'note1' })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const api = createApi('https://api.example.com', authHeaders)

    await api.getNote('note1')
    await api.updateNote('note1', { title: 't', body: '', visibility: 'private' })

    expect(sent(fetchMock, 0).url).toBe('https://api.example.com/notes/note1')
    expect(sent(fetchMock, 0).method).toBe('GET')
    expect(sent(fetchMock, 1).url).toBe('https://api.example.com/notes/note1')
    expect(sent(fetchMock, 1).method).toBe('PUT')
  })

  it('escapes an id that arrives from the API', async () => {
    const fetchMock = mockFetch(json({ id: 'a/b' }))

    await createApi('https://api.example.com', authHeaders).getNote('a/b')

    expect(sent(fetchMock).url).toBe('https://api.example.com/notes/a%2Fb')
  })

  it('falls back to the status when the error body is not JSON', async () => {
    mockFetch(new Response('Bad Gateway', { status: 502 }))

    const error = await createApi('https://api.example.com', authHeaders)
      .listNotes()
      .catch((e: unknown) => e)

    expect((error as ApiError).message).toContain('502')
  })

  it('ends the session and says so when the backend refuses the credential', async () => {
    mockFetch(json({ error: 'invalid token' }, 401))
    const onUnauthorized = vi.fn()

    const error = await createApi('https://api.example.com', authHeaders, onUnauthorized)
      .updateNote('note1', { title: '', body: '', visibility: 'public' })
      .catch((e: unknown) => e)

    expect(onUnauthorized).toHaveBeenCalled()
    expect(error).toEqual(new ApiError(401, SESSION_EXPIRED))
  })

  it('leaves a signed-out 401 to the caller', async () => {
    mockFetch(json({ error: 'missing bearer token' }, 401))
    const onUnauthorized = vi.fn()

    const error = await createApi('https://api.example.com', {}, onUnauthorized)
      .createNote({ title: '', body: '', visibility: 'public' })
      .catch((e: unknown) => e)

    expect(onUnauthorized).not.toHaveBeenCalled()
    expect((error as ApiError).message).toBe('missing bearer token')
  })
})
