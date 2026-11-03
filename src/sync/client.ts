// Cliente da API do openGym (api/server.js), só o que o app precisa:
//   POST /api/pair/redeem  código do "Parear o aplicativo" do site → token do celular
//   GET  /api/me           quem sou eu; renova o token quando passa da metade da validade
//   GET  /api/data/rev     só a revisão (barato, para saber se algo mudou)
//   GET  /api/data         o documento inteiro
//   PUT  /api/data         grava, com baseRev/baseWid; 409 traz o documento atual para o merge
// O token vai no cabeçalho Authorization: Bearer, que é como o servidor espera o app pareado.
import * as SecureStore from 'expo-secure-store'

export type Account = { url: string; token: string; user: { id: string; name: string } }

const KEY = 'opengym_account'
let cache: Account | null | undefined

export async function getAccount(): Promise<Account | null> {
  if (cache !== undefined) return cache
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    cache = raw ? JSON.parse(raw) : null
  } catch { cache = null }
  return cache ?? null
}
export async function setAccount(a: Account | null) {
  cache = a
  if (a) await SecureStore.setItemAsync(KEY, JSON.stringify(a))
  else await SecureStore.deleteItemAsync(KEY)
}

export class ApiError extends Error {
  constructor(public status: number, public body: any) { super(body?.error || `HTTP ${status}`) }
}

export const normalizeUrl = (u: string) => {
  let s = u.trim().replace(/\/+$/, '')
  if (s && !/^https?:\/\//i.test(s)) {
    // Endereço da rede local (IP, localhost, .local) não tem HTTPS: usa http.
    const host = s.split(/[/:]/)[0]
    const local = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host.endsWith('.local')
    s = (local ? 'http://' : 'https://') + s
  }
  // o endereço da página do app pode vir com #/... ou ?link=...; a API fica na raiz
  return s.replace(/[#?].*$/, '').replace(/\/+$/, '')
}

async function call(url: string, path: string, opts: { method?: string; body?: any; token?: string; timeout?: number } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? 15000)
  try {
    const res = await fetch(url + path, {
      method: opts.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
      signal: ctrl.signal,
    })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text.slice(0, 200) } }
    if (!res.ok) throw new ApiError(res.status, data)
    return data
  } finally {
    clearTimeout(t)
  }
}

export async function redeemPairCode(url: string, code: string): Promise<Account> {
  const base = normalizeUrl(url)
  const r = await call(base, '/api/pair/redeem', { method: 'POST', body: { code: code.trim().toUpperCase() } })
  if (!r?.token) throw new Error('o servidor não devolveu um token')
  const acc: Account = { url: base, token: r.token, user: r.user }
  await setAccount(acc)
  return acc
}

export async function me(acc: Account) {
  const r = await call(acc.url, '/api/me', { token: acc.token })
  if (r?.token && r.token !== acc.token) await setAccount({ ...acc, token: r.token, user: r.user || acc.user })
  return r
}

export const getRev = (acc: Account): Promise<{ rev: number; wid?: string }> => call(acc.url, '/api/data/rev', { token: acc.token })
export const getData = (acc: Account): Promise<{ state: any; rev: number }> => call(acc.url, '/api/data', { token: acc.token, timeout: 60000 })
export const putData = (acc: Account, state: any, baseRev: number | null, baseWid?: string | null): Promise<{ rev: number; wid: string }> =>
  call(acc.url, '/api/data', {
    method: 'PUT', token: acc.token, timeout: 60000,
    body: { state, ...(baseRev != null ? { baseRev } : {}), ...(baseWid ? { baseWid } : {}) },
  })
