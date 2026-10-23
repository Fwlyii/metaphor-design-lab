(() => {
  'use strict';
  const data = window.REPORT_DATA;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const field = {population:'人口',birth_rate:'出生率',year:'年份',solar_output:'太阳能产出'};
  const channel = {area:'面积',size:'大小',lightness:'明度',width:'宽度',position:'位置','horizontal position':'横向位置','vertical position':'纵向位置',orientation:'角度'};
  const origin = {direct:'直接构思',guided:'Guided',blind:'Blind · 模型兜底',theme_fill:'主题补词'};
  let currentCase = 'city_population', compare = [], hideMethods = false;
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('metaphor-favorites') || '[]'); if (!Array.isArray(saved)) saved = []; } catch {}
  const favorite = new Set(saved);
  const all = data.examples.flatMap(e => Object.entries(e.arms).flatMap(([arm,v]) => v.candidates.map(c => ({...c,arm,case:e.name}))));
  const byId = id => all.find(c => c.id === id);
  const title = c => data.titles[c.case + ':' + c.keyword] || c.keyword;
  const method = c => hideMethods ? (c.arm === 'direct' ? '方案组 X' : '方案组 Y') : (c.arm === 'direct' ? '普通直接提示' : '仓库流程');
  const mapping = c => c.mapping.map(m => `<div><b>${esc(field[m.data_field] || m.data_field)}</b> → ${esc(m.visual_element)} · ${esc(channel[m.channel] || m.channel)}</div>`).join('');
  function openDialog(name, html) { $('dialog-title').textContent=name; $('dialog-body').innerHTML=html; if (!$('detail-dialog').open) $('detail-dialog').showModal(); }
  function closeDialog() { $('detail-dialog').close(); }
  $('detail-dialog').querySelector('.close').addEventListener('click',closeDialog);
  $('detail-dialog').addEventListener('click', e => { if (e.target === $('detail-dialog')) { const r=e.target.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeDialog(); } });
  function showDetail(id) {
    const c=byId(id); if(!c)return;
    const r=data.reviews[id] || {};
    openDialog(`${title(c)} · ${method(c)}`,`<img class="dialog-image" src="${esc(c.image_path)}" alt="${esc(title(c))}完整生成图"><div class="dialog-info"><section><h4>具体绑定</h4>${mapping(c)}<p class="method-only">候选来源：${esc(origin[c.origin])}${c.theme ? ' / '+esc(c.theme) : ''}</p></section><section><h4>读图备注 · Codex，非独立评审</h4><p>${esc(r.note || '未进行严格视觉比例测量。')}</p></section><details><summary>展开完整生图提示词</summary><pre>${esc(c.render_prompt)}</pre></details><details><summary>展开方案原始记录</summary><pre>${esc(JSON.stringify(c,null,2))}</pre></details></div>`);
  }
  function updateTray() {
    $('compare-tray').hidden = compare.length === 0;
    $('compare-count').textContent=`已选 ${compare.length} / 2 个方案`;
    $('open-compare').disabled=compare.length!==2;
  }
  function toggleCompare(id) {
    if(compare.includes(id)) compare=compare.filter(x=>x!==id);
    else { if(compare.length===2)compare.shift(); compare.push(id); }
    updateTray(); render();
  }
  function showCompare() {
    if(compare.length!==2)return;
    openDialog('方案并排比较',`<div class="compare-grid">${compare.map(id=>{const c=byId(id);return `<figure><img src="${esc(c.image_path)}" alt="${esc(title(c))}"><figcaption><strong>${esc(title(c))}</strong> · ${esc(method(c))}<div class="mapping">${mapping(c)}</div><p>${esc((data.reviews[id]||{}).note||'')}</p></figcaption></figure>`;}).join('')}</div>`);
  }
  function toggleFavorite(id) {
    if(favorite.has(id))favorite.delete(id);else favorite.add(id);
    try{localStorage.setItem('metaphor-favorites',JSON.stringify([...favorite]));}catch{}
    render();
  }
  function card(c,index) {
    return `<article class="candidate"><button class="image-button" type="button" data-detail="${esc(c.id)}" aria-label="查看${esc(title(c))}完整方案"><img src="${esc(c.image_path)}" width="1536" height="1024" loading="lazy" alt="${esc(title(c))}：${esc(c.keyword)}隐喻可视化"><span class="zoom" aria-hidden="true">查看大图 ↗</span></button><div class="card-body"><div class="card-top"><h4>${String(index+1).padStart(2,'0')} · ${esc(title(c))}<span class="english">${esc(c.keyword)}</span></h4><span class="tag method-only ${c.origin==='theme_fill'?'fill':c.origin==='blind'?'blind':''}">${esc(origin[c.origin])}</span></div><div class="mapping">${mapping(c)}</div><div class="card-actions"><button type="button" data-favorite="${esc(c.id)}" aria-pressed="${favorite.has(c.id)}">${favorite.has(c.id)?'★ 已收藏':'☆ 收藏方案'}</button><button type="button" data-compare="${esc(c.id)}" aria-pressed="${compare.includes(c.id)}">${compare.includes(c.id)?'✓ 已加入':'＋ 加入对比'}</button></div></div></article>`;
  }
  function render() {
    const e=data.examples.find(e=>e.name===currentCase);
    const city=currentCase==='city_population';
    $('case-description').textContent=city?'5个城市 · 人口与出生率':'2个地区 × 3个年份 · 太阳能产出';
    $('case-fact').textContent=city?'看人口规模与出生率的差异；杭州是不能忽略的例外。':'两地区产出均增长，North 与 South 的差距从25缩至3。';
    $('case-content').setAttribute('aria-labelledby',city?'city-tab':'energy-tab');
    document.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.case===currentCase)));
    $('arms').innerHTML=['direct','repository'].map(arm=>{
      const candidates=all.filter(c=>c.case===currentCase && c.arm===arm);
      const shown=$('favorites').checked?candidates.filter(c=>favorite.has(c.id)):candidates;
      const name=hideMethods?(arm==='direct'?'方案组 X':'方案组 Y'):(arm==='direct'?'普通直接提示':'仓库 Guided / Blind 流程');
      const description=hideMethods?'6 套完整方案':arm==='direct'?'一次构思回答 · 全部六项延展':city?'Guided 2 · Blind兜底 2 · 主题补词 2':'Guided 2 · Blind兜底 1 · 主题补词 3';
      return `<section class="arm ${arm}" aria-label="${esc(name)}"><div class="arm-head"><div class="arm-title"><span class="arm-mark">${hideMethods?(arm==='direct'?'X':'Y'):(arm==='direct'?'A':'B')}</span><h3>${esc(name)}</h3></div><small>${esc(description)}</small></div><div class="cards">${shown.map((c)=>card(c,candidates.findIndex(x=>x.id===c.id))).join('')||'<p class="empty">这一组还没有收藏，取消“仅看收藏”即可查看全部方案。</p>'}</div></section>`;
    }).join('');
    $('gallery-foot').textContent='本案例共12张图，每组6张。编号是原返回顺序，不是质量排名；该轮最终保留的候选均已生图。收藏仅保存在你的浏览器中。';
    document.body.classList.toggle('blind-mode',hideMethods);
    $('arms').querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.detail)));
    $('arms').querySelectorAll('[data-favorite]').forEach(b=>b.addEventListener('click',()=>toggleFavorite(b.dataset.favorite)));
    $('arms').querySelectorAll('[data-compare]').forEach(b=>b.addEventListener('click',()=>toggleCompare(b.dataset.compare)));
  }
  document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{currentCase=b.dataset.case;compare=[];updateTray();render();}));
  $('blind').addEventListener('change',e=>{hideMethods=e.target.checked;render();});
  $('favorites').addEventListener('change',render);
  $('clear-compare').addEventListener('click',()=>{compare=[];updateTray();render();});
  $('open-compare').addEventListener('click',showCompare);
  $('show-data').addEventListener('click',()=>{
    const e=data.examples.find(x=>x.name===currentCase),keys=Object.keys(e.records[0]);
    openDialog('原始合成数据',`<p class="small-note">这些是用于流程验证的合成数值，不是真实城市统计或能源测量；原始数据未规定物理单位。</p><table class="data-table"><thead><tr>${keys.map(k=>`<th scope="col">${esc(k)}</th>`).join('')}</tr></thead><tbody>${e.records.map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  });
  $('patch-text').textContent=data.patch;
  $('settings-table').innerHTML=`<table><thead><tr><th>环节</th><th>两例合计响应段数</th><th>说明</th></tr></thead><tbody>${[['共享 Module1','8','每例四段，两组共用'],['普通直接提示','2','每例一次，输出六套完整方案'],['Guided','24','六种策略×选维度与生成两步×两例'],['Blind 原生兜底','2','多词主题不在词向量表中'],['Agent5 / 主题分类','4','每例各一批'],['主题均衡补词','5','城市2段，能源3段'],['全部候选的 Module3','36','12个仓库候选×部件、映射、提示词三步']].map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')}</tbody></table><p>配置：totalLimit=6，blindRatio=0.4，主题均衡开启，Agent7 v5 模式开启。原生图片分支关闭，统一交给内置生图。最终比例会因主题补词与裁剪变化。</p>`;
  const revised = window.SELECTION_DATA;
  if (revised && $('revised-selections')) {
    $('revised-selections').innerHTML = revised.examples.map(e => `<section class="evidence"><h3>${e.name === 'city_population' ? '城市人口' : '区域太阳能产出'} · 10个改进候选</h3><table><thead><tr><th>保留来源</th><th>候选词</th><th>选择依据与约束</th></tr></thead><tbody>${e.selected.map(c => `<tr><td>${esc(c.selected_strategy ? 'Guided · ' + c.selected_strategy : 'Blind · 模型兜底')}</td><td>${esc(c.keyword)}</td><td>${esc(c.assessment.reason)}</td></tr>`).join('')}</tbody></table></section>`).join('');
  }
  render();
})();
