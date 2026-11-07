/**
 * dsh-virtual-product-risk — Client half.
 *
 * A light, shadcn-style workbench rendered into the Harness Web UI:
 *  - 检测：名称 / 标题 / 正文 / 配图 / 交付文件（zip、PPT、Word、Excel、PDF、图片…）
 *  - 资料库：左侧分类列表 + 右侧规则条目
 */
window.__ModuleLoader__.load({
  id: 'dsh-virtual-product-risk',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

    const NS = 'dsh-virtual-product-risk'
    const PANEL_KEY = 'virtual-product-risk'

    const DICT = {
      zh: {
        nav: '小红书违规检测',
        tabCheck: '检测',
        tabLibrary: '资料库',
        title: '小红书虚拟商品违规风险检测',
        subtitle: '版权 / 违禁词词库 + 小红书平台规则 + DeepSeek 复核。',
        formTitle: '商品信息',
        name: '商品名称', namePh: '例如：粉笔公考全套网盘秒发',
        titleField: '商品标题', titlePh: '粘贴你准备上架的标题',
        content: '商品正文 / 详情', contentPh: '粘贴商品详情、卖点、交付内容等',
        images: '配图', imagesHint: '支持 PNG / JPG / WebP，最多 6 张',
        addImage: '添加配图',
        files: '交付文件', filesHint: '支持 ZIP / PPT / Word / Excel / PDF / 图片 / TXT；会把文件里的文字和图片交给 DeepSeek 识别',
        addFile: '添加交付文件',
        advanced: '高级选项',
        provider: '模型 provider', model: '模型 model', modelFollowHost: '跟随宿主当前模型', modelPick: '选择模型…',
        run: '开始检测', running: '检测中…', clear: '清空',
        emptyTitle: '上传一个虚拟商品，先查风险再上架',
        emptyDesc: '填写名称、标题、正文，上传配图与交付文件，点击「开始检测」。',
        localSection: '本地词库检测', llmSection: 'DeepSeek 复核', handlingSection: '运营处置建议', querySection: '名单查询', filesSection: '交付文件解析', hits: '命中明细',
        noHits: '未命中版权或违禁词。',
        reasons: '触发原因', counts: '版权 {c} · 违禁/极限词 {b}',
        score: '风险分', rewriteTitle: '建议标题', rewriteContent: '建议正文', summary: '结论', findings: '发现',
        evidence: '依据', reason: '原因', suggestion: '建议', meaning: '这意味着', actions: '可行做法',
        docs: '上架前要拿到', alternatives: '换个方向', platforms: '平台提示', checklist: '合规四查', notice: '底线',
        disclaimer: '命中是核对线索，不是违规结论；未命中也不代表安全或已获授权。',
        metaUpdated: '词库日期', metaNames: '名称', metaSlang: '暗语', metaBanned: '违禁词', metaRules: '平台规则', metaXhsRules: '规则百科',
        llmUnavailable: '未调用大模型',
        errRequired: '请至少填写商品名称、标题、正文，或上传一张配图 / 一个交付文件。',
        errNetwork: '请求失败，请稍后重试。', clearDone: '已清空。',
        levelRed: '红灯', levelAmber: '黄灯', levelGreen: '绿灯',
        libTitle: '资料库', libHint: '规则按分类整理，左侧选分类，右侧看条目。', libSearch: '搜索条目…', libSearchBtn: '搜索',
        libLoading: '加载中…', libEmpty: '该分类暂无可显示条目', libCount: '共 {n} 条', libMore: '加载更多',
        libAllGroups: '全部', source: '来源', platform: '平台',
        themeLight: '浅色', themeDark: '深色', themeAuto: '自动识别',
        updateCheck: '检查更新', updateChecking: '检查中…', updateUpdating: '更新中…', updateAvailable: '可更新版本', updateUpToDate: '已是最新版本', updateFailed: '检查更新失败',
      },
      en: {
        nav: 'Risk check', tabCheck: 'Check', tabLibrary: 'Library',
        title: 'Xiaohongshu virtual product risk check',
        subtitle: 'Local lexicon + XHS platform rules + a DeepSeek review.',
        formTitle: 'Product',
        name: 'Product name', namePh: 'e.g. exam course bundle',
        titleField: 'Title', titlePh: 'Paste the listing title',
        content: 'Body / details', contentPh: 'Paste the listing details and selling points',
        images: 'Images', imagesHint: 'PNG / JPG / WebP, up to 6', addImage: 'Add image',
        files: 'Delivery files', filesHint: 'ZIP / PPT / Word / Excel / PDF / images / TXT — text and images are extracted for DeepSeek', addFile: 'Add delivery file',
        advanced: 'Advanced', provider: 'Provider', model: 'Model', modelFollowHost: 'Follow host default', modelPick: 'Select a model…',
        run: 'Check risk', running: 'Checking…', clear: 'Clear',
        emptyTitle: 'Upload a virtual product and check the risk before listing',
        emptyDesc: 'Fill in name, title, body, images and delivery files, then click Check.',
        localSection: 'Local lexicon', llmSection: 'DeepSeek review', handlingSection: 'Handling advice', querySection: 'Name lookup', filesSection: 'Parsed files', hits: 'Matched fragments',
        noHits: 'No copyright or banned-word hits.',
        reasons: 'Reasons', counts: '{c} copyright · {b} banned',
        score: 'Score', rewriteTitle: 'Suggested title', rewriteContent: 'Suggested body', summary: 'Summary', findings: 'Findings',
        evidence: 'Evidence', reason: 'Why', suggestion: 'Suggestion', meaning: 'What it means', actions: 'Actions',
        docs: 'Get before listing', alternatives: 'Alternatives', platforms: 'Platform notes', checklist: 'Four checks', notice: 'Bottom line',
        disclaimer: 'A hit is a review lead, not a violation; no hit is not proof of safety or authorization.',
        metaUpdated: 'Lexicon', metaNames: 'names', metaSlang: 'slang', metaBanned: 'banned', metaRules: 'rules', metaXhsRules: 'rules wiki',
        llmUnavailable: 'Model not called',
        errRequired: 'Enter a name, title, body or upload an image / file.', errNetwork: 'Request failed, please retry.', clearDone: 'Cleared.',
        levelRed: 'High', levelAmber: 'Medium', levelGreen: 'Low',
        libTitle: 'Library', libHint: 'Rules grouped by category; pick one on the left.', libSearch: 'Search…', libSearchBtn: 'Search',
        libLoading: 'Loading…', libEmpty: 'No items', libCount: '{n} items', libMore: 'Load more', libAllGroups: 'All', source: 'Source', platform: 'Platform',
        themeLight: 'Light', themeDark: 'Dark', themeAuto: 'Auto',
        updateCheck: 'Check updates', updateChecking: 'Checking…', updateUpdating: 'Updating…', updateAvailable: 'Update available', updateUpToDate: 'Up to date', updateFailed: 'Update check failed',
      },
    }

    const CSS = `
.vpr-root{--vpr-bg:#fafafa;--vpr-surface:#ffffff;--vpr-surface-2:#fafafa;--vpr-fg:#09090b;--vpr-fg-2:#3f3f46;--vpr-muted-fg:#71717a;--vpr-faint:#a1a1aa;--vpr-border:#e4e4e7;--vpr-border-soft:#f1f1f2;--vpr-border-strong:#d4d4d8;--vpr-muted:#f4f4f5;--vpr-hover:#f4f4f5;--vpr-input:#ffffff;--vpr-primary:#18181b;--vpr-primary-fg:#fafafa;--vpr-primary-hover:#3f3f46;--vpr-active-bg:#18181b;--vpr-active-fg:#fafafa;--vpr-ring:rgba(24,24,27,.08);--vpr-shadow:rgba(0,0,0,.04);--vpr-shadow-strong:rgba(0,0,0,.12);--vpr-badge-fg:#ffffff;--vpr-danger:#dc2626;--vpr-amber:#d97706;--vpr-green:#16a34a;--vpr-tag-red-bg:#fef2f2;--vpr-tag-red-fg:#b91c1c;--vpr-tag-red-bd:#fecaca;--vpr-tag-amber-bg:#fffbeb;--vpr-tag-amber-fg:#b45309;--vpr-tag-amber-bd:#fde68a;--vpr-tag-green-bg:#f0fdf4;--vpr-tag-green-fg:#15803d;--vpr-tag-green-bd:#bbf7d0;
  height:100%;overflow:auto;box-sizing:border-box;padding:22px 26px 48px;background:var(--vpr-bg);color:var(--vpr-fg);color-scheme:light;container-type:inline-size;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
.vpr-root.vpr-dark{--vpr-bg:#0b0b0d;--vpr-surface:#151518;--vpr-surface-2:#1b1b1f;--vpr-fg:#f4f4f5;--vpr-fg-2:#d4d4d8;--vpr-muted-fg:#a1a1aa;--vpr-faint:#71717a;--vpr-border:#2a2a30;--vpr-border-soft:#232327;--vpr-border-strong:#3a3a42;--vpr-muted:#1e1e23;--vpr-hover:#232327;--vpr-input:#1b1b1f;--vpr-primary:#f4f4f5;--vpr-primary-fg:#18181b;--vpr-primary-hover:#d4d4d8;--vpr-active-bg:#2f2f37;--vpr-active-fg:#f4f4f5;--vpr-ring:rgba(244,244,245,.14);--vpr-shadow:rgba(0,0,0,.5);--vpr-shadow-strong:rgba(0,0,0,.6);--vpr-badge-fg:#0b0b0d;--vpr-danger:#f87171;--vpr-amber:#fbbf24;--vpr-green:#4ade80;--vpr-tag-red-bg:#2a1416;--vpr-tag-red-fg:#fca5a5;--vpr-tag-red-bd:#4c1d1d;--vpr-tag-amber-bg:#2a2110;--vpr-tag-amber-fg:#fbbf24;--vpr-tag-amber-bd:#4a3410;--vpr-tag-green-bg:#0f2417;--vpr-tag-green-fg:#4ade80;--vpr-tag-green-bd:#16532f;color-scheme:dark}
.vpr-root *{box-sizing:border-box}
.vpr-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px}
.vpr-head-mark{width:44px;height:44px;border-radius:12px;flex:none;background:var(--vpr-active-bg);color:var(--vpr-active-fg);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px var(--vpr-shadow-strong)}
.vpr-head-main{flex:1;min-width:0}
.vpr-h1{font-size:20px;font-weight:650;letter-spacing:-.01em;margin:0}
.vpr-sub{color:var(--vpr-muted-fg);font-size:12.5px;line-height:1.5;margin:4px 0 0}
.vpr-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.vpr-chip{font-size:11.5px;color:var(--vpr-muted-fg);background:var(--vpr-surface);border:1px solid var(--vpr-border);border-radius:999px;padding:3px 9px;line-height:1.4}
.vpr-chip b{color:var(--vpr-fg);font-weight:600}
.vpr-head-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.vpr-head-right .vpr-theme{margin-left:0}
.vpr-update{font:inherit;font-size:12px;font-weight:600;border-radius:9px;padding:6px 12px;cursor:pointer;border:1px solid var(--vpr-border);background:var(--vpr-surface);color:var(--vpr-fg-2);white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
.vpr-update:hover{background:var(--vpr-muted)}
.vpr-update-has{background:var(--vpr-tag-amber-bg);color:var(--vpr-tag-amber-fg);border-color:var(--vpr-tag-amber-bd)}
.vpr-update-busy{opacity:.65;cursor:default}
.vpr-update-msg{font-size:11px;color:var(--vpr-muted-fg);max-width:220px;line-height:1.3}
.vpr-theme{margin-left:auto;display:inline-flex;gap:2px;background:var(--vpr-muted);border:1px solid var(--vpr-border);border-radius:9px;padding:3px;flex:none}
.vpr-theme button{border:0;background:transparent;color:var(--vpr-muted-fg);font:inherit;font-size:12px;cursor:pointer;border-radius:6px;padding:5px 10px;white-space:nowrap;transition:background .15s,color .15s}
.vpr-theme button:hover{color:var(--vpr-fg)}
.vpr-theme button.vpr-theme-on{background:var(--vpr-surface);color:var(--vpr-fg);box-shadow:0 1px 2px var(--vpr-shadow)}
.vpr-grid{display:flex;gap:20px;align-items:stretch}
.vpr-grid > .vpr-card:first-child{flex:0 0 420px;min-width:0}
.vpr-grid > .vpr-card:last-child{flex:1 1 auto;min-width:0}
@container (max-width: 1220px){.vpr-app{flex-direction:column}.vpr-app > .vpr-side,.vpr-app > .vpr-main{flex:1 1 auto;width:100%}.vpr-grid{flex-direction:column}.vpr-grid > .vpr-card:first-child,.vpr-grid > .vpr-card:last-child{flex:1 1 auto}}
@container (min-width: 1221px){.vpr-app{height:max(700px, calc(100vh - 220px))}.vpr-side{height:100%;max-height:none;position:static;overflow:auto}.vpr-main{height:100%;overflow:hidden}.vpr-grid{height:100%}.vpr-grid > .vpr-card{overflow:auto;scrollbar-gutter:stable}}
.vpr-card{background:var(--vpr-surface);border:1px solid var(--vpr-border);border-radius:14px;box-shadow:0 1px 2px var(--vpr-shadow)}
.vpr-card-h{padding:16px 18px;border-bottom:1px solid var(--vpr-border-soft);font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;position:relative}
.vpr-tipwrap{position:static;display:inline-flex;align-items:center;margin-left:2px}
.vpr-pill{font-size:11px;font-weight:600;color:var(--vpr-muted-fg);background:var(--vpr-muted);border:1px solid var(--vpr-border);border-radius:999px;padding:2px 9px;line-height:1.5;cursor:help;white-space:nowrap}
.vpr-tipwrap:hover .vpr-pill{color:var(--vpr-fg);border-color:var(--vpr-faint)}
.vpr-tip{display:none;position:absolute;left:16px;right:auto;top:calc(100% + 8px);width:380px;max-width:75vw;background:var(--vpr-surface);border:1px solid var(--vpr-border);border-radius:12px;box-shadow:0 12px 34px var(--vpr-shadow-strong);padding:12px 14px;z-index:50;text-align:left;font-weight:400}
.vpr-tipwrap:hover .vpr-tip{display:block}
.vpr-tip-h{font-size:12px;font-weight:700;margin-bottom:6px;color:var(--vpr-fg)}
.vpr-tip-row{font-size:11.5px;line-height:1.65;color:var(--vpr-fg-2);margin:4px 0}
.vpr-tip-row b{color:var(--vpr-fg);font-weight:600}
.vpr-tip-note{font-size:11px;color:var(--vpr-muted-fg);margin-top:8px;border-top:1px solid var(--vpr-border-soft);padding-top:7px;line-height:1.6}
.vpr-card-b{padding:14px 16px}
.vpr-grid > .vpr-card:last-child{display:flex;flex-direction:column;overflow:hidden}
.vpr-grid > .vpr-card:last-child > .vpr-card-b{flex:1 1 auto;min-height:0;overflow:auto;scrollbar-gutter:stable;display:flex;flex-direction:column}
.vpr-field{margin-bottom:11px}
.vpr-label{display:block;font-size:12.5px;font-weight:600;color:var(--vpr-fg-2);margin-bottom:6px}
.vpr-input,.vpr-textarea{width:100%;border:1px solid var(--vpr-border);background:var(--vpr-input);color:var(--vpr-fg);border-radius:9px;padding:9px 11px;font:inherit;font-size:13px;line-height:1.55;outline:none;transition:border-color .15s,box-shadow .15s}
.vpr-input::placeholder,.vpr-textarea::placeholder{color:var(--vpr-faint)}
.vpr-input:focus,.vpr-textarea:focus{border-color:var(--vpr-faint);box-shadow:0 0 0 3px var(--vpr-ring)}
.vpr-textarea{resize:vertical;min-height:66px}
.vpr-hint{font-size:11.5px;color:var(--vpr-faint);margin-top:5px;line-height:1.5}
.vpr-drop{border:1px dashed var(--vpr-border-strong);border-radius:10px;padding:11px;text-align:center;color:var(--vpr-muted-fg);font-size:12.5px;cursor:pointer;transition:border-color .15s,background .15s}
.vpr-drop:hover{border-color:var(--vpr-faint);background:var(--vpr-surface-2)}
.vpr-thumbs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.vpr-thumb{position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid var(--vpr-border);background:var(--vpr-muted)}
.vpr-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.vpr-thumb-x{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:0;cursor:pointer;font-size:11px;line-height:18px;text-align:center;padding:0}
.vpr-files{display:flex;flex-direction:column;gap:7px;margin-top:10px}
.vpr-filechip{display:flex;align-items:center;gap:8px;background:var(--vpr-surface-2);border:1px solid var(--vpr-border);border-radius:8px;padding:7px 10px;font-size:12px;color:var(--vpr-fg-2)}
.vpr-filechip .vpr-fname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vpr-filechip .vpr-fmeta{color:var(--vpr-faint);font-size:11px;flex:none}
.vpr-filechip button{border:0;background:transparent;color:var(--vpr-faint);cursor:pointer;font-size:15px;line-height:1;padding:0 2px}
.vpr-filechip button:hover{color:var(--vpr-danger)}
.vpr-adv-toggle{background:none;border:0;color:var(--vpr-muted-fg);font:inherit;font-size:12px;cursor:pointer;padding:0;margin:0 0 10px;display:inline-flex;align-items:center;gap:5px}
.vpr-adv-toggle:hover{color:var(--vpr-fg)}
.vpr-row{display:flex;gap:10px}
.vpr-row>*{flex:1;min-width:0}
.vpr-actions{display:flex;gap:10px;margin-top:6px}
.vpr-btn{appearance:none;border:1px solid transparent;border-radius:9px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:9px 16px;transition:background .15s,opacity .15s,box-shadow .15s}
.vpr-btn-primary{background:var(--vpr-primary);color:var(--vpr-primary-fg);box-shadow:0 1px 2px var(--vpr-shadow-strong)}
.vpr-btn-primary:hover:not(:disabled){background:var(--vpr-primary-hover)}
.vpr-btn-primary:disabled{opacity:.55;cursor:not-allowed}
.vpr-btn-ghost{background:var(--vpr-surface);color:var(--vpr-fg-2);border-color:var(--vpr-border)}
.vpr-btn-ghost:hover{background:var(--vpr-muted)}
.vpr-empty{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 28px;text-align:center}
.vpr-empty-mark{width:56px;height:56px;border-radius:16px;background:var(--vpr-muted);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--vpr-muted-fg)}
.vpr-empty-t{font-size:15px;font-weight:600;margin:0 0 6px}
.vpr-empty-d{font-size:12.5px;color:var(--vpr-muted-fg);line-height:1.65;max-width:440px;margin:0 auto}
.vpr-score{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:14px;border:1px solid var(--vpr-border);border-left:4px solid var(--vpr-border);background:var(--vpr-surface);margin-bottom:16px}
.vpr-score-red{border-left-color:var(--vpr-danger)}
.vpr-score-amber{border-left-color:var(--vpr-amber)}
.vpr-score-green{border-left-color:var(--vpr-green)}
.vpr-score-badge{width:64px;height:64px;border-radius:50%;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--vpr-badge-fg);font-weight:700}
.vpr-score-red .vpr-score-badge{background:var(--vpr-danger)}
.vpr-score-amber .vpr-score-badge{background:var(--vpr-amber)}
.vpr-score-green .vpr-score-badge{background:var(--vpr-green)}
.vpr-score-num{font-size:20px;line-height:1}
.vpr-score-lvl{font-size:10.5px;opacity:.9;margin-top:2px}
.vpr-score-main{flex:1;min-width:0}
.vpr-score-t{font-size:14px;font-weight:650}
.vpr-score-s{font-size:12.5px;color:var(--vpr-muted-fg);margin-top:4px;line-height:1.6}
.vpr-tag{display:inline-flex;align-items:center;font-size:11px;font-weight:600;border-radius:999px;padding:2px 8px;line-height:1.5}
.vpr-tag-red{background:var(--vpr-tag-red-bg);color:var(--vpr-tag-red-fg);border:1px solid var(--vpr-tag-red-bd)}
.vpr-tag-amber{background:var(--vpr-tag-amber-bg);color:var(--vpr-tag-amber-fg);border:1px solid var(--vpr-tag-amber-bd)}
.vpr-tag-green{background:var(--vpr-tag-green-bg);color:var(--vpr-tag-green-fg);border:1px solid var(--vpr-tag-green-bd)}
.vpr-sec{margin-bottom:16px}
.vpr-sec-h{font-size:13px;font-weight:650;margin:0 0 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--vpr-border-soft);padding-bottom:7px}
.vpr-sec-h .vpr-dot{width:6px;height:6px;border-radius:50%;background:var(--vpr-fg)}
.vpr-kv{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.vpr-kv .vpr-chip{background:var(--vpr-muted);border-color:var(--vpr-border-soft)}
.vpr-table{width:100%;border-collapse:collapse;font-size:12.5px}
.vpr-table th{text-align:left;color:var(--vpr-muted-fg);font-weight:600;padding:7px 10px;border-bottom:1px solid var(--vpr-border);font-size:11.5px}
.vpr-table td{padding:8px 10px;border-bottom:1px solid var(--vpr-border-soft);vertical-align:top;line-height:1.55}
.vpr-table tr:last-child td{border-bottom:0}
.vpr-frag{font-weight:600;color:var(--vpr-danger)}
.vpr-frag-slang{color:var(--vpr-amber)}
.vpr-frag-banned{color:var(--vpr-amber)}
.vpr-muted{color:var(--vpr-muted-fg)}
.vpr-list{margin:6px 0 0;padding-left:18px;font-size:12.5px;line-height:1.7;color:var(--vpr-fg-2)}
.vpr-list li{margin:2px 0}
.vpr-finding{display:flex;border:1px solid var(--vpr-border);border-radius:10px;overflow:hidden;margin-bottom:8px;background:var(--vpr-surface)}
.vpr-finding-bar{width:4px;flex:none;background:var(--vpr-border)}
.vpr-finding-body{flex:1;min-width:0;padding:10px 12px}
.vpr-finding-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.vpr-finding-cat{font-size:11px;font-weight:600;color:var(--vpr-fg-2);background:var(--vpr-muted);border-radius:6px;padding:1px 7px;flex:none}
.vpr-finding-ev{font-size:12.5px;font-weight:600;color:var(--vpr-fg);line-height:1.55;word-break:break-word}
.vpr-finding-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 10px;margin-top:7px;font-size:12px;line-height:1.65}
.vpr-finding-k{color:var(--vpr-muted-fg);white-space:nowrap}
.vpr-finding-v{color:var(--vpr-fg-2);min-width:0}
.vpr-finding-row{font-size:12px;color:var(--vpr-fg-2);line-height:1.65;margin:3px 0}
.vpr-finding-row b{color:var(--vpr-fg);font-weight:600}
.vpr-summary{display:flex;gap:12px;padding:12px 14px;border-radius:12px;background:var(--vpr-surface-2);border:1px solid var(--vpr-border);border-left:3px solid var(--vpr-primary);margin-bottom:14px}
.vpr-summary-badge{flex:none;align-self:flex-start;padding-top:1px}
.vpr-summary-body{flex:1;min-width:0}
.vpr-summary-text{font-size:12.5px;line-height:1.7;color:var(--vpr-fg-2);white-space:pre-wrap;word-break:break-word}
.vpr-summary-meta{font-size:11px;color:var(--vpr-muted-fg);margin-top:5px}
.vpr-sub-h{font-size:12px;font-weight:650;color:var(--vpr-fg-2);margin:14px 0 8px;display:flex;align-items:center;gap:6px}
.vpr-card-box{background:var(--vpr-surface-2);border:1px solid var(--vpr-border);border-radius:10px;padding:11px 13px;margin-bottom:12px}
.vpr-card-box .vpr-lvl{font-size:13px;font-weight:650}
.vpr-note{font-size:11.5px;color:var(--vpr-faint);line-height:1.6;margin-top:16px;padding-top:12px;border-top:1px solid var(--vpr-border-soft)}
.vpr-err{background:var(--vpr-tag-red-bg);border:1px solid var(--vpr-tag-red-bd);color:var(--vpr-tag-red-fg);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px}
.vpr-spin{width:14px;height:14px;border:2px solid color-mix(in srgb, currentColor 32%, transparent);border-top-color:currentColor;border-radius:50%;display:inline-block;animation:vprspin .7s linear infinite;vertical-align:-2px;margin-right:6px}
@keyframes vprspin{to{transform:rotate(360deg)}}
.vpr-app{display:flex;gap:18px;align-items:stretch}
.vpr-app > .vpr-side{flex:0 0 248px;min-width:0}
.vpr-app > .vpr-main{flex:1 1 auto;min-width:0}

.vpr-side{background:var(--vpr-surface);border:1px solid var(--vpr-border);border-radius:14px;padding:10px;overflow:auto}
.vpr-side-check{display:flex;width:100%;align-items:center;gap:9px;border:0;background:var(--vpr-active-bg);color:var(--vpr-active-fg);font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:9px;padding:10px 11px;box-shadow:0 1px 2px var(--vpr-shadow-strong)}
.vpr-side-check .vpr-side-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vpr-side-check .vpr-side-ico{display:inline-flex;flex:none}
.vpr-side-check:not(.vpr-side-check-on){background:var(--vpr-muted);color:var(--vpr-fg-2);box-shadow:none}
.vpr-side-check:not(.vpr-side-check-on):hover{background:var(--vpr-hover)}
.vpr-side-sep{height:1px;background:var(--vpr-border-soft);margin:9px 6px}
.vpr-main{min-width:0}
.vpr-lib-gt{font-size:11px;font-weight:700;color:var(--vpr-faint);letter-spacing:.04em;padding:10px 10px 4px}
.vpr-lib-item{display:flex;width:100%;align-items:center;gap:8px;border:0;background:transparent;font:inherit;font-size:12.5px;color:var(--vpr-fg-2);text-align:left;cursor:pointer;border-radius:8px;padding:7px 10px}
.vpr-lib-item:hover{background:var(--vpr-muted)}
.vpr-lib-item-on{background:var(--vpr-active-bg);color:var(--vpr-active-fg)}
.vpr-lib-item .vpr-lib-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vpr-lib-item .vpr-lib-c{font-size:10.5px;color:var(--vpr-faint);flex:none}
.vpr-lib-item-on .vpr-lib-c{color:var(--vpr-active-fg);opacity:.72}
.vpr-lib-main{background:var(--vpr-surface);border:1px solid var(--vpr-border);border-radius:14px;min-height:320px}
.vpr-lib-head{padding:14px 18px;border-bottom:1px solid var(--vpr-border-soft);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.vpr-lib-title{font-size:14px;font-weight:650;flex:1;min-width:120px}
.vpr-search{display:flex;gap:8px}
.vpr-search input{border:1px solid var(--vpr-border);background:var(--vpr-input);color:var(--vpr-fg);border-radius:8px;padding:7px 10px;font:inherit;font-size:12.5px;outline:none;width:180px}
.vpr-search input:focus{border-color:var(--vpr-faint)}
.vpr-search button{border:1px solid var(--vpr-border);background:var(--vpr-surface);border-radius:8px;padding:7px 12px;font:inherit;font-size:12.5px;cursor:pointer;color:var(--vpr-fg-2)}
.vpr-search button:hover{background:var(--vpr-muted)}
.vpr-lib-body{padding:8px 18px 18px}
.vpr-li{padding:12px 0;border-bottom:1px solid var(--vpr-border-soft)}
.vpr-li:last-child{border-bottom:0}
.vpr-li-title{font-size:13px;font-weight:600;color:var(--vpr-fg);line-height:1.5}
.vpr-li-meta{font-size:11.5px;color:var(--vpr-muted-fg);margin-top:4px;line-height:1.6}
.vpr-li-text{font-size:12.5px;color:var(--vpr-fg-2);line-height:1.75;margin-top:6px;white-space:pre-wrap;word-break:break-word}
.vpr-li-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.vpr-li-tag{font-size:10.5px;color:var(--vpr-muted-fg);background:var(--vpr-muted);border-radius:999px;padding:1px 8px;line-height:1.6}
.vpr-lib-sum{background:var(--vpr-surface-2);border:1px solid var(--vpr-border);border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:12.5px;color:var(--vpr-fg-2);line-height:1.65}
.vpr-lib-src{font-size:11.5px;color:var(--vpr-faint);margin-top:6px}
.vpr-lib-src a{color:var(--vpr-muted-fg);text-decoration:none;border-bottom:1px solid var(--vpr-border-strong)}
.vpr-lib-empty{padding:40px 0;text-align:center;color:var(--vpr-faint);font-size:12.5px}
.vpr-hist{border:1px solid var(--vpr-border);border-radius:10px;padding:10px 12px;margin-bottom:9px;background:var(--vpr-surface)}
.vpr-hist-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.vpr-hist-time{font-size:11px;color:var(--vpr-muted-fg);font-variant-numeric:tabular-nums;flex:none}
.vpr-hist-name{font-size:13px;font-weight:600;color:var(--vpr-fg);flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vpr-hist-actions{display:flex;gap:6px;flex:none;margin-left:auto}
.vpr-hist-body{font-size:12px;color:var(--vpr-fg-2);line-height:1.65;margin-top:7px;word-break:break-word}
.vpr-hist-body b{color:var(--vpr-fg);font-weight:600}
.vpr-btn-sm{padding:4px 10px;font-size:12px;border-radius:7px}
`

    /* ---------------------------------------------------------------- */
    /* helpers                                                          */
    /* ---------------------------------------------------------------- */

    function apiUrl(path) {
      try { return new URL(String(path).replace(/^\/+/, ''), new URL('./', document.baseURI)).href } catch (e) { return path }
    }
    function readLS(key, def) { try { if (typeof localStorage === 'undefined') return def; const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch (e) { return def } }
    function writeLS(key, val) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(val)) } catch (e) {} }
    function removeLS(key) { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key) } catch (e) {} }
    const LEVEL_CLASS = { red: 'vpr-tag-red', amber: 'vpr-tag-amber', green: 'vpr-tag-green' }
    const MODE_NAMES = { exact_name: '名称精确命中', exact_company: '公司关联', partial_candidate: '部分匹配候选', disguised_candidate: '疑似伪装命中' }
    const GROUP_ORDER = ['小红书规则百科', '平台规则', '版权名单', '违禁/极限词']

    function ShardIcon({ size = 18 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M12 3 20 6v6c0 5-3.3 8.9-8 10.5C7.3 20.9 4 17 4 12V6l8-3Z' }),
        h('circle', { cx: 11, cy: 11, r: 3.2 }),
        h('path', { d: 'm13.6 13.6 3 3' }))
    }
    function PanelIcon(props) { return ShardIcon({ size: props && props.size ? props.size : 18 }) }
    function Field(props) {
      return h('div', { className: 'vpr-field' },
        h('label', { className: 'vpr-label' }, props.label),
        props.children,
        props.hint ? h('div', { className: 'vpr-hint' }, props.hint) : null)
    }
    function levelTag(level, t) {
      return h('span', { className: 'vpr-tag ' + (LEVEL_CLASS[level] || 'vpr-tag-amber') }, level === 'red' ? t('levelRed') : level === 'amber' ? t('levelAmber') : t('levelGreen'))
    }
    function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB' }
    const LEVEL_CN = { red: '红灯', amber: '黄灯', green: '绿灯' }
    function fmtTime(iso) { try { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) } catch (e) { return '' } }
    function fileMetaText(f) {
      const notes = (f.notes || []).join('；')
      const hasChars = /字/.test(notes)
      let out = notes
      if (f.chars && !hasChars) out += (out ? ' · ' : '') + '文本 ' + f.chars + ' 字'
      if (f.images) out += (out ? ' · ' : '') + '图片 ' + f.images + ' 张'
      return out || '—'
    }

    /* ---------------------------------------------------------------- */
    /* Workbench                                                        */
    /* ---------------------------------------------------------------- */

    function Workbench(props) {
      const localeSvc = props && props.locale
      const [lang, setLang] = useState('zh')
      const t = useCallback((key, vars) => {
        const d = DICT[lang] || DICT.zh
        let s = d[key] != null ? d[key] : (DICT.zh[key] != null ? DICT.zh[key] : key)
        if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]))
        return s
      }, [lang])

      const savedForm = readLS('vpr-form-v1', null)
      const savedResult = readLS('vpr-result-v1', null)
      const [sel, setSel] = useState('check')
      const [meta, setMeta] = useState(null)
      const [form, setForm] = useState(savedForm && savedForm.form ? savedForm.form : { productName: '', title: '', content: '' })
      const [images, setImages] = useState([])
      const [files, setFiles] = useState([])
      const [status, setStatus] = useState(savedResult ? 'done' : 'idle')
      const [error, setError] = useState('')
      const [result, setResult] = useState(savedResult || null)
      const [history, setHistory] = useState(() => { const h = readLS('vpr-history-v1', []); return Array.isArray(h) ? h : [] })
      const [showAdv, setShowAdv] = useState(false)
      const [provider, setProvider] = useState(savedForm && savedForm.provider ? savedForm.provider : '')
      const [model, setModel] = useState(savedForm && savedForm.model ? savedForm.model : '')
      const [modelOpts, setModelOpts] = useState(null)
      const [loadingModels, setLoadingModels] = useState(false)
      const [updateInfo, setUpdateInfo] = useState(null)
      const [updateBusy, setUpdateBusy] = useState('')
      const [updateMsg, setUpdateMsg] = useState('')
      const [themePref, setThemePref] = useState(() => { try { return (typeof localStorage !== 'undefined' && localStorage.getItem('vpr-theme')) || 'auto' } catch (e) { return 'auto' } })
      const [sysDark, setSysDark] = useState(false)
      const isDark = themePref === 'dark' || (themePref === 'auto' && sysDark)
      const applyTheme = (p) => { setThemePref(p); try { if (typeof localStorage !== 'undefined') localStorage.setItem('vpr-theme', p) } catch (e) {} }
      const fileRef = useRef(null)
      const fileElRef = useRef(null)

      // library state
      const [libCats, setLibCats] = useState([])
      const [libSel, setLibSel] = useState('')
      const [libItems, setLibItems] = useState([])
      const [libTotal, setLibTotal] = useState(0)
      const [libQ, setLibQ] = useState('')
      const [libLoading, setLibLoading] = useState(false)
      const [libOffset, setLibOffset] = useState(0)

      useEffect(() => {
        let alive = true
        fetch(apiUrl('virtual-product-risk/api/meta'), { headers: { accept: 'application/json' } })
          .then((r) => r.json()).then((j) => { if (alive && j && j.ok) setMeta(j.stats) }).catch(() => {})
        setLoadingModels(true)
        fetch(apiUrl('virtual-product-risk/api/models'), { headers: { accept: 'application/json' } })
          .then((r) => r.json()).then((j) => { if (alive && j && j.ok) setModelOpts(j) }).catch(() => {}).finally(() => { if (alive) setLoadingModels(false) })
        return () => { alive = false }
      }, [])

      useEffect(() => {
        if (!localeSvc || typeof localeSvc.getLocale !== 'function') return undefined
        const read = () => { try { const s = localeSvc.getLocale(); const id = String((s && (s.locale || s.id || s.language)) || ''); if (id) setLang(id.toLowerCase().startsWith('zh') ? 'zh' : 'en') } catch (e) {} }
        read()
        if (typeof localeSvc.subscribe === 'function') { const off = localeSvc.subscribe(read); return () => { try { off && off() } catch (e) {} } }
        return undefined
      }, [localeSvc])

      useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
        let mq
        try { mq = window.matchMedia('(prefers-color-scheme: dark)') } catch (e) { return undefined }
        const on = () => setSysDark(!!(mq && mq.matches))
        on()
        if (mq.addEventListener) mq.addEventListener('change', on)
        else if (mq.addListener) mq.addListener(on)
        return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else if (mq.removeListener) mq.removeListener(on) }
      }, [])

      useEffect(() => { const t0 = setTimeout(() => { checkUpdate(false) }, 1500); const iv = setInterval(() => { checkUpdate(false) }, 3 * 60 * 60 * 1000); return () => { clearTimeout(t0); clearInterval(iv) } }, [])
      useEffect(() => { writeLS('vpr-form-v1', { form, provider, model }) }, [form, provider, model])
      useEffect(() => { if (result) writeLS('vpr-result-v1', result); else removeLS('vpr-result-v1') }, [result])

      const loadCats = useCallback(async () => {
        try {
          const r = await fetch(apiUrl('virtual-product-risk/api/library'), { headers: { accept: 'application/json' } })
          const j = await r.json()
          if (j && j.ok) setLibCats(j.categories || [])
        } catch (e) { /* ignore */ }
      }, [])

      const openCat = async (cat, q) => {
        setSel(cat); setLibSel(cat); setLibQ(q || ''); setLibLoading(true)
        try {
          const r = await fetch(apiUrl('virtual-product-risk/api/library?cat=' + encodeURIComponent(cat) + '&q=' + encodeURIComponent(q || '') + '&offset=0&limit=100'), { headers: { accept: 'application/json' } })
          const j = await r.json()
          if (j && j.ok) { setLibItems(j.items || []); setLibTotal(j.total || 0); setLibOffset((j.items || []).length) }
        } catch (e) { setLibItems([]); setLibTotal(0) }
        setLibLoading(false)
      }
      const loadMore = async () => {
        if (!libSel) return
        const r = await fetch(apiUrl('virtual-product-risk/api/library?cat=' + encodeURIComponent(libSel) + '&q=' + encodeURIComponent(libQ) + '&offset=' + libOffset + '&limit=100'), { headers: { accept: 'application/json' } })
        const j = await r.json()
        if (j && j.ok) { setLibItems((prev) => prev.concat(j.items || [])); setLibOffset(libOffset + (j.items || []).length) }
      }

      useEffect(() => { loadCats() }, [loadCats])

      const onPick = () => { if (fileRef.current) fileRef.current.click() }
      const onFiles = (ev) => {
        const list = ev && ev.target && ev.target.files ? Array.from(ev.target.files) : []
        list.slice(0, 6).forEach((file) => {
          if (!/^image\//.test(file.type)) return
          const reader = new FileReader()
          reader.onload = () => {
            const du = String(reader.result || ''); const c = du.indexOf(','); const b64 = c >= 0 ? du.slice(c + 1) : ''
            if (!b64) return
            setImages((prev) => prev.length >= 6 ? prev : prev.concat([{ id: Math.random().toString(36).slice(2), name: file.name, mediaType: file.type, data: b64, url: du }]))
          }
          reader.readAsDataURL(file)
        })
        if (ev.target) ev.target.value = ''
      }
      const removeImage = (id) => setImages((prev) => prev.filter((i) => i.id !== id))

      const onFilePick = () => { if (fileElRef.current) fileElRef.current.click() }
      const onDeliveryFiles = (ev) => {
        const list = ev && ev.target && ev.target.files ? Array.from(ev.target.files) : []
        list.slice(0, 8).forEach((file) => {
          const reader = new FileReader()
          reader.onload = () => {
            const du = String(reader.result || ''); const c = du.indexOf(','); const b64 = c >= 0 ? du.slice(c + 1) : ''
            if (!b64) return
            setFiles((prev) => prev.length >= 8 ? prev : prev.concat([{ id: Math.random().toString(36).slice(2), name: file.name, mediaType: file.type || '', size: file.size, data: b64 }]))
          }
          reader.readAsDataURL(file)
        })
        if (ev.target) ev.target.value = ''
      }
      const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id))

      const clearAll = () => { setForm({ productName: '', title: '', content: '' }); setImages([]); setFiles([]); setResult(null); setError(''); setStatus('idle'); removeLS('vpr-result-v1') }

      const saveHistory = (entry) => setHistory((prev) => { const next = [entry, ...prev].slice(0, 30); writeLS('vpr-history-v1', next); return next })
      const histRestore = (e) => { const ef = e.form || {}; setForm({ productName: ef.productName || '', title: ef.title || '', content: ef.content || '' }); setProvider(e.provider || ''); setModel(e.model || ''); setSel('check'); setResult(null); setStatus('idle'); setError(''); removeLS('vpr-result-v1') }
      const histView = (e) => { const ef = e.form || {}; setForm({ productName: ef.productName || '', title: ef.title || '', content: ef.content || '' }); setProvider(e.provider || ''); setModel(e.model || ''); setResult(e.result || null); setStatus('done'); setError(''); setSel('check') }
      const histDelete = (id) => setHistory((prev) => { const next = prev.filter((x) => x.id !== id); writeLS('vpr-history-v1', next); return next })
      const histClear = () => { setHistory([]); writeLS('vpr-history-v1', []) }

      const checkUpdate = async (manual) => {
        if (updateBusy === 'updating') return null
        setUpdateBusy('checking')
        try {
          const r = await fetch(apiUrl('virtual-product-risk/api/update-check'), { headers: { accept: 'application/json' } })
          const j = await r.json().catch(() => null)
          if (j && j.ok) {
            setUpdateInfo(j)
            if (manual) setUpdateMsg(j.hasUpdate ? '' : (t('updateUpToDate') + (j.current ? '（' + j.current + '）' : '')))
            return j
          }
          if (manual) setUpdateMsg(t('updateFailed'))
        } catch (e) {
          if (manual) setUpdateMsg(t('updateFailed'))
        } finally { setUpdateBusy('') }
        return null
      }

      const pollUpdateStatus = async (attempts) => {
        for (let i = 0; i < attempts; i++) {
          await new Promise((res) => setTimeout(res, 2500))
          let j = null
          try { const r = await fetch(apiUrl('virtual-product-risk/api/update-status'), { headers: { accept: 'application/json' } }); j = await r.json() } catch (e) { return true }
          const st = j && j.ok ? j.status : null
          if (!st) return true
          if (st.state === 'running' || st.ok === null || st.ok === undefined) continue
          return st.ok === true
        }
        return true
      }

      const applyUpdate = async (channel) => {
        setUpdateBusy('updating')
        setUpdateMsg((channel === 'cn' ? '国内线路' : '海外线路') + '更新中…')
        try {
          const r = await fetch(apiUrl('virtual-product-risk/api/update'), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ channel }) })
          const j = await r.json().catch(() => null)
          if (!r.ok || !j || !j.ok) throw new Error((j && j.error && j.error.message) || 'update failed')
          if (j.upToDate) { setUpdateMsg(t('updateUpToDate')); setUpdateBusy(''); return }
          setUpdateMsg('已开始更新，完成后请刷新页面…')
          const ok = await pollUpdateStatus(24)
          if (!ok && channel === 'cn') { setUpdateMsg('国内线路失败，改用海外线路…'); return applyUpdate('official') }
          if (!ok) setUpdateMsg('更新失败，请稍后重试或手动更新')
        } catch (e) {
          if (channel === 'cn') { setUpdateMsg('国内线路失败，改用海外线路…'); return applyUpdate('official') }
          setUpdateMsg('更新失败：' + (e && e.message ? e.message : String(e)))
        } finally { setUpdateBusy('') }
      }

      const onUpdateClick = async () => {
        if (updateBusy) return
        setUpdateMsg('')
        const j = await checkUpdate(true)
        if (j && j.hasUpdate) applyUpdate(j.channel || 'cn')
      }

      const run = async () => {
        if (status === 'running') return
        if (!form.productName.trim() && !form.title.trim() && !form.content.trim() && images.length === 0 && files.length === 0) { setError(t('errRequired')); setStatus('error'); return }
        setStatus('running'); setError(''); setResult(null)
        try {
          const body = {
            productName: form.productName, title: form.title, content: form.content,
            images: images.map((i) => ({ name: i.name, mediaType: i.mediaType, data: i.data })),
            files: files.map((f) => ({ name: f.name, mediaType: f.mediaType, data: f.data })),
            provider: provider.trim(), model: model.trim(),
          }
          const resp = await fetch(apiUrl('virtual-product-risk/api/analyze'), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) })
          const json = await resp.json().catch(() => null)
          if (!resp.ok || !json || !json.ok) throw new Error((json && json.error && json.error.message) || t('errNetwork'))
          const res = json.result
          setResult(res); setStatus('done')
          try { const copy = JSON.parse(JSON.stringify(res)); if (copy.local) delete copy.local.rulesText; saveHistory({ id: 'h' + Date.now() + Math.random().toString(36).slice(2, 6), time: new Date().toISOString(), form: { productName: form.productName, title: form.title, content: form.content }, provider: provider.trim(), model: model.trim(), result: copy }) } catch (e) {}
        } catch (e) { setError(String(e && e.message ? e.message : t('errNetwork'))); setStatus('error') }
      }

      const renderHeader = () => h('div', { className: 'vpr-head' },
        h('div', { className: 'vpr-head-mark' }, ShardIcon({ size: 24 })),
        h('div', { className: 'vpr-head-main' },
          h('h1', { className: 'vpr-h1' }, t('title')),
          h('p', { className: 'vpr-sub' }, t('subtitle')),
          meta ? h('div', { className: 'vpr-chips' },
            h('span', { className: 'vpr-chip' }, t('metaUpdated') + ' ', h('b', null, meta.updatedAt || '-')),
            h('span', { className: 'vpr-chip' }, t('metaNames') + ' ', h('b', null, meta.names)),
            h('span', { className: 'vpr-chip' }, t('metaBanned') + ' ', h('b', null, meta.banned)),
            h('span', { className: 'vpr-chip' }, t('metaRules') + ' ', h('b', null, meta.platformRules || 0)),
            h('span', { className: 'vpr-chip' }, t('metaXhsRules') + ' ', h('b', null, meta.xhsRules || 0))) : null),
        h('div', { className: 'vpr-head-right' },
          updateMsg ? h('span', { className: 'vpr-update-msg' }, updateMsg) : null,
          h('button', { className: 'vpr-update' + (updateInfo && updateInfo.hasUpdate ? ' vpr-update-has' : '') + (updateBusy ? ' vpr-update-busy' : ''), title: (updateInfo && updateInfo.latest ? ('最新版本 ' + updateInfo.latest) : ''), onClick: onUpdateClick },
            updateBusy === 'updating' ? t('updateUpdating') : updateBusy === 'checking' ? t('updateChecking') : (updateInfo && updateInfo.hasUpdate ? t('updateAvailable') : t('updateCheck'))),
          h('div', { className: 'vpr-theme' },
            [['light', t('themeLight')], ['dark', t('themeDark')], ['auto', t('themeAuto')]].map(([p, label]) =>
              h('button', { key: p, className: themePref === p ? 'vpr-theme-on' : '', title: label, onClick: () => applyTheme(p) }, label)))))

      const renderModelField = () => {
        const provs = (modelOpts && modelOpts.providers) || []
        const cur = provs.find((p) => p.id === provider)
        if (!provider) {
          return h('select', { className: 'vpr-input', disabled: true }, h('option', null, t('modelFollowHost')))
        }
        if (!cur || !cur.models || cur.models.length === 0) {
          return h('input', { className: 'vpr-input', value: model, placeholder: 'model id', onChange: (e) => setModel(e.target.value) })
        }
        const list = cur.models.slice()
        if (model && !list.some((m) => m.id === model)) list.unshift({ id: model, name: model })
        return h('select', { className: 'vpr-input', value: model, onChange: (e) => setModel(e.target.value) },
          h('option', { value: '' }, t('modelPick')),
          list.map((m) => h('option', { key: m.id, value: m.id }, m.name)))
      }

      const renderForm = () => h('div', { className: 'vpr-card' },
        h('div', { className: 'vpr-card-h' }, t('formTitle')),
        h('div', { className: 'vpr-card-b' },
          error ? h('div', { className: 'vpr-err' }, error) : null,
          h(Field, { label: t('name') }, h('input', { className: 'vpr-input', value: form.productName, placeholder: t('namePh'), onChange: (e) => setForm({ ...form, productName: e.target.value }) })),
          h(Field, { label: t('titleField') }, h('input', { className: 'vpr-input', value: form.title, placeholder: t('titlePh'), onChange: (e) => setForm({ ...form, title: e.target.value }) })),
          h(Field, { label: t('content') }, h('textarea', { className: 'vpr-textarea', rows: 5, value: form.content, placeholder: t('contentPh'), onChange: (e) => setForm({ ...form, content: e.target.value }) })),
          h(Field, { label: t('images'), hint: t('imagesHint') },
            h('div', { className: 'vpr-drop', onClick: onPick }, '+ ' + t('addImage')),
            h('input', { ref: fileRef, type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, style: { display: 'none' }, onChange: onFiles }),
            images.length ? h('div', { className: 'vpr-thumbs' }, images.map((img) => h('div', { className: 'vpr-thumb', key: img.id },
              h('img', { src: img.url, alt: img.name }),
              h('button', { className: 'vpr-thumb-x', onClick: () => removeImage(img.id), title: 'remove' }, '×')))) : null),
          h(Field, { label: t('files'), hint: t('filesHint') },
            h('div', { className: 'vpr-drop', onClick: onFilePick }, '+ ' + t('addFile')),
            h('input', { ref: fileElRef, type: 'file', accept: '.zip,.pptx,.pptm,.ppt,.docx,.docm,.doc,.xlsx,.xlsm,.pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.markdown,.csv,.json', multiple: true, style: { display: 'none' }, onChange: onDeliveryFiles }),
            files.length ? h('div', { className: 'vpr-files' }, files.map((f) => h('div', { className: 'vpr-filechip', key: f.id },
              h('span', { className: 'vpr-fname' }, f.name),
              h('span', { className: 'vpr-fmeta' }, kb(f.size)),
              h('button', { onClick: () => removeFile(f.id), title: 'remove' }, '×')))) : null),
          h('button', { className: 'vpr-adv-toggle', onClick: () => setShowAdv(!showAdv) }, (showAdv ? '▾ ' : '▸ ') + t('advanced')),
          showAdv ? h('div', { className: 'vpr-row', style: { marginBottom: '12px' } },
            h(Field, { label: t('provider') },
              h('select', { className: 'vpr-input', value: provider, onChange: (e) => { const p = e.target.value; setProvider(p); const prov = ((modelOpts && modelOpts.providers) || []).find((x) => x.id === p); setModel(p && prov && prov.models && prov.models[0] ? prov.models[0].id : '') } },
                h('option', { value: '' }, t('modelFollowHost') + ((modelOpts && modelOpts.default && modelOpts.default.provider) ? '（' + modelOpts.default.provider + ' / ' + (modelOpts.default.model || '') + '）' : '')),
                ((modelOpts && modelOpts.providers) || []).map((p) => h('option', { key: p.id, value: p.id }, p.name + ' (' + p.id + ')')))),
            h(Field, { label: t('model') }, renderModelField())) : null,
          h('div', { className: 'vpr-actions' },
            h('button', { className: 'vpr-btn vpr-btn-primary', onClick: run, disabled: status === 'running' },
              status === 'running' ? h('span', null, h('span', { className: 'vpr-spin' }), t('running')) : t('run')),
            h('button', { className: 'vpr-btn vpr-btn-ghost', onClick: clearAll, disabled: status === 'running' }, t('clear')))))

      const renderCheck = () => h('div', { className: 'vpr-grid' },
        renderForm(),
        h('div', { className: 'vpr-card' },
          h('div', { className: 'vpr-card-h' },
            t('localSection') + ' / ' + t('llmSection'),
            h('div', { className: 'vpr-tipwrap' },
              h('span', { className: 'vpr-pill' }, '打分说明'),
              h('div', { className: 'vpr-tip' },
                h('div', { className: 'vpr-tip-h' }, '风险打分说明'),
                h('div', { className: 'vpr-tip-row' }, h('b', null, '本地等级：'), '版权精确命中 / 售假高频词 → 红；版权候选 / 极限词 → 黄；无命中 → 绿（按最严重一条定级）。'),
                h('div', { className: 'vpr-tip-row' }, h('b', null, '处置卡分数：'), '基础分（精确 55 / 伪装 35 / 部分 30 / 未命中 10）+ 风险标签权重（最高 +45～+15），有作品登记号再 +20；≥65 红、35–64 黄、<35 绿。'),
                h('div', { className: 'vpr-tip-row' }, h('b', null, 'DeepSeek 复核：'), '模型给出 0–100 分与红 / 黄 / 绿等级。'),
                h('div', { className: 'vpr-tip-row' }, h('b', null, '综合等级：'), '取本地与模型中更严重的一档；左上大分数优先显示模型分。'),
                h('div', { className: 'vpr-tip-note' }, '分数是规则 / 模型的风险判断分，不是概率，也不等于法律结论。')))),
          h('div', { className: 'vpr-card-b' },
            !result ? h('div', { className: 'vpr-empty' },
              h('div', { className: 'vpr-empty-mark' }, ShardIcon({ size: 28 })),
              h('p', { className: 'vpr-empty-t' }, t('emptyTitle')),
              h('p', { className: 'vpr-empty-d' }, t('emptyDesc'))) : null,
            result ? renderResult(result, t) : null,
            h('p', { className: 'vpr-note' }, t('disclaimer')))))

      const renderSidebar = () => {
        const safeCats = Array.isArray(libCats) ? libCats : []
        const groups = {}
        for (const c of safeCats) { (groups[c.group] = groups[c.group] || []).push(c) }
        return h('aside', { className: 'vpr-side' },
          h('button', { className: 'vpr-side-check' + (sel === 'check' ? ' vpr-side-check-on' : ''), onClick: () => setSel('check') },
            h('span', { className: 'vpr-side-ico' }, ShardIcon({ size: 16 })),
            h('span', { className: 'vpr-side-t' }, '小红书违规检测')),
          h('button', { className: 'vpr-lib-item' + (sel === 'history' ? ' vpr-lib-item-on' : ''), style: { marginTop: '6px' }, onClick: () => setSel('history') },
            h('span', { className: 'vpr-lib-n' }, '检测历史'),
            h('span', { className: 'vpr-lib-c' }, history.length)),
          h('div', { className: 'vpr-side-sep' }),
          GROUP_ORDER.filter((g) => groups[g]).map((g) => h('div', { key: g },
            h('div', { className: 'vpr-lib-gt' }, g),
            groups[g].map((c) => h('button', { key: c.id, className: 'vpr-lib-item' + (c.id === sel ? ' vpr-lib-item-on' : ''), onClick: () => openCat(c.id, '') },
              h('span', { className: 'vpr-lib-n', title: c.name }, c.name),
              h('span', { className: 'vpr-lib-c' }, c.count))))))
      }

      const renderLibMain = () => {
        const safeCats = Array.isArray(libCats) ? libCats : []
        const safeItems = Array.isArray(libItems) ? libItems : []
        const selCat = safeCats.find((c) => c.id === sel)
        return h('div', { className: 'vpr-lib-main' },
          h('div', { className: 'vpr-lib-head' },
            h('div', { className: 'vpr-lib-title' }, selCat ? selCat.name : t('libTitle')),
            h('div', { className: 'vpr-search' },
              h('input', { value: libQ, placeholder: t('libSearch'), onChange: (e) => setLibQ(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && selCat) openCat(selCat.id, libQ) } }),
              h('button', { onClick: () => { if (selCat) openCat(selCat.id, libQ) } }, t('libSearchBtn')))),
          h('div', { className: 'vpr-lib-body' },
            selCat && selCat.summary ? h('div', { className: 'vpr-lib-sum' }, h('div', null, selCat.summary), selCat.platform ? h('div', { className: 'vpr-lib-src' }, t('platform') + '：' + selCat.platform + ' · ' + t('libCount', { n: selCat.count })) : null) : null,
            libLoading ? h('div', { className: 'vpr-lib-empty' }, t('libLoading'))
              : safeItems.length === 0 ? h('div', { className: 'vpr-lib-empty' }, t('libEmpty'))
                : h('div', null,
                  h('div', { className: 'vpr-muted', style: { fontSize: '11.5px', margin: '8px 0' } }, t('libCount', { n: libTotal })),
                  safeItems.map((it, i) => renderLibItem(it, selCat, i)),
                  safeItems.length < libTotal ? h('div', { style: { textAlign: 'center', marginTop: '12px' } }, h('button', { className: 'vpr-btn vpr-btn-ghost', onClick: loadMore }, t('libMore'))) : null)))
      }

      const renderHistory = () => {
        const list = Array.isArray(history) ? history : []
        return h('div', { className: 'vpr-lib-main' },
          h('div', { className: 'vpr-lib-head' },
            h('div', { className: 'vpr-lib-title' }, '检测历史（' + list.length + '）'),
            list.length ? h('button', { className: 'vpr-btn vpr-btn-ghost vpr-btn-sm', onClick: histClear }, '清空历史') : null),
          h('div', { className: 'vpr-lib-body' },
            list.length === 0 ? h('div', { className: 'vpr-lib-empty' }, '还没有检测历史，去「小红书违规检测」跑一次吧。')
              : list.map((e, i) => { const ef = e.form || {}; const loc = e.result && e.result.local && e.result.local.local; return h('div', { className: 'vpr-hist', key: e.id || i },
                h('div', { className: 'vpr-hist-top' },
                  h('span', { className: 'vpr-hist-time' }, fmtTime(e.time)),
                  levelTag((e.result && e.result.overall && e.result.overall.level) || 'amber', t),
                  h('span', { className: 'vpr-hist-name', title: ef.productName || ef.title || '' }, ef.productName || ef.title || '(未命名检测)'),
                  h('span', { className: 'vpr-hist-actions' },
                    h('button', { className: 'vpr-btn vpr-btn-ghost vpr-btn-sm', onClick: () => histRestore(e) }, '回填输入'),
                    h('button', { className: 'vpr-btn vpr-btn-primary vpr-btn-sm', onClick: () => histView(e) }, '查看报告'),
                    h('button', { className: 'vpr-btn vpr-btn-ghost vpr-btn-sm', onClick: () => histDelete(e.id) }, '删除'))),
                h('div', { className: 'vpr-hist-body' },
                  ef.title ? h('div', null, h('b', null, '标题：'), ef.title) : null,
                  ef.content ? h('div', null, h('b', null, '正文：'), ef.content.slice(0, 120) + (ef.content.length > 120 ? '…' : '')) : null,
                  (e.result && e.result.files && e.result.files.length) ? h('div', null, h('b', null, '交付文件：'), e.result.files.length + ' 个（仅保存解析信息）') : null,
                  loc ? h('div', { className: 'vpr-muted' }, '命中：版权 ' + loc.counts.copyright + ' · 违禁/极限词 ' + loc.counts.banned) : null)
              ) })))
      }

      return h('div', { className: 'vpr-root' + (isDark ? ' vpr-dark' : '') },
        renderHeader(),
        h('div', { className: 'vpr-app' },
          renderSidebar(),
          h('div', { className: 'vpr-main' }, sel === 'check' ? renderCheck() : sel === 'history' ? renderHistory() : renderLibMain())))
    }

    /* ---------------------------------------------------------------- */
    /* result rendering                                                 */
    /* ---------------------------------------------------------------- */

    function hitVerdict(hit) {
      if (hit.kind === 'copyright') return MODE_NAMES[hit.match_type] || '版权命中'
      if (hit.kind === 'slang') {
        const live = hit.liveness === 'killed' ? '拦截词' : hit.liveness === 'watching' ? '抽检' : hit.liveness === 'active' ? '可搜' : '暗语'
        const risk = hit.risk === 'danger' ? '高危' : hit.risk === 'warning' ? '警告' : ''
        return live + (risk ? '（' + risk + '）' : '')
      }
      return hit.group_name || '违禁词'
    }

    function renderResult(result, t) {
      const local = result.local
      const llm = result.llm
      const card = local.local.handling
      const scoreLvl = result.overall.level
      const scoreNum = llm && llm.available && typeof llm.score === 'number' ? llm.score : card.score
      const blocks = []

      blocks.push(h('div', { className: 'vpr-score vpr-score-' + scoreLvl, key: 'score' },
        h('div', { className: 'vpr-score-badge' }, h('div', { className: 'vpr-score-num' }, scoreNum), h('div', { className: 'vpr-score-lvl' }, result.overall.levelName)),
        h('div', { className: 'vpr-score-main' },
          h('div', { className: 'vpr-score-t' },
            (result.overall.level === 'red' ? t('levelRed') : result.overall.level === 'amber' ? t('levelAmber') : t('levelGreen')) + ' · ' + t('score') + ' ' + scoreNum,
            '  ', h('span', { className: 'vpr-muted', style: { fontSize: '12px', fontWeight: 400 } }, t('counts', { c: local.local.counts.copyright, s: local.local.counts.slang, b: local.local.counts.banned }))),
          local.local.reasons.length ? h('div', { className: 'vpr-score-s' }, t('reasons') + '：' + local.local.reasons.join('、')) : null)))

      // delivery files
      if (result.files && result.files.length) {
        blocks.push(h('div', { className: 'vpr-sec', key: 'files' },
          h('div', { className: 'vpr-sec-h' }, h('span', { className: 'vpr-dot' }), t('filesSection')),
          h('div', null, result.files.map((f, i) => h('div', { className: 'vpr-card-box', key: i, style: { padding: '10px 12px', marginBottom: '8px' } },
            h('div', { style: { fontSize: '12.5px', fontWeight: 600 } }, f.name, ' ', h('span', { className: 'vpr-muted', style: { fontWeight: 400 } }, '(' + f.kind + ', ' + kb(f.size) + ')')),
            h('div', { className: 'vpr-muted', style: { fontSize: '11.5px', marginTop: '3px' } }, fileMetaText(f)),
            (f.listing && f.listing.length) ? h('div', { className: 'vpr-muted', style: { fontSize: '11px', marginTop: '3px' } }, '包含：' + f.listing.slice(0, 12).join('、') + (f.listing.length > 12 ? ' …' : '')) : null)))))
      }

      // local hits
      blocks.push(h('div', { className: 'vpr-sec', key: 'hits' },
        h('div', { className: 'vpr-sec-h' }, h('span', { className: 'vpr-dot' }), t('hits')),
        local.local.hits.length === 0 ? h('div', { className: 'vpr-muted', style: { fontSize: '12.5px' } }, t('noHits'))
          : h('table', { className: 'vpr-table' },
            h('thead', null, h('tr', null, h('th', null, '片段'), h('th', null, '判定'), h('th', null, t('suggestion')))),
            h('tbody', null, local.local.hits.map((hit, i) => h('tr', { key: i },
              h('td', null, h('span', { className: 'vpr-frag' + (hit.kind === 'copyright' ? '' : hit.kind === 'slang' ? ' vpr-frag-slang' : ' vpr-frag-banned') }, hit.fragment)),
              h('td', null, hitVerdict(hit)),
              h('td', { className: 'vpr-muted' }, hit.advice)))))))

      if (local.query && local.query.status !== 'no_match') {
        blocks.push(h('div', { className: 'vpr-sec', key: 'query' },
          h('div', { className: 'vpr-sec-h' }, h('span', { className: 'vpr-dot' }), t('querySection')),
          h('div', { className: 'vpr-muted', style: { fontSize: '12.5px', marginBottom: '6px' } }, local.query.guidance),
          h('ul', { className: 'vpr-list' }, local.query.matches.map((m, i) => h('li', { key: i }, h('b', null, m.name), ' · ' + (MODE_NAMES[m.match_type] || m.match_type) + (m.labels && m.labels.length ? ' · ' + m.labels.join('、') : ''))))))
      }

      blocks.push(h('div', { className: 'vpr-sec', key: 'llm' },
        h('div', { className: 'vpr-sec-h' }, h('span', { className: 'vpr-dot' }), t('llmSection'),
          h('span', { className: 'vpr-muted', style: { fontSize: '11px', fontWeight: 400 } }, llm && llm.available ? (' ' + (llm.provider || '') + ' / ' + (llm.model || '')) : '')),
        (!llm || !llm.available)
          ? h('div', { className: 'vpr-card-box' }, h('div', { className: 'vpr-muted', style: { fontSize: '12.5px' } }, t('llmUnavailable') + (llm && llm.reason ? '：' + llm.reason : '')))
          : h('div', null,
            h('div', { className: 'vpr-summary' },
              h('div', { className: 'vpr-summary-badge' }, levelTag(llm.level, t)),
              h('div', { className: 'vpr-summary-body' },
                h('div', { className: 'vpr-summary-text' }, llm.summary || ''),
                h('div', { className: 'vpr-summary-meta' }, '风险分 ' + (llm.score != null ? llm.score : '-') + (llm.provider ? ' · ' + llm.provider + (llm.model ? ' / ' + llm.model : '') : '')))),
            (llm.findings && llm.findings.length) ? h('div', null,
              h('div', { className: 'vpr-sub-h' }, t('findings') + '（' + llm.findings.length + '）'),
              llm.findings.map((f, i) => h('div', { className: 'vpr-finding', key: i },
                h('div', { className: 'vpr-finding-bar', style: { background: f.severity === 'high' ? 'var(--vpr-danger)' : f.severity === 'low' ? 'var(--vpr-green)' : 'var(--vpr-amber)' } }),
                h('div', { className: 'vpr-finding-body' },
                  h('div', { className: 'vpr-finding-top' },
                    h('span', { className: 'vpr-finding-cat' }, f.category || '其他'),
                    h('span', { className: 'vpr-tag ' + (f.severity === 'high' ? 'vpr-tag-red' : f.severity === 'low' ? 'vpr-tag-green' : 'vpr-tag-amber') }, f.severity || 'medium'),
                    f.evidence ? h('span', { className: 'vpr-finding-ev' }, f.evidence) : null),
                  (f.reason || f.suggestion) ? h('div', { className: 'vpr-finding-grid' },
                    f.reason ? h('div', { className: 'vpr-finding-k', key: 'rk' }, t('reason')) : null,
                    f.reason ? h('div', { className: 'vpr-finding-v', key: 'rv' }, f.reason) : null,
                    f.suggestion ? h('div', { className: 'vpr-finding-k', key: 'sk' }, t('suggestion')) : null,
                    f.suggestion ? h('div', { className: 'vpr-finding-v', key: 'sv' }, f.suggestion) : null) : null)))) : null,
            (llm.rewritten_title || llm.rewritten_content) ? h('div', null,
              h('div', { className: 'vpr-sub-h' }, '改写建议'),
              llm.rewritten_title ? h('div', { className: 'vpr-card-box' }, h('div', { className: 'vpr-label', style: { marginBottom: '4px' } }, t('rewriteTitle')), h('div', { style: { fontSize: '12.5px', lineHeight: 1.6 } }, llm.rewritten_title)) : null,
              llm.rewritten_content ? h('div', { className: 'vpr-card-box' }, h('div', { className: 'vpr-label', style: { marginBottom: '4px' } }, t('rewriteContent')), h('div', { style: { fontSize: '12.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, llm.rewritten_content)) : null) : null)))

      blocks.push(h('div', { className: 'vpr-sec', key: 'handling' },
        h('div', { className: 'vpr-sec-h' }, h('span', { className: 'vpr-dot' }), t('handlingSection')),
        h('div', { className: 'vpr-card-box' },
          h('div', { className: 'vpr-lvl' }, levelTag(card.level, t), ' ', card.score + ' · ' + card.levelName + ' · ' + card.title),
          h('div', { className: 'vpr-muted', style: { fontSize: '12.5px', marginTop: '4px' } }, card.headline),
          card.meaning && card.meaning.length ? h('div', null, h('div', { className: 'vpr-label', style: { marginTop: '10px' } }, t('meaning')), h('ul', { className: 'vpr-list' }, card.meaning.map((m, i) => h('li', { key: i }, m)))) : null,
          card.actions && card.actions.length ? h('div', null, h('div', { className: 'vpr-label', style: { marginTop: '10px' } }, t('actions')), h('ol', { className: 'vpr-list' }, card.actions.map((a, i) => h('li', { key: i }, a)))) : null,
          card.docs && card.docs.length ? h('div', { className: 'vpr-finding-row', style: { marginTop: '8px' } }, h('b', null, t('docs') + '：'), card.docs.join('；')) : null,
          card.alternatives && card.alternatives.length ? h('div', { className: 'vpr-finding-row' }, h('b', null, t('alternatives') + '：'), card.alternatives.join('；')) : null,
          card.platforms && Object.keys(card.platforms).length ? h('div', { style: { marginTop: '8px' } }, h('div', { className: 'vpr-label' }, t('platforms')), h('ul', { className: 'vpr-list' }, Object.keys(card.platforms).map((k) => h('li', { key: k }, k + '：' + card.platforms[k])))) : null,
          card.checklist && card.checklist.length ? h('div', { className: 'vpr-finding-row', style: { marginTop: '8px' } }, h('b', null, t('checklist') + '：'), card.checklist.join(' ｜ ')) : null,
          card.notice ? h('div', { className: 'vpr-finding-row', style: { marginTop: '8px', color: '#71717a' } }, h('b', null, t('notice') + '：'), card.notice) : null)))

      return h('div', null, blocks)
    }

    function renderLibItem(it, selCat, i) {
      const kind = selCat ? selCat.kind : ''
      if (kind === 'copyright') {
        return h('div', { className: 'vpr-li', key: i },
          h('div', { className: 'vpr-li-title' }, it.name),
          h('div', { className: 'vpr-li-meta' }, (it.objectType ? it.objectType : '') + (it.companies && it.companies.length ? ' · ' + it.companies.join('、') : '') + (it.registrations && it.registrations.length ? ' · 登记号 ' + it.registrations[0] : '')),
          (it.labels && it.labels.length) ? h('div', { className: 'vpr-li-tags' }, it.labels.map((l, j) => h('span', { className: 'vpr-li-tag', key: j }, l))) : null)
      }
      if (kind === 'banned') {
        return h('div', { className: 'vpr-li', key: i },
          h('div', { className: 'vpr-li-title' }, it.term),
          h('div', { className: 'vpr-li-meta' }, (it.groupName || '') + (it.advice ? ' · ' + it.advice : '')))
      }
      if (kind === 'slang') {
        return h('div', { className: 'vpr-li', key: i },
          h('div', { className: 'vpr-li-title' }, it.name),
          h('div', { className: 'vpr-li-meta' }, [(it.liveness ? '状态:' + it.liveness : ''), (it.risk ? '风险:' + it.risk : '')].filter(Boolean).join(' · ')),
          (it.variants && it.variants.length) ? h('div', { className: 'vpr-li-tags' }, it.variants.map((v, j) => h('span', { className: 'vpr-li-tag', key: j }, v))) : null,
          it.explanation ? h('div', { className: 'vpr-li-meta' }, it.explanation) : null)
      }
      if (kind === 'xhsrule') {
        return h('div', { className: 'vpr-li', key: i },
          h('div', { className: 'vpr-li-title' }, it.name),
          it.text ? h('div', { className: 'vpr-li-text' }, it.text) : null)
      }
      // platform
      return h('div', { className: 'vpr-li', key: i },
        h('div', { className: 'vpr-li-title' }, it.text),
        (it.advice || it.level) ? h('div', { className: 'vpr-li-meta' }, (it.level ? '分级：' + (LEVEL_CN[it.level] || it.level) : '') + (it.advice ? ' · ' + it.advice : '')) : null)
    }

    /* ---------------------------------------------------------------- */
    /* plugin                                                           */
    /* ---------------------------------------------------------------- */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const el = document.createElement('style')
          el.dataset.plugin = 'dsh-virtual-product-risk'
          el.dataset.pluginCss = 'dsh-virtual-product-risk/workbench.css'
          el.textContent = CSS
          document.head.appendChild(el)
          return () => { try { el.remove() } catch (e) {} }
        }, 'dsh-virtual-product-risk: styles')

        const locale = ctx.get ? ctx.get('locale') : undefined
        const localeSvc = locale || null
        try {
          if (locale && typeof locale.register === 'function') {
            ctx.effect(() => locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'dsh-virtual-product-risk: dictionaries')
          }
        } catch (e) { /* ignore */ }

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, order: 40, label: () => '小红书违规检测' }, PanelIcon))
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_KEY }, (props) => h(Workbench, { ...props, locale: localeSvc })))
      },
    }
  },
})
