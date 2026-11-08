import test from 'node:test'
import assert from 'node:assert/strict'
import { __test } from '../index.js'

const db = __test.normalizeRiskLibrary(__test.loadJson('risk-library.json'))
const banned = __test.loadJson('banned-words.json')
const rules = __test.normalizeHandling(__test.loadJson('handling.json'))
const indexes = __test.buildIndexes(db, { terms: [] }, banned)
indexes.banned = banned
const T = __test.pinyinTable()

function lint(text) {
  return __test.lintText(db, text, indexes, rules, T)
}

test('正常虚拟商品交付方式不产生违禁词命中', () => {
  const r = lint('原创海外文章解读知识库，拍下秒发，网盘链接自动发货，电子版PDF可直接阅读')
  assert.equal(r.level, 'green')
  assert.equal(r.counts.banned, 0)
  assert.equal(r.hits.length, 0)
})

test('正常商品形态词不参与风险判定', () => {
  const r = lint('2026版职场模板合集，可打印，附MP3音频，网盘发货')
  assert.equal(r.level, 'green')
  assert.equal(r.counts.banned, 0)
})

test('真售假词仍然红灯', () => {
  const r = lint('官方同款盗版课程，翻录他人讲义')
  assert.equal(r.level, 'red')
  assert.ok(r.reasons.some((x) => x.includes('售假')), JSON.stringify(r.reasons))
  assert.ok(r.handling && r.handling.level === 'red')
})

test('破解与账号会员类禁售仍然红灯，但不再叫售假', () => {
  const r = lint('破解版软件，送激活码，支持共享账号')
  assert.equal(r.level, 'red')
  assert.ok(r.reasons.some((x) => x.includes('破解')), JSON.stringify(r.reasons))
  assert.ok(!r.reasons.some((x) => x.includes('售假')), JSON.stringify(r.reasons))
})

test('营销描述词只给黄灯，不判售假', () => {
  const r = lint('全套模板最新版，原价99元')
  assert.equal(r.level, 'amber')
  assert.ok(r.reasons.some((x) => x.includes('夸大')), JSON.stringify(r.reasons))
  assert.ok(!r.reasons.some((x) => x.includes('售假')), JSON.stringify(r.reasons))
})

test('录播课等自有商品形态只提示核授权', () => {
  const r = lint('自制录播课，无水印素材')
  assert.equal(r.level, 'amber')
  assert.ok(r.reasons.some((x) => x.includes('侵权')), JSON.stringify(r.reasons))
})

test('正常交付词不在扫描索引中', () => {
  const terms = banned.terms.filter((t) => t.group === 'delivery').map((t) => t.term)
  assert.ok(terms.includes('自动发货'))
  assert.ok(terms.includes('网盘链接'))
  assert.equal(indexes.bannedItems.some((it) => terms.includes(it.term.term)), false)
})
test('平台规则包含虚拟商品正常交付说明', () => {
  const platform = __test.loadJson('platform-rules.json')
  const delivery = platform.categories.find((c) => c.id === 'xhs_virtual_delivery')
  assert.ok(delivery, '缺少 xhs_virtual_delivery 分类')
  assert.ok(delivery.items.some((i) => i.text.includes('自动发货')))
  const category = platform.categories.find((c) => c.id === 'xhs_category')
  assert.ok(category.items.some((i) => i.text.includes('电子资源')))
})
