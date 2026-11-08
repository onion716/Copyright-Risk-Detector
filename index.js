/**
 * dsh-virtual-product-risk — Host half.
 *
 * Offline rule engine: copyright names, banned words, disguised-name
 * normalisation and handling advice, plus a DeepSeek review through the Host
 * `llm` service. The browser half talks to this half over the package-private
 * `/virtual-product-risk/api/*` routes.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { inflateRawSync, inflateSync } from 'node:zlib'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = join(PKG_DIR, 'assets')

const CAUTION =
  '来源线索未外部核验；命中不是违规结论，未命中也不代表安全或已有转售授权。'
const LIST_FIELDS = ['variants', 'companies', 'labels', 'registrations']

/* ------------------------------------------------------------------ */
/* JSON + text helpers                                                 */
/* ------------------------------------------------------------------ */

function loadJson(name) {
  return JSON.parse(readFileSync(join(ASSET_DIR, name), 'utf8').replace(/^\uFEFF/, ''))
}

function normalize(text) {
  let t = String(text ?? '').normalize('NFKC')
  t = t.replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
  return t.replace(/\s+/g, ' ').trim().toLowerCase()
}

function norm(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase()
}

function unique(values) {
  const out = []
  for (const v of values) if (v && !out.includes(v)) out.push(v)
  return out
}

function isHan(c) {
  const code = c.codePointAt(0)
  return code >= 0x4e00 && code <= 0x9fff
}
function isAsciiAlpha(c) {
  return /^[A-Za-z]$/.test(c)
}
function isDigit(c) {
  return c >= '0' && c <= '9'
}

/* ------------------------------------------------------------------ */
/* Disguised-name normalisation                                        */
/* ------------------------------------------------------------------ */

const FILLERS = ['的', '全套', '课程', '网课', '资料', '视频', '教程', '合集', '打包', '完整版', '最新版', '最新', '高清', '系列']
const MIN_FULL_SYLLABLES = 4

// 小红书虚拟商品相关、值得参与检测的暗语分类；闲鱼二手交易类话术（砍价/成色/验货宝等）不参与，避免误伤。
const XHS_SLANG_KEEP = new Set(['AI 服务','虚拟资源','虚拟商品','数字资产与会员拼车','账号交易','互联网 / 数字服务','图片暗号 / 站外引流','小红书矩阵','站外引流','学术代写','营销话术','游戏账号','刷单 / 任务','涨粉引流'])
function xhsSlang(t) { return XHS_SLANG_KEEP.has(String((t && t.category_name) || '')) }

// 平台/网络通用品牌名：在标题正文里出现不算版权命中（卖「小红书账号」这类仍由名单查询命中）。
const PLATFORM_NAMES = new Set(['小红书','抖音','淘宝','闲鱼','快手','B站','哔哩哔哩','微信','QQ','微博','拼多多','京东','视频号','公众号','知乎','豆瓣','得物'])
const MIN_INITIALS = 3

let TABLE_CACHE = null
function pinyinTable() {
  if (TABLE_CACHE) return TABLE_CACHE
  const data = loadJson('pinyin.json')
  const table = data.table || {}
  const syllables = new Set(Object.values(table))
  let longest = 0
  for (const s of syllables) longest = Math.max(longest, s.length)
  TABLE_CACHE = { table, syllables, longest }
  return TABLE_CACHE
}

function segmentLatin(run, syllables, longest) {
  const out = []
  let i = 0
  while (i < run.length) {
    let matched = false
    for (let size = Math.min(longest, run.length - i); size > 0; size--) {
      const piece = run.slice(i, i + size)
      if (syllables.has(piece)) {
        out.push(piece)
        i += size
        matched = true
        break
      }
    }
    if (!matched) return [run]
  }
  return out
}

function tokenize(text, T, withSpans) {
  const { table, syllables, longest } = T || pinyinTable()
  const src = String(text ?? '').normalize('NFKC')
  const tokens = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (isHan(c)) {
      tokens.push([table[c] || c, i, i + 1])
      i += 1
    } else if (isAsciiAlpha(c)) {
      let j = i
      while (j < src.length && isAsciiAlpha(src[j])) j += 1
      const run = src.slice(i, j).toLowerCase()
      let pos = i
      for (const part of segmentLatin(run, syllables, longest)) {
        tokens.push([part, pos, pos + part.length])
        pos += part.length
      }
      i = j
    } else if (isDigit(c)) {
      let j = i
      while (j < src.length && isDigit(src[j])) j += 1
      tokens.push([src.slice(i, j), i, j])
      i = j
    } else {
      i += 1
    }
  }
  return withSpans ? tokens : tokens.map((t) => t[0])
}

function stripFillers(text) {
  let t = String(text ?? '').normalize('NFKC')
  for (const filler of FILLERS) t = t.split(filler).join(' ')
  return t
}

function forms(text, T) {
  const full = tokenize(text, T)
  const core = tokenize(stripFillers(text), T)
  const initials = full.join('')
  const raw = String(text ?? '')
  let hasHan = false
  let hasLatin = false
  for (const c of raw) {
    if (isHan(c)) hasHan = true
    else if (isAsciiAlpha(c)) hasLatin = true
  }
  return { full, core, initials, latinOnly: full.length > 0 && !hasHan, mixed: hasHan && hasLatin }
}

function contains(hay, needle) {
  const n = needle.length
  if (n === 0 || n > hay.length) return false
  for (let i = 0; i <= hay.length - n; i++) {
    let ok = true
    for (let k = 0; k < n; k++) if (hay[i + k] !== needle[k]) { ok = false; break }
    if (ok) return true
  }
  return false
}

function isDisguise(q, n) {
  if (q.full.join('').length < MIN_INITIALS) return false
  if (q.full.length >= MIN_FULL_SYLLABLES && sameList(q.full, n.full)) return true
  if (q.mixed && q.full.length >= 2 && sameList(q.full, n.full)) return true
  const shorter = q.core.length <= n.core.length ? q.core : n.core
  const longer = q.core.length <= n.core.length ? n.core : q.core
  if (shorter.length >= MIN_FULL_SYLLABLES && contains(longer, shorter)) return true
  if (q.latinOnly) {
    const letters = q.full.join('')
    if (letters.length >= MIN_INITIALS && letters === n.initials && n.full.length >= MIN_INITIALS) return true
  }
  return false
}

function sameList(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function indexRecords(records, T) {
  const out = []
  for (const r of records) {
    const seen = new Set()
    const terms = [r.name, ...(r.variants || [])]
    for (const term of terms) {
      if (!term || seen.has(term)) continue
      seen.add(term)
      const f = forms(term, T)
      if (f.full.length >= 2) out.push({ record: r, term, forms: f })
    }
  }
  return out
}

function findDisguised(query, index, T) {
  const qf = forms(query, T)
  const hits = []
  const seen = new Set()
  for (const item of index) {
    if (seen.has(item.record.id)) continue
    if (isDisguise(qf, item.forms)) {
      seen.add(item.record.id)
      hits.push({ record: item.record, term: item.term })
    }
  }
  return hits
}

function scanText(text, index, T) {
  const spans = tokenize(text, T, true)
  const tokens = spans.map((t) => t[0])
  const raw = String(text ?? '').normalize('NFKC')
  const hits = []
  const mixed = (start, end) => {
    const piece = raw.slice(start, end)
    let h = false
    let l = false
    for (const c of piece) {
      if (isHan(c)) h = true
      else if (isAsciiAlpha(c)) l = true
    }
    return h && l
  }
  for (const item of index) {
    const f = item.forms
    const pattern = f.core.length >= MIN_FULL_SYLLABLES ? f.core : f.full
    const n = pattern.length
    if (n >= 2) {
      for (let i = 0; i <= tokens.length - n; i++) {
        let ok = true
        for (let k = 0; k < n; k++) if (tokens[i + k] !== pattern[k]) { ok = false; break }
        if (ok) {
          const start = spans[i][1]
          const end = spans[i + n - 1][2]
          if (n >= MIN_FULL_SYLLABLES || mixed(start, end)) {
            hits.push({ start, end, record: item.record, term: item.term })
            break
          }
        }
      }
    }
    if (f.initials.length >= MIN_INITIALS && f.full.length >= MIN_INITIALS) {
      const re = /[A-Za-z]{3,}/g
      const normed = String(text ?? '').normalize('NFKC')
      let m
      while ((m = re.exec(normed)) !== null) {
        if (m[0].toLowerCase() === f.initials) {
          hits.push({ start: m.index, end: m.index + m[0].length, record: item.record, term: item.term })
          break
        }
      }
    }
  }
  return hits
}

/* ------------------------------------------------------------------ */
/* Handling advice                                                     */
/* ------------------------------------------------------------------ */

function levelFor(rules, score) {
  for (const key of ['red', 'amber', 'green']) if (score >= rules.levels[key].min) return key
  return 'green'
}

function matchedGroups(rules, labels) {
  const ls = labels.map((l) => String(l ?? ''))
  const groups = []
  for (const group of rules.label_groups) {
    outer: for (const token of group.match) {
      for (const label of ls) {
        if (label.includes(token)) { groups.push(group); break outer }
      }
    }
  }
  return groups
}

function advise(status, record, rules) {
  rules = rules || {}
  status = Object.prototype.hasOwnProperty.call(rules.status, status) ? status : 'no_match'
  record = record || {}
  const labels = record.labels || []
  const registrations = record.registrations || []
  const category = record.category || ''
  const groups = status !== 'no_match' ? matchedGroups(rules, labels) : []
  let score = rules.status[status].base
  if (groups.length) score += Math.max(...groups.map((g) => g.weight))
  else if (registrations.length && status !== 'no_match') score += rules.registration_weight || 0
  score = Math.max(0, Math.min(100, score))
  const level = levelFor(rules, score)
  const catRules = rules.categories[category] || rules.categories._default
  const platform = rules.platform_notes[catRules.platform] || {}
  const card = {
    level,
    levelName: rules.levels[level].name,
    score,
    headline: rules.status[status].headline,
    title: rules.levels[level].title,
    meaning: groups.map((g) => g.meaning),
    actions: [],
    docs: [],
    alternatives: [],
    platforms: (platform && platform['小红书']) ? { '小红书': platform['小红书'] } : {},
    checklist: [...(rules.checklist || [])],
    notice: rules.notice || '',
  }
  const objectNote = (rules.object_types || {})[record.object_type || '']
  if (status !== 'no_match' && objectNote) card.meaning.push(objectNote)
  if (!groups.length && registrations.length && status !== 'no_match') {
    const reg = rules.label_groups.find((g) => g.id === 'registered')
    if (reg) card.meaning.push(reg.meaning)
  }
  if (status === 'no_match') {
    card.actions = [...rules.no_match.actions]
    card.platforms = {}
    card.meaning = []
  } else if (status === 'candidates' || status === 'disguised') {
    card.actions = [...rules[status].actions, ...[...(catRules.forms || [])].slice(0, 1)]
    if (status === 'disguised') {
      card.meaning.unshift('输入疑似为伪装写法（谐音、拼音、拆字或中英混写），命中是候选不是结论。')
    }
    card.docs = unique(groups.flatMap((g) => g.docs || []))
    card.alternatives = [...(catRules.alternatives || [])]
  } else {
    card.actions = unique([...groups.flatMap((g) => g.actions || []), ...(catRules.forms || [])])
    card.docs = unique([...groups.flatMap((g) => g.docs || []), ...(catRules.docs || [])])
    card.alternatives = [...(catRules.alternatives || [])]
  }
  card.meaning = unique(card.meaning)
  return card
}

/* ------------------------------------------------------------------ */
/* Single-name query                                                   */
/* ------------------------------------------------------------------ */

function disguiseIndex(db, T) {
  const records = db.records.filter((r) => r.object_type !== '店铺' && r.category !== '店铺来源提醒')
  return indexRecords(records, T)
}

function projectRecord(r) {
  const out = {}
  for (const k of ['id', 'name', 'category', 'object_type', 'companies', 'labels', 'registrations']) {
    if (k in r) out[k] = r[k]
  }
  return out
}

function queryOne(db, item, rules, T, limit = 10) {
  const q = normalize(item)
  if (!q) return { query: item, status: 'no_match', totalMatches: 0, truncated: false, matches: [], guidance: '请输入商品名称后再查询。', handling: advise('no_match', null, rules) }
  const dIndex = db._disguiseIndex || (db._disguiseIndex = disguiseIndex(db, T))
  const matches = []
  for (const r of db.records) {
    if (r.object_type === '店铺' || r.category === '店铺来源提醒') continue
    if (PLATFORM_NAMES.has(r.name)) continue
    const names = unique([r.name, ...(r.variants || [])])
    const companies = r.companies || []
    let mode = ''
    let rank = 99
    let term = ''
    for (const name of names) if (q === normalize(name)) { mode = 'exact_name'; rank = 0; term = name; break }
    if (!mode) {
      for (const company of companies) if (q === normalize(company)) { mode = 'exact_company'; rank = 1; term = company; break }
    }
    if (!mode && q.length >= 3) {
      for (const candidate of [...names, ...companies]) {
        const n = normalize(candidate)
        if (n.length >= 3 && (q.includes(n) || n.includes(q))) { mode = 'partial_candidate'; rank = 2; term = candidate; break }
      }
    }
    if (mode) matches.push({ rank, name: r.name, data: { ...projectRecord(r), match_type: mode, matched_term: term } })
  }
  const found = new Set(matches.map((m) => m.data.id))
  for (const d of findDisguised(item, dIndex, T)) {
    if (found.has(d.record.id)) continue
    if (PLATFORM_NAMES.has(d.record.name)) continue
    matches.push({ rank: 3, name: d.record.name, data: { ...projectRecord(d.record), match_type: 'disguised_candidate', matched_term: d.term } })
  }
  matches.sort((a, b) => a.rank - b.rank || normalize(a.name).localeCompare(normalize(b.name)) || a.data.id.localeCompare(b.data.id))
  const shown = matches.slice(0, limit)
  const top = matches.length ? matches[0].rank : 99
  const status = top < 2 ? 'matched' : top === 2 ? 'candidates' : top === 3 ? 'disguised' : 'no_match'
  const guidance =
    status === 'matched' ? '发现名称或明确公司关联，核对实际内容和转售授权。'
      : status === 'candidates' ? '发现部分匹配候选，先确认是否为同一主体或作品。'
        : status === 'disguised' ? '输入疑似为某个风险名称的伪装写法（谐音、拼音或拆写），先按正写名称复查。'
          : '本地词库未收录该名称，仍需核对实际内容、来源及授权。'
  return {
    query: item,
    status,
    totalMatches: matches.length,
    truncated: matches.length > shown.length,
    matches: shown.map((m) => m.data),
    guidance,
    handling: advise(status, shown.length ? shown[0].data : null, rules),
  }
}

/* ------------------------------------------------------------------ */
/* Listing lint                                                        */
/* ------------------------------------------------------------------ */

function variantOk(v) {
  return v.length > 1 && !/^[a-z0-9]{1,3}$/.test(v)
}

function buildIndexes(db, slang, banned) {
  const slangItems = []
  for (const t of slang.terms) {
    for (const v of t.variants) {
      const lv = norm(v)
      if (variantOk(lv)) slangItems.push({ v: lv, term: t, variant: v })
    }
  }
  slangItems.sort((a, b) => b.v.length - a.v.length)
  // 正常交付方式 / 商品形态组标记 scan:false，不参与标题正文扫描，避免误伤虚拟商品正常经营。
  const bannedItems = banned.terms
    .filter((t) => {
      const group = (banned.groups || {})[t.group] || {}
      return group.scan !== false
    })
    .map((t) => ({ v: norm(t.term), term: t }))
  bannedItems.sort((a, b) => b.v.length - a.v.length)
  const nameItems = []
  for (const r of db.records) {
    if (r.object_type === '店铺' || r.category === '店铺来源提醒') continue
    for (const term of unique([r.name, ...(r.variants || [])])) {
      const lt = norm(term)
      if (lt.length >= 2) nameItems.push({ v: lt, record: r, term, mode: 'exact_name' })
    }
    for (const company of r.companies || []) {
      const lc = norm(company)
      if (lc.length >= 3) nameItems.push({ v: lc, record: r, term: company, mode: 'exact_company' })
    }
  }
  nameItems.sort((a, b) => b.v.length - a.v.length)
  return { slangItems, bannedItems, nameItems }
}

function findAll(hay, needle) {
  const out = []
  let start = 0
  for (;;) {
    const i = hay.indexOf(needle, start)
    if (i < 0) break
    out.push(i)
    start = i + 1
  }
  return out
}

function place(taken, start, end) {
  for (const t of taken) if (t[0] < end && start < t[1]) return false
  taken.push([start, end])
  return true
}

function adviseCopyright(hit, rules) {
  const r = hit.record
  const cat = rules.categories[r.category] || rules.categories._default
  const alt = (cat.alternatives || []).slice(0, 2).join('、') || '描述性说法'
  if (hit.match_type === 'disguised_candidate') return `疑似「${hit.matched_term}」的伪装写法；改写躲不过稽查，去掉该名称，改为：${alt}。`
  if (hit.match_type === 'exact_company') return `命中公司「${hit.matched_term}」；不要在标题提公司名，改为：${alt}。`
  const labels = (r.labels || []).join('；') || '待核对'
  return `命中版权名「${hit.matched_term}」（${labels}）；去掉名称，改为：${alt}。`
}

function adviseSlang(hit) {
  const live = hit.liveness || ''
  const risk = hit.risk || ''
  let base = `暗语「${hit.variant}」＝${hit.name}`
  if (live === 'killed') base += '；已被平台拦截，写上会被下架'
  else if (live === 'watching') base += '；平台抽检限流'
  if (risk === 'danger' || hit.policy === 'grey') return base + '；该题材高危，不提供替代词，建议不做。'
  if ((live === 'killed' || live === 'watching') && hit.successors && hit.successors.length) return base + '；可换：' + hit.successors.slice(0, 3).join('、') + '。'
  if (live === 'active') return base + '；当前可搜，但暗语本身说明该品类受审核关注，建议用正常描述。'
  return base + '；建议用正常描述替代。'
}

function scoreHits(hits) {
  let level = 'green'
  const reasons = []
  for (const h of hits) {
    if (h.kind === 'copyright') {
      if (h.match_type === 'exact_name' || h.match_type === 'exact_company') { level = 'red'; reasons.push('版权精确命中') }
      else { if (level !== 'red') level = 'amber'; reasons.push('版权候选') }
    } else if (h.kind === 'slang') {
      if (h.liveness === 'killed' || h.risk === 'danger' || h.policy === 'grey') { level = 'red'; reasons.push('拦截词或高危暗语') }
      else { if (level !== 'red') level = 'amber'; reasons.push('暗语') }
    } else if (h.kind === 'banned') {
      // 用分组名代替固定的“售假高频词”，避免把破解、账号禁售、极限词都误标成售假。
      if (h.level === 'red') { level = 'red'; reasons.push(h.group_name || '平台禁售词') }
      else { if (level !== 'red') level = 'amber'; reasons.push(h.group_name || '平台稽查词') }
    }
  }
  return { level, reasons: unique(reasons) }
}

const LEVEL_NAMES = { red: '红灯', amber: '黄灯', green: '绿灯' }

function adviseBannedHits(hits, banned, rules) {
  const list = hits.filter((h) => h.kind === 'banned')
  if (!list.length) return advise('no_match', null, rules)
  const red = list.find((h) => h.level === 'red')
  const top = red || list[0]
  const level = red ? 'red' : 'amber'
  const group = ((banned && banned.groups) || {})[top.group] || {}
  return {
    level,
    levelName: rules.levels[level].name,
    score: level === 'red' ? 70 : 40,
    headline: (top.group_name || '违禁词') + '：命中 ' + list.length + ' 个词',
    title: rules.levels[level].title,
    meaning: unique(list.map((h) => h.advice || group.advice || '').filter(Boolean)),
    actions: [...(group.actions || [])],
    docs: [...(group.docs || [])],
    alternatives: [],
    platforms: {},
    checklist: [...(rules.checklist || [])],
    notice: rules.notice || '',
  }
}

function lintText(db, text, indexes, rules, T) {
  const src = String(text ?? '').normalize('NFKC').slice(0, 4000)
  if (!src.trim()) return { text: src, level: 'green', levelName: '绿灯', reasons: [], counts: { copyright: 0, slang: 0, banned: 0 }, hits: [], handling: advise('no_match', null, rules) }
  const low = norm(src)
  const taken = []
  const cHits = []
  for (const item of indexes.nameItems) {
    if (PLATFORM_NAMES.has(item.term)) continue
    for (const i of findAll(low, item.v)) {
      if (place(taken, i, i + item.v.length)) {
        cHits.push({
          fragment: src.slice(i, i + item.v.length), start: i, end: i + item.v.length,
          kind: 'copyright', match_type: item.mode, matched_term: item.term, record: projectRecord(item.record),
        })
        break
      }
    }
  }
  const dIndex = db._disguiseIndex || (db._disguiseIndex = indexRecords(db.records.filter((r) => r.object_type !== '店铺' && r.category !== '店铺来源提醒'), T))
  for (const d of scanText(src, dIndex, T)) {
    if (PLATFORM_NAMES.has(d.record.name)) continue
    if (place(taken, d.start, d.end)) {
      cHits.push({ fragment: src.slice(d.start, d.end), start: d.start, end: d.end, kind: 'copyright', match_type: 'disguised_candidate', matched_term: d.term, record: projectRecord(d.record) })
    }
  }
  const sHits = []
  for (const item of indexes.slangItems) {
    for (const i of findAll(low, item.v)) {
      if (place(taken, i, i + item.v.length)) {
        const t = item.term
        sHits.push({
          fragment: src.slice(i, i + item.v.length), start: i, end: i + item.v.length, kind: 'slang', variant: item.variant,
          name: t.name, category_name: t.category_name, liveness: t.liveness || '', risk: t.risk || '', policy: t.policy || '',
          successors: t.successors || [],
        })
        break
      }
    }
  }
  const bHits = []
  for (const item of indexes.bannedItems) {
    for (const i of findAll(low, item.v)) {
      if (place(taken, i, i + item.v.length)) {
        const t = item.term
        const group = (indexes.banned.groups || {})[t.group] || {}
        bHits.push({
          fragment: src.slice(i, i + item.v.length), start: i, end: i + item.v.length, kind: 'banned',
          term: t.term, group: t.group, group_name: group.name || t.group, level: group.level || 'amber',
          advice: t.replace || group.advice || '',
        })
        break
      }
    }
  }
  for (const h of cHits) h.advice = adviseCopyright(h, rules)
  for (const h of sHits) h.advice = adviseSlang(h)
  const hits = [...cHits, ...sHits, ...bHits].sort((a, b) => a.start - b.start)
  const { level, reasons } = scoreHits(hits)
  let worst = null
  for (const h of cHits) {
    const rank = { exact_name: 0, exact_company: 1, partial_candidate: 2, disguised_candidate: 3 }[h.match_type]
    if (!worst || rank < worst.rank) worst = { rank, hit: h }
  }
  let card
  if (worst && worst.rank < 2) {
    card = advise('matched', worst.hit.record, rules)
  } else if (bHits.some((h) => h.level === 'red')) {
    card = adviseBannedHits(bHits, indexes.banned, rules)
  } else if (worst) {
    const status = worst.rank === 2 ? 'candidates' : 'disguised'
    card = advise(status, worst.hit.record, rules)
  } else if (bHits.length) {
    card = adviseBannedHits(bHits, indexes.banned, rules)
  } else card = advise('no_match', null, rules)
  return {
    text: src, level, levelName: LEVEL_NAMES[level], reasons,
    counts: { copyright: cHits.length, slang: sHits.length, banned: bHits.length },
    hits: hits.map(projectHit), handling: card,
  }
}

function projectHit(h) {
  if (h.kind === 'copyright') {
    return { fragment: h.fragment, kind: 'copyright', advice: h.advice, match_type: h.match_type, matched_term: h.matched_term, name: h.record.name, labels: h.record.labels || [], category: h.record.category || '' }
  }
  if (h.kind === 'slang') return { fragment: h.fragment, kind: 'slang', advice: h.advice, name: h.name, liveness: h.liveness, risk: h.risk }
  return { fragment: h.fragment, kind: 'banned', advice: h.advice, group: h.group, group_name: h.group_name }
}

/* ------------------------------------------------------------------ */
/* Delivery files: zip / office / pdf / image / text                  */
/* ------------------------------------------------------------------ */

const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'xml', 'html', 'htm', 'srt', 'vtt'])
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const MAX_FILE_TEXT = 60000

function extOf(name) {
  const i = String(name || '').lastIndexOf('.')
  return i < 0 ? '' : String(name).slice(i + 1).toLowerCase()
}
function mediaOfExt(ext) {
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
}

/** Minimal ZIP reader (central directory + local headers, store/deflate). */
function readZip(buf) {
  let eocd = -1
  const min = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP 文件')
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let k = 0; k < count; k++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const compSize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const localOff = buf.readUInt32LE(off + 42)
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen)
    off += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) { entries.push({ name, dir: true }); continue }
    if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== 0x04034b50) { entries.push({ name, dir: false, data: null }); continue }
    const lnameLen = buf.readUInt16LE(localOff + 26)
    const lextraLen = buf.readUInt16LE(localOff + 28)
    const dataStart = localOff + 30 + lnameLen + lextraLen
    const comp = buf.subarray(dataStart, dataStart + compSize)
    let data = null
    try { data = method === 0 ? Buffer.from(comp) : inflateRawSync(comp) } catch (e) { data = null }
    entries.push({ name, dir: false, method, data })
  }
  return entries
}

function xmlToText(xml) {
  if (!xml) return ''
  let s = String(xml)
  s = s.replace(/<\/(w:p|a:p|w:tr|a:tr|row|si|c)>/gi, '\n')
  s = s.replace(/<w:br\s*\/?>/gi, '\n').replace(/<a:br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function pushImage(images, name, data) {
  if (!data || data.length === 0 || data.length > 3 * 1024 * 1024) return
  if (images.length >= 8) return
  const ext = extOf(name)
  if (!IMAGE_EXT.has(ext)) return
  images.push({ name, mediaType: mediaOfExt(ext), data: data.toString('base64') })
}

function parseDocx(buf, out) {
  const entries = readZip(buf)
  const doc = entries.find((e) => e.name === 'word/document.xml')
  out.text = doc && doc.data ? xmlToText(doc.data.toString('utf8')) : ''
  for (const e of entries) if (/^word\/media\//.test(e.name)) pushImage(out.images, e.name, e.data)
  out.notes.push(out.text ? `Word 提取文本 ${out.text.length} 字` : 'Word 未提取到文本')
  return out
}
function parsePptx(buf, out) {
  const entries = readZip(buf)
  const slides = entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => Number((a.name.match(/(\d+)/) || [0, 0])[1]) - Number((b.name.match(/(\d+)/) || [0, 0])[1]))
  out.text = slides.map((s, i) => `[第 ${i + 1} 页]\n${xmlToText(s.data ? s.data.toString('utf8') : '')}`).join('\n\n')
  for (const e of entries) if (/^ppt\/media\//.test(e.name)) pushImage(out.images, e.name, e.data)
  out.notes.push(out.text ? `PPT 提取 ${slides.length} 页、文本 ${out.text.length} 字` : 'PPT 未提取到文本')
  return out
}
function parseXlsx(buf, out) {
  const entries = readZip(buf)
  const shared = entries.find((e) => e.name === 'xl/sharedStrings.xml')
  let sharedText = shared && shared.data ? xmlToText(shared.data.toString('utf8')) : ''
  const sheets = entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
  let sheetText = sheets.map((s) => xmlToText(s.data ? s.data.toString('utf8') : '')).join('\n')
  out.text = (sharedText + '\n' + sheetText).trim()
  out.notes.push(out.text ? `Excel 提取文本 ${out.text.length} 字` : 'Excel 未提取到文本')
  return out
}
function parseZipGeneric(buf, out) {
  const entries = readZip(buf)
  const parts = []
  let count = 0
  for (const e of entries) {
    if (e.dir) continue
    const ext = extOf(e.name)
    out.listing.push(e.name)
    if (TEXT_EXT.has(ext) && e.data) {
      parts.push(`[${e.name}]\n${e.data.toString('utf8').slice(0, 20000)}`)
      count++
    } else if (IMAGE_EXT.has(ext) && e.data) {
      pushImage(out.images, e.name, e.data)
      count++
    } else if (['docx', 'docm', 'pptx', 'pptm', 'xlsx', 'xlsm'].includes(ext) && e.data) {
      try {
        const sub = { name: e.name, size: e.data.length, kind: ext, text: '', images: [], notes: [], listing: [] }
        if (ext.startsWith('doc')) parseDocx(e.data, sub)
        else if (ext.startsWith('ppt')) parsePptx(e.data, sub)
        else parseXlsx(e.data, sub)
        if (sub.text) parts.push(`[${e.name}]\n${sub.text.slice(0, 20000)}`)
        for (const im of sub.images) if (out.images.length < 8) out.images.push(im)
        count++
      } catch (er) { /* skip broken member */ }
    }
  }
  out.text = parts.join('\n\n').slice(0, MAX_FILE_TEXT)
  out.notes.push(`ZIP 共 ${out.listing.length} 个文件，解析 ${count} 个可读文件`)
  return out
}

function extractPdfText(buf) {
  const parts = []
  try {
    const s = buf.toString('latin1')
    const re = /stream\r?\n/g
    let m
    while ((m = re.exec(s)) !== null) {
      const start = m.index + m[0].length
      const end = s.indexOf('endstream', start)
      if (end < 0) break
      const chunk = buf.subarray(start, end)
      let decoded = null
      try { decoded = inflateSync(chunk) } catch (e) { decoded = chunk }
      const t = decoded.toString('latin1')
      const matches = t.match(/\((?:[^()\\]|\\.)*\)/g)
      if (matches) { for (const mt of matches) parts.push(mt.slice(1, -1).replace(/\\([()\\])/g, '$1')) }
      re.lastIndex = end + 9
    }
  } catch (e) { /* ignore */ }
  return parts.join(' ').replace(/[ \t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, MAX_FILE_TEXT)
}

function parseDeliveryFile(fileName, mediaType, base64) {
  const name = String(fileName || 'file')
  const buf = Buffer.from(String(base64 || ''), 'base64')
  const ext = extOf(name)
  const out = { name, size: buf.length, kind: ext || 'file', text: '', images: [], notes: [], listing: [] }
  if (!buf.length) { out.notes.push('空文件'); return out }
  if (IMAGE_EXT.has(ext) || /^image\//.test(mediaType || '')) {
    out.kind = 'image'
    pushImage(out.images, name, buf)
    out.notes.push('图片将交由 DeepSeek 识图检查')
    return out
  }
  if (TEXT_EXT.has(ext)) {
    out.kind = 'text'
    out.text = buf.toString('utf8').slice(0, MAX_FILE_TEXT)
    out.notes.push(`已提取文本 ${out.text.length} 字`)
    return out
  }
  try {
    if (ext === 'docx' || ext === 'docm') return parseDocx(buf, out)
    if (ext === 'pptx' || ext === 'pptm') return parsePptx(buf, out)
    if (ext === 'xlsx' || ext === 'xlsm') return parseXlsx(buf, out)
    if (ext === 'zip') return parseZipGeneric(buf, out)
  } catch (e) {
    out.notes.push('解析失败：' + (e && e.message ? e.message : String(e)))
    return out
  }
  if (ext === 'pdf') {
    out.kind = 'pdf'
    out.text = extractPdfText(buf)
    out.notes.push(out.text ? 'PDF 文本为尽力提取，可能不完整' : 'PDF 未能提取文本，建议转成图片或 PPT / Word')
    return out
  }
  out.notes.push('暂不支持直接解析该类型，已记录文件名；建议转成图片、PPT、Word、Excel 或 ZIP 再传')
  return out
}

/* ------------------------------------------------------------------ */
/* Rule library                                                        */
/* ------------------------------------------------------------------ */

function buildLibraryCats(db, banned, slang, platformRules, xhsRules) {
  const cats = []
  const copyright = new Map()
  for (const r of db.records) {
    if (r.object_type === '店铺' || r.category === '店铺来源提醒') continue
    const c = r.category || '待分类'
    copyright.set(c, (copyright.get(c) || 0) + 1)
  }
  for (const [name, count] of [...copyright.entries()].sort((a, b) => b[1] - a[1])) {
    cats.push({ group: '版权名单', id: 'copyright:' + name, name, count, kind: 'copyright' })
  }
  for (const [gid, g] of Object.entries(banned.groups || {})) {
    cats.push({ group: '违禁/极限词', id: 'banned:' + gid, name: g.name, count: banned.terms.filter((t) => t.group === gid).length, kind: 'banned' })
  }
  const slangCat = new Map()
  for (const t of slang.terms) { const c = t.category_name || '其他'; slangCat.set(c, (slangCat.get(c) || 0) + 1) }
  for (const [name, count] of [...slangCat.entries()].sort((a, b) => b[1] - a[1])) {
    cats.push({ group: '暗语', id: 'slang:' + name, name, count, kind: 'slang' })
  }
  if (platformRules && Array.isArray(platformRules.categories)) {
    for (const c of platformRules.categories) {
      cats.push({ group: '平台规则', id: 'platform:' + c.id, name: c.name, count: c.items.length, kind: 'platform', platform: c.platform, summary: c.summary })
    }
  }
  if (xhsRules && Array.isArray(xhsRules.categories)) {
    for (const c of xhsRules.categories) {
      cats.push({ group: '小红书规则百科', id: 'xhsrule:' + c.id, name: c.name, count: c.rules.length, kind: 'xhsrule', summary: '小红书安全中心 · 规则百科' })
    }
  }
  return cats
}

function libraryItems(cat, q, offset, limit, db, banned, slang, platformRules, xhsRules) {
  const [kind, ...rest] = String(cat || '').split(':')
  const key = rest.join(':')
  const lq = String(q || '').trim().toLowerCase()
  let items = []
  if (kind === 'copyright') {
    items = db.records.filter((r) => r.object_type !== '店铺' && r.category !== '店铺来源提醒' && ((r.category || '待分类') === key))
      .map((r) => ({ name: r.name, objectType: r.object_type || '', labels: r.labels || [], companies: r.companies || [], registrations: r.registrations || [], category: r.category || '' }))
    if (lq) items = items.filter((x) => x.name.toLowerCase().includes(lq))
  } else if (kind === 'banned') {
    const g = (banned.groups || {})[key] || {}
    items = banned.terms.filter((t) => t.group === key).map((t) => ({ term: t.term, group: key, groupName: g.name || key, level: g.level || 'amber', advice: t.replace || g.advice || '' }))
    if (lq) items = items.filter((x) => x.term.toLowerCase().includes(lq))
  } else if (kind === 'slang') {
    items = slang.terms.filter((t) => (t.category_name || '其他') === key)
      .map((t) => ({ name: t.name, variants: (t.variants || []).slice(0, 8), liveness: t.liveness || '', risk: t.risk || '', explanation: t.explanation || '' }))
    if (lq) items = items.filter((x) => (x.name + ' ' + x.variants.join(' ')).toLowerCase().includes(lq))
  } else if (kind === 'platform') {
    const c = (platformRules.categories || []).find((x) => x.id === key)
    if (c) {
      items = c.items.map((it) => ({ text: it.text, level: it.level || c.level || 'amber', advice: it.advice || '' }))
      if (lq) items = items.filter((x) => x.text.toLowerCase().includes(lq))
    }
  } else if (kind === 'xhsrule') {
    const c = ((xhsRules && xhsRules.categories) || []).find((x) => x.id === key)
    if (c) {
      items = c.rules.map((r) => ({ name: r.name, text: r.text || '' }))
      if (lq) items = items.filter((x) => (x.name + ' ' + x.text).toLowerCase().includes(lq))
    }
  }
  const total = items.length
  const off = Math.max(0, Number(offset) || 0)
  const lim = Math.min(200, Math.max(1, Number(limit) || 50))
  return { total, offset: off, limit: lim, items: items.slice(off, off + lim) }
}

/* ------------------------------------------------------------------ */
/* LLM review                                                          */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `你是「虚拟商品违规风险检测」助手，专注于「小红书」虚拟商品（课程、模板、素材、知识库、软件、资料、账号/会员等）的发布前排查。
你的任务是结合给定的本地词库命中结果，对用户提供的商品名称、标题、正文与配图做一次合规风险复核。

判断维度：
1. 版权与转售授权：是否涉及他人作品、课程、影视、软件、字体、IP 形象；是否在未授权情况下搬运或转卖。
2. 平台违禁与限售：色情低俗、赌博、毒品、武器、账号买卖、会员代充、代考代写、虚假证件、破解软件、海外接码/翻墙等；以及封建迷信、涉未成年人内容。
3. 广告法极限词与虚假宣传：国家级、世界级、100%、最、第一、永久、包过等。
4. 暗语与绕审核写法：谐音、拼音、首字母、拆字、中英混写等。
5. 配图与交付文件：图片、PPT、Word、Excel、ZIP 里出现或提取出的文字，以及图片中的品牌 Logo、课程封面、影视截图、二维码、联系方式、水印等。
6. 平台规则：小红书站外导流/联系方式、类目与下架风险、私信规则、AI 生成内容与虚假种草、大健康医疗敏感词、涉未成年人等（见用户消息里的「平台规则要点」）。

重要平台口径（必须遵守，避免误判正常虚拟商品）：
- 小红书支持「个人售卖」，也支持店铺「电子资源」类目和官方自动发货；知识库、模板、PPT、课件、图片、资料等虚拟商品，通过网盘链接、飞书文档链接、邮箱或官方发货链接交付，都属于正常履约方式，不是售假。
- 不得仅因出现「秒发」「自动发货」「网盘链接」「网盘发货」「电子版」「PDF版」「发货链接」「网盘」等词，判定售假或侵权。
- 售假/假冒只指：冒充品牌方或官方正品、售卖盗版复制件、伪造授权、以假充真。必须结合商品名称、内容来源、授权信息与实际交付物判断，不能只凭单个词。
- 自有原创的虚拟商品用上述方式交付，属于正常经营，不要因为交付方式本身扣分。

要求：
- 明确区分「词库命中线索」与「你的判断」，不要夸大，也不要因为没命中就判定安全。
- 给每一条发现一个明确的依据与可执行的改写建议。
- 输出必须是严格 JSON，不要包裹代码块，字段如下：
{
  "level": "red" | "amber" | "green",
  "score": 0-100 的整数,
  "summary": "两到三句话的总体结论",
  "findings": [
    {"category": "版权|违禁|极限词|暗语|平台规则|配图|其他", "severity": "high|medium|low", "evidence": "命中的片段或图片描述", "reason": "为什么有风险", "suggestion": "怎么改"}
  ],
  "rewritten_title": "给出一个更安全的标题，没有风险则原样返回",
  "rewritten_content": "给出更安全的正文改写要点，或原样返回"
}
没有发现风险时 level 为 green、findings 为空数组。`

function buildUserText(input, local) {
  const lines = []
  lines.push('请复核以下虚拟商品：')
  if (input.productName) lines.push(`商品名称：${input.productName}`)
  if (input.title) lines.push(`商品标题：${input.title}`)
  if (input.content) lines.push(`商品正文/详情：\n${input.content}`)
  if (input.images && input.images.length) lines.push(`配图：共 ${input.images.length} 张，见附图。`)
  if (input.files && input.files.length) {
    lines.push(`交付文件：共 ${input.files.length} 个`)
    for (const f of input.files) lines.push(`  · ${f.name}（${f.kind}，${Math.round((f.size || 0) / 1024)}KB，提取文本 ${f.chars} 字、图片 ${f.images} 张）`)
  }
  if (input.fileText) lines.push(`交付文件文本节选：\n${input.fileText.slice(0, 12000)}`)
  lines.push('')
  lines.push('本地词库检测结果：')
  lines.push(`- 综合等级：${local.local.levelName}（${local.local.level}）`)
  lines.push(`- 命中统计：版权 ${local.local.counts.copyright} 条，违禁/极限词 ${local.local.counts.banned} 条`)
  if (local.local.reasons.length) lines.push(`- 触发原因：${local.local.reasons.join('、')}`)
  const top = local.local.hits.slice(0, 25)
  if (top.length) {
    lines.push('- 命中明细：')
    for (const h of top) lines.push(`  · [${h.kind}] ${h.fragment} → ${h.advice}`)
  } else lines.push('- 命中明细：无')
  if (local.query && local.query.status !== 'no_match') {
    lines.push(`- 商品名称名单查询：${local.query.guidance}`)
    for (const m of local.query.matches.slice(0, 5)) {
      lines.push(`  · ${m.name}（${m.match_type}${m.labels && m.labels.length ? '；' + m.labels.join('、') : ''}）`)
    }
  }
  if (local.rulesText) {
    lines.push('')
    lines.push('平台规则要点（参考，来源于平台公开规则与知识星球整理）：')
    lines.push(local.rulesText)
  }
  lines.push('')
  lines.push('请基于以上信息给出严格 JSON 结论。')
  return lines.join('\n')
}

function parseModelJson(text) {
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const obj = JSON.parse(text.slice(start, end + 1))
    if (!obj || typeof obj !== 'object') return null
    if (!['red', 'amber', 'green'].includes(obj.level)) obj.level = 'amber'
    if (typeof obj.score !== 'number') obj.score = obj.level === 'red' ? 80 : obj.level === 'amber' ? 55 : 20
    if (!Array.isArray(obj.findings)) obj.findings = []
    obj.score = Math.max(0, Math.min(100, Math.round(obj.score)))
    return obj
  } catch {
    return null
  }
}

async function llmReview(ctx, input, local, override) {
  const llm = ctx.get ? ctx.get('llm') : undefined
  if (!llm || typeof llm.stream !== 'function') {
    return { available: false, reason: '当前宿主未提供 llm 服务，已仅返回本地词库结果。' }
  }
  let provider = override.provider || ''
  let model = override.model || ''
  if (!provider || !model) {
    try {
      const sel = ctx.get && ctx.get('agentDefaultModel') && ctx.get('agentDefaultModel').currentSelection()
      if (sel) {
        if (!provider) provider = sel.provider
        if (!model && (!provider || provider === sel.provider)) model = sel.model || ''
      }
    } catch { /* ignore */ }
  }
  if (!provider || !model) return { available: false, reason: '未找到可用的模型，请在插件配置里指定 provider / model。' }
  const content = [{ type: 'text', text: buildUserText(input, local) }]
  const attachments = ctx.get ? ctx.get('attachments') : undefined
  const imageErrors = []
  const modelImages = Array.isArray(input.modelImages) ? input.modelImages : (Array.isArray(input.images) ? input.images : [])
  if (attachments && typeof attachments.saveImage === 'function' && modelImages.length) {
    for (const img of modelImages.slice(0, 8)) {
      try {
        const bytes = Buffer.from(img.data, 'base64')
        const ref = await attachments.saveImage({ data: new Uint8Array(bytes), mediaType: img.mediaType || 'image/png', name: img.name })
        content.push({ type: 'image', attachment: ref })
      } catch (e) { imageErrors.push(String(e && e.message ? e.message : e)) }
    }
  }
  const messages = [{ role: 'user', content }]
  let text = ''
  try {
    const stream = llm.stream({ provider, model, system: SYSTEM_PROMPT, messages, maxTokens: 2600, temperature: 0.2 })
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'finish' && chunk.reason && chunk.reason.kind === 'error') {
        throw new Error((chunk.reason.failure && chunk.reason.failure.message) || '模型调用失败')
      } else if (chunk.type === 'finish' && chunk.reason && chunk.reason.kind === 'aborted') {
        throw new Error('模型调用被中断')
      }
    }
  } catch (e) {
    return { available: false, reason: `模型调用失败：${e && e.message ? e.message : String(e)}`, provider, model, imageErrors }
  }
  const parsed = parseModelJson(text)
  if (!parsed) {
    return { available: true, parseError: true, raw: text, provider, model, imageErrors, level: 'amber', score: 55, summary: text.slice(0, 800), findings: [], rewritten_title: '', rewritten_content: '' }
  }
  return { available: true, provider, model, imageErrors, ...parsed }
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

const MAX_BODY = 32 * 1024 * 1024

function readJsonBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(Object.assign(new Error('请求体过大'), { statusCode: 413 })); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (e) { reject(Object.assign(new Error('请求体不是合法 JSON'), { statusCode: 400 })) }
    })
    req.on('error', reject)
  })
}

function writeJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8')
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('content-length', String(body.length))
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

function normalizeRiskLibrary(raw) {
  const records = (raw.records || []).map((r) => ({
    id: r.code || r.id,
    name: r.title || r.name,
    variants: r.aliases || r.variants || [],
    category: r.domain || r.category || '其他',
    object_type: r.kind || r.object_type || '版权词',
    companies: r.rightsHolders || r.companies || [],
    labels: r.riskTags || r.labels || [],
    registrations: r.copyrightNumbers || r.registrations || [],
  }))
  return { updated_at: raw.updatedAt || raw.updated_at || '', records }
}

function normalizeHandling(raw) {
  if (raw && raw.label_groups) return raw
  return {
    levels: raw.levels, status: raw.status,
    registration_weight: raw.registrationWeight || 0,
    label_groups: raw.labelGroups || [],
    categories: raw.categories || {},
    platform_notes: raw.platformNotes || {},
    object_types: raw.objectTypes || {},
    checklist: raw.checklist || [],
    no_match: raw.noMatch || { actions: [] },
    candidates: raw.candidates || { actions: [] },
    disguised: raw.disguised || { actions: [] },
    notice: raw.notice || '',
  }
}

export const inject = ['webServer']

export function apply(ctx, config) {
  config = config || {}
  let db, banned, slang, rules, platformRules
  try {
    db = normalizeRiskLibrary(loadJson('risk-library.json'))
    banned = loadJson('banned-words.json')
    slang = { terms: [] } // 平台暗语已移除
    rules = normalizeHandling(loadJson('handling.json'))
  } catch (e) {
    ctx.logger && ctx.logger.warn && ctx.logger.warn('dsh-virtual-product-risk: 词库加载失败 %s', String(e && e.message ? e.message : e))
    throw e
  }
  try { platformRules = loadJson('platform-rules.json') } catch (e) { platformRules = { version: '', categories: [] } }
  let xhsRules
  try { xhsRules = loadJson('xhs-rules.json') } catch (e) { xhsRules = { version: '', categories: [] } }
  const T = pinyinTable()
  const indexes = buildIndexes(db, slang, banned)
  indexes.banned = banned
  const libraryCats = buildLibraryCats(db, banned, slang, platformRules, xhsRules)
  const platformText = (platformRules.categories || [])
    .map((c) => `· ${c.name}（${c.platform}）：${(c.items || []).slice(0, 6).map((i) => i.text).join('；')}`)
    .join('\n')
  const officialText = (xhsRules.categories || [])
    .map((c) => `· ${c.name}：${(c.rules || []).map((r) => r.name).join('、')}`)
    .join('\n')
  const rulesText = [platformText, officialText].filter(Boolean).join('\n')

  const stats = {
    updatedAt: db.updated_at || '',
    names: db.records.filter((r) => r.object_type !== '店铺' && r.category !== '店铺来源提醒').length,
    slang: slang.terms.length,
    banned: banned.terms.filter((t) => ((banned.groups || {})[t.group] || {}).scan !== false).length,
    platformRules: (platformRules.categories || []).length,
    xhsRules: (xhsRules.categories || []).reduce((a, c) => a + ((c.rules || []).length), 0),
    libraryCats: libraryCats.length,
    notice: CAUTION,
  }

  function fence(req) {
    const connection = ctx.get ? ctx.get('connection') : undefined
    if (!connection || typeof connection.requestRejection !== 'function') return true
    try { return connection.requestRejection(req) === undefined } catch { return true }
  }

  async function analyze(payload) {
    const input = {
      productName: typeof payload.productName === 'string' ? payload.productName.trim() : '',
      title: typeof payload.title === 'string' ? payload.title : '',
      content: typeof payload.content === 'string' ? payload.content : '',
      images: Array.isArray(payload.images) ? payload.images.filter((i) => i && typeof i.data === 'string') : [],
      files: [],
      fileText: '',
      modelImages: [],
    }
    const rawFiles = Array.isArray(payload.files) ? payload.files.filter((f) => f && typeof f.data === 'string') : []
    const fileReports = []
    const fileTexts = []
    const fileImages = []
    for (const f of rawFiles.slice(0, 10)) {
      const rep = parseDeliveryFile(String(f.name || 'file'), String(f.mediaType || ''), f.data)
      fileReports.push({ name: rep.name, kind: rep.kind, size: rep.size, chars: (rep.text || '').length, images: rep.images.length, notes: rep.notes, listing: (rep.listing || []).slice(0, 80) })
      if (rep.text) fileTexts.push(`【文件：${rep.name}】\n${rep.text}`)
      for (const im of rep.images) fileImages.push(im)
    }
    input.files = fileReports
    input.fileText = fileTexts.join('\n\n').slice(0, MAX_FILE_TEXT)
    input.modelImages = [...input.images, ...fileImages].slice(0, 8)

    if (!input.productName && !input.title && !input.content && input.images.length === 0 && fileReports.length === 0) {
      throw Object.assign(new Error('请至少填写商品名称、标题、正文，或上传一张配图 / 一个交付文件。'), { statusCode: 400 })
    }

    const lintSource = [input.productName, input.title, input.content, input.fileText.slice(0, 20000)].filter(Boolean).join('\n')
    const local = {
      updatedAt: stats.updatedAt,
      notice: CAUTION,
      local: lintText(db, lintSource, indexes, rules, T),
      query: input.productName ? queryOne(db, input.productName, rules, T) : null,
      rulesText,
    }
    const override = {
      provider: typeof payload.provider === 'string' ? payload.provider : (config.provider || ''),
      model: typeof payload.model === 'string' ? payload.model : (config.model || ''),
    }
    const llm = await llmReview(ctx, input, local, override)
    const order = { green: 0, amber: 1, red: 2 }
    let overall = local.local.level
    if (llm.available && llm.level && order[llm.level] > order[overall]) overall = llm.level
    return {
      updatedAt: stats.updatedAt,
      notice: CAUTION,
      stats,
      local,
      files: fileReports,
      llm,
      overall: { level: overall, levelName: LEVEL_NAMES[overall] },
    }
  }

  function fsWriteUpdateStatus(obj) { try { writeFileSync(join(PKG_DIR, '.update-status.json'), JSON.stringify({ at: new Date().toISOString(), ...obj })) } catch (e) {} }
  const PKG_VERSION = (() => { try { return JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')).version || '' } catch (e) { return '' } })()
  function cmpVer(a, b) {
    const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0)
    const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1 }
    return 0
  }
  async function fetchLatestVersion(registry, timeoutMs) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const r = await fetch(registry.replace(/\/$/, '') + '/dsh-virtual-product-risk', { signal: ctl.signal, headers: { accept: 'application/json' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      const latest = d && d['dist-tags'] && d['dist-tags'].latest
      if (!latest) throw new Error('no latest tag')
      return latest
    } finally { clearTimeout(timer) }
  }
  async function checkUpdate() {
    const out = { current: PKG_VERSION, latest: '', hasUpdate: false, channel: '', error: '' }
    const channels = [['cn', 'https://registry.npmmirror.com', 4500], ['official', 'https://registry.npmjs.org', 7000]]
    for (const [ch, reg, to] of channels) {
      try {
        const v = await fetchLatestVersion(reg, to)
        out.latest = v; out.channel = ch; out.hasUpdate = cmpVer(v, PKG_VERSION) > 0
        return out
      } catch (e) { out.error = (out.error ? out.error + '; ' : '') + ch + ': ' + (e && e.message ? e.message : String(e)) }
    }
    return out
  }

  let modelOptionsCache = null
  async function getModelOptions() {
    if (modelOptionsCache) return modelOptionsCache
    const out = { default: { provider: '', model: '' }, providers: [] }
    try {
      const adm = ctx.get ? ctx.get('agentDefaultModel') : undefined
      const sel = adm && typeof adm.currentSelection === 'function' ? adm.currentSelection() : null
      if (sel) out.default = { provider: sel.provider || '', model: sel.model || '' }
    } catch (e) { /* ignore */ }
    const llm = ctx.get ? ctx.get('llm') : undefined
    if (llm && typeof llm.listProviders === 'function') {
      let provs = []
      try { provs = llm.listProviders() || [] } catch (e) { provs = [] }
      for (const p of provs) {
        let models = []
        try {
          if (typeof llm.listModels === 'function') {
            const ms = await llm.listModels(p.id)
            models = (ms || []).map((m) => ({ id: m.id, name: m.name || m.id }))
          }
        } catch (e) { models = [] }
        out.providers.push({ id: p.id, name: p.name || p.id, models })
      }
    }
    modelOptionsCache = out
    return out
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/virtual-product-risk/api',
    handler: async (req, res) => {
      if (!fence(req)) return writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } })
      const u = new URL(req.url || '/', 'http://dsh.internal')
      const pathname = u.pathname
      try {
        if (pathname === '/virtual-product-risk/api/meta' || pathname === '/virtual-product-risk/api/health') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          return writeJson(res, 200, { ok: true, stats })
        }
        if (pathname === '/virtual-product-risk/api/update-check') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          const info = await checkUpdate()
          return writeJson(res, 200, { ok: true, ...info })
        }
        if (pathname === '/virtual-product-risk/api/update-status') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          let status = null
          try { status = JSON.parse(readFileSync(join(PKG_DIR, '.update-status.json'), 'utf8')) } catch (e) { status = null }
          return writeJson(res, 200, { ok: true, status })
        }
        if (pathname === '/virtual-product-risk/api/update') {
          if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          const body = await readJsonBody(req).catch(() => ({}))
          const info = await checkUpdate()
          if (!info.hasUpdate) return writeJson(res, 200, { ok: true, upToDate: true, current: info.current, latest: info.latest || info.current })
          const pm = ctx.get ? ctx.get('pluginManager') : undefined
          if (!pm || typeof pm.updateBundle !== 'function') return writeJson(res, 501, { ok: false, error: { code: 'no-plugin-manager', message: '当前宿主不支持自动更新，请手动执行 dsh plugin add dsh-virtual-product-risk@latest' } })
          const channel = body.channel === 'official' ? 'official' : (body.channel === 'cn' ? 'cn' : (info.channel || 'cn'))
          const reg = channel === 'cn' ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.org'
          try { fsWriteUpdateStatus({ ok: null, state: 'running', version: info.latest, channel, registry: reg }) } catch (e) {}
          try {
            pm.updateBundle('dsh-virtual-product-risk', info.latest, { registry: reg }).then((r) => {
              try { fsWriteUpdateStatus({ ok: true, version: info.latest, channel, registry: reg, result: r && r.step }) } catch (e) {}
            }).catch((e) => { try { fsWriteUpdateStatus({ ok: false, version: info.latest, channel, registry: reg, error: String(e && e.message ? e.message : e) }) } catch (e2) {} })
            return writeJson(res, 200, { ok: true, started: true, current: info.current, latest: info.latest, channel, registry: reg })
          } catch (e) {
            return writeJson(res, 500, { ok: false, error: { code: 'update-failed', message: String(e && e.message ? e.message : e) } })
          }
        }
        if (pathname === '/virtual-product-risk/api/models') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          const opts = await getModelOptions()
          return writeJson(res, 200, { ok: true, ...opts })
        }
        if (pathname === '/virtual-product-risk/api/library') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          const cat = u.searchParams.get('cat')
          if (!cat) return writeJson(res, 200, { ok: true, categories: libraryCats })
          const data = libraryItems(cat, u.searchParams.get('q') || '', u.searchParams.get('offset'), u.searchParams.get('limit'), db, banned, slang, platformRules, xhsRules)
          return writeJson(res, 200, { ok: true, ...data, cat })
        }
        if (pathname === '/virtual-product-risk/api/analyze') {
          if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          const payload = await readJsonBody(req)
          const result = await analyze(payload)
          return writeJson(res, 200, { ok: true, result })
        }
        return writeJson(res, 404, { ok: false, error: { code: 'not-found', message: 'unknown api' } })
      } catch (e) {
        return writeJson(res, e && e.statusCode ? e.statusCode : 500, { ok: false, error: { code: 'error', message: e && e.message ? e.message : String(e) } })
      }
    },
  }), 'dsh-virtual-product-risk: api routes')

  ctx.logger && ctx.logger.info && ctx.logger.info('dsh-virtual-product-risk: ready (%d names)', stats.names)
}

// 供本地单元测试使用；不影响插件运行时导出。
export const __test = { loadJson, normalizeRiskLibrary, normalizeHandling, buildIndexes, lintText, queryOne, pinyinTable }
