/**
 * Client for the backend API (see /services/backend). Callers pass the header map from
 * useGoogleAuth, so this module knows nothing about any auth provider.
 *
 * Types and routes come from `src/gen/schema.d.ts`, which is generated from the one contract in
 * `packages/api/openapi.yaml` (see packages/api/AGENTS.md). A path or method that contract does not
 * declare fails `tsc`, and CI fails a PR that adds a hand-written `export interface` here
 * (`root:wire-types`).
 */
import createClient from 'openapi-fetch'
import type { components, paths } from '../gen/schema'

type Schemas = components['schemas']

export type User = Schemas['User']
export type CurrentUser = Schemas['CurrentUser']
export type Note = Schemas['Note']
export type NotePage = Schemas['NotePage']
export type NoteRequest = Schemas['NoteRequest']
export type UpdateCurrentUserRequest = Schemas['UpdateCurrentUserRequest']
/** "public" or "private": what a note's `visibility` holds. */
export type Visibility = Schemas['Visibility']
export type ListNotesParams = NonNullable<paths['/notes']['get']['parameters']['query']>

/** Thrown for any non-2xx response, carrying the status so callers can treat 404 as "absent". */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Message to show for a rejected request, falling back when it isn't an Error. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** The path a note lives at in the app. The id is escaped: it arrives from the API. */
export function notePath(note: Pick<Note, 'id'>): string {
  return `/note/${encodeURIComponent(note.id)}`
}

/**
 * Whether the signed-in caller wrote something attributed to username. Usernames are unique and a
 * note resolves its author's on every read, so this is the "is it mine" check the wire leaves a
 * client - it is never sent a uid to compare. Only for what to show: the backend decides every
 * write itself.
 */
export function isAuthor(profile: CurrentUser | null, username: string): boolean {
  return !!profile && !!username && profile.username === username
}

export type AuthHeaders = Record<string, string>

/** What a request carrying a credential the backend rejected tells its caller. */
export const SESSION_EXPIRED = 'Your sign-in has expired. Sign in again to carry on.'

export function createApi(baseUrl: string, authHeaders: AuthHeaders, onUnauthorized?: () => void) {
  const client = createClient<paths>({
    baseUrl,
    headers: authHeaders,
    // Looked up per call rather than captured, so a stubbed global fetch is honoured.
    fetch: (request) => globalThis.fetch(request),
  })

  // Every call below goes through this: it resolves with the body, or throws an ApiError for any
  // non-2xx response, ending the session on a refused credential.
  async function ok<T>(result: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
    const { data, error, response } = await result

    // A 401 with a credential attached means the credential itself was refused - in practice, that
    // it expired - so the caller hears that rather than a raw status, and the session is ended.
    if (response.status === 401 && authHeaders.Authorization) {
      onUnauthorized?.()
      throw new ApiError(401, SESSION_EXPIRED)
    }

    if (!response.ok) {
      // Every non-2xx response is an ErrorResponse, but fall back to the status if it isn't one.
      const message =
        typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string'
          ? error.error
          : undefined
      throw new ApiError(response.status, message ?? `Request failed with ${response.status}`)
    }

    return data as T
  }

  return {
    listNotes: (params?: ListNotesParams) => ok(client.GET('/notes', { params: { query: params } })),
    getNote: (id: string) => ok(client.GET('/notes/{id}', { params: { path: { id } } })),
    createNote: (note: NoteRequest) => ok(client.POST('/notes', { body: note })),
    updateNote: (id: string, note: NoteRequest) =>
      ok(client.PUT('/notes/{id}', { params: { path: { id } }, body: note })),
    deleteNote: (id: string) => ok<void>(client.DELETE('/notes/{id}', { params: { path: { id } } })),

    // A profile is addressed by its username; the Google sub it is keyed by is never a URL.
    getUser: (username: string) => ok(client.GET('/users/{username}', { params: { path: { username } } })),
    // The caller's own profile needs no name: the backend takes the owner from the credential,
    // which is also how a client discovers the username it was given at sign-up.
    getCurrentUser: () => ok(client.GET('/users/me')),
    putUser: (user: UpdateCurrentUserRequest) => ok(client.PUT('/users/me', { body: user })),
    deleteUser: () => ok<void>(client.DELETE('/users/me')),
  }
}

export type Api = ReturnType<typeof createApi>
