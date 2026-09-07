import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoutesName } from '../../src/libs/route-names.mjs'

test('returns an empty list when cached routes are null', () => {
  assert.deepEqual(getRoutesName(null), [])
})

test('flattens names from nested routes', () => {
  const routes = [
    {
      name: 'parent',
      children: [{ name: 'child' }]
    }
  ]

  assert.deepEqual(getRoutesName(routes), ['parent', 'child'])
})
