import { it, expect, vi } from 'vitest'
vi.mock('expo-secure-store', () => ({}))
import { normalizeUrl } from '../src/sync/client'
it('endereço local vira http, domínio vira https', () => {
  expect(normalizeUrl('192.168.0.10:3000')).toBe('http://192.168.0.10:3000')
  expect(normalizeUrl('macbook.local:3000/')).toBe('http://macbook.local:3000')
  expect(normalizeUrl('gym.exemplo.com')).toBe('https://gym.exemplo.com')
  expect(normalizeUrl('http://192.168.0.10:8080/#/workout')).toBe('http://192.168.0.10:8080')
})
