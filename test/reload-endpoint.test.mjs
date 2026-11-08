import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { apply } from '../index.js'

function setup() {
  let handler
  const calls = []
  const pm = {
    listPlugins: async () => [{ entryId: 'virtual-product-risk', moduleName: 'dsh-virtual-product-risk', patchId: 'virtual-product-risk', enabled: true, fiberPhase: 'active' }],
    reload: async (ids) => { calls.push(ids); return { warnings: [] } },
  }
  const ctx = {
    get: (key) => (key === 'pluginManager' ? pm : undefined),
    logger: { info() {}, warn() {} },
    effect: (fn) => { fn() },
    webServer: { register: (route) => { handler = route.handler; return {} } },
  }
  apply(ctx, {})
  return { handler, calls }
}

async function post(handler, url) {
  const req = Readable.from([Buffer.from('')])
  req.method = 'POST'
  req.url = url
  let out = ''
  const res = { statusCode: 0, setHeader() {}, end(body) { out += body } }
  await handler(req, res)
  return JSON.parse(out)
}

test('重载插件接口会调用 pluginManager.reload', async () => {
  const { handler, calls } = setup()
  const result = await post(handler, '/virtual-product-risk/api/reload')
  assert.equal(result.ok, true)
  assert.equal(result.entryId, 'virtual-product-risk')
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.deepEqual(calls, [['virtual-product-risk']])
})
