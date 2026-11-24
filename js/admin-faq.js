/* Help answers for admin-dating.html: add / edit / switch off assistant answers and see unanswered questions.
   Needs js/assistant-faq.js loaded BEFORE this file (it holds the built-in answers) and dating-migration-v74.
   All text is rendered with textContent (no innerHTML). */
(function () {
  'use strict';
  var rows = [], qs = [], editing = null;

  function db() { return typeof _supabase !== 'undefined' ? _supabase : null; }
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) [].concat(arguments[i]).forEach(function (c) { e.append(c == null ? '' : c); });
    return e;
  }
  function fmt(iso) { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function say(msg, bad) { var m = $('hfMsg'); if (m) { m.textContent = msg; m.style.color = bad ? '#d92d20' : '#1a7f4b'; } }
  function log(a, d) { try { if (typeof logAction === 'function') logAction(a, d); } catch (e) {} }

  function styles() {
    if ($('hfStyles')) return;
    document.head.appendChild(h('style', { id: 'hfStyles' }, [
      '.hf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}',
      '@media(max-width:900px){.hf-grid{grid-template-columns:1fr}}',
      '.hf-list{max-height:520px;overflow:auto}',
      '.hf-item{border:1px solid #e5e7eb;border-radius:10px;padding:9px 11px;margin-bottom:8px;background:#fff;font-size:.82rem}',
      '.hf-item .top{display:flex;justify-content:space-between;gap:8px;align-items:center}',
      '.hf-item small{color:#6b7280}.hf-off{opacity:.55}',
      '.hf-tag{font-size:.68rem;padding:1px 7px;border-radius:99px;background:#fdecf1;color:#b8294f;margin-left:6px}',
      '.hf-form label{display:block;font-size:.74rem;font-weight:600;margin:9px 0 3px;color:#374151}',
      '.hf-form textarea,.hf-form input[type=text]{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:8px;padding:8px 10px;font:inherit;font-size:.82rem}',
      '.hf-form textarea{min-height:76px;resize:vertical}',
      '.hf-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}'
    ].join('\n')));
  }

  function mount() {
    styles();
    var main = document.querySelector('main'), scroller = document.querySelector('.admin-tab-scroll');
    if (!main || !scroller || $('helpFaqSection')) return;
    main.appendChild(h('section', { id: 'helpFaqSection', class: 'admin-section', style: 'display:none;padding:20px;' },
      h('h3', { style: 'margin:0 0 4px;' }, h('i', { class: 'fas fa-comments', style: 'color:#c2185b;' }), ' Help answers'),
      h('p', { class: 'admin-card-sub', style: 'margin:0 0 14px;' }, 'Teach the Help assistant. Add answers for questions members ask, fix wrong answers, or switch an answer off. Changes reach members the next time they open the site.'),
      h('div', { class: 'hf-grid' },
        h('div', {},
          h('div', { class: 'admin-card', style: 'margin-bottom:14px;' },
            h('h4', { style: 'margin:0 0 8px;' }, 'Questions the assistant could not answer'),
            h('div', { id: 'hfQs', class: 'hf-list' }, h('div', { class: 'admin-empty' }, 'Loading…'))),
          h('div', { class: 'admin-card' },
            h('h4', { style: 'margin:0 0 8px;' }, 'Try a question'),
            h('input', { id: 'hfTest', class: 'admin-input', placeholder: 'Type a member question to see the answer it would get…', oninput: testIt }),
            h('div', { id: 'hfTestOut', style: 'margin-top:8px;font-size:.82rem;color:#374151;white-space:pre-wrap;' }))),
        h('div', {},
          h('div', { class: 'admin-card hf-form', style: 'margin-bottom:14px;' },
            h('h4', { id: 'hfFormTitle', style: 'margin:0 0 4px;' }, 'New answer'),
            h('label', {}, 'Question (English)'), h('input', { id: 'hfQEn', type: 'text', maxlength: 120 }),
            h('label', {}, 'Question (Amharic)'), h('input', { id: 'hfQAm', type: 'text', maxlength: 120 }),
            h('label', {}, 'Answer (English)'), h('textarea', { id: 'hfAEn', maxlength: 700 }),
            h('label', {}, 'Answer (Amharic)'), h('textarea', { id: 'hfAAm', maxlength: 700 }),
            h('label', {}, 'Trigger words, separated by commas (English and Amharic)'), h('input', { id: 'hfKw', type: 'text', placeholder: 'app, install, download, መተግበሪያ' }),
            h('div', { class: 'hf-row' },
              h('button', { class: 'admin-btn admin-btn-success', type: 'button', onclick: save }, 'Save answer'),
              h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { fill(null); } }, 'Clear'),
              h('span', { id: 'hfMsg', style: 'font-size:.78rem;' }))),
          h('div', { class: 'admin-card' },
            h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;' },
              h('h4', { style: 'margin:0;' }, 'All answers'),
              h('input', { id: 'hfSearch', class: 'admin-input', style: 'max-width:200px;', placeholder: 'Search…', oninput: renderAnswers })),
            h('div', { id: 'hfAnswers', class: 'hf-list' }))))));

    var btn = h('button', { class: 'tab-btn', type: 'button', id: 'helpFaqTabBtn' }, h('i', { class: 'fas fa-comments' }), ' Help answers');
    btn.setAttribute('onclick', "switchDatingTab('helpfaq', this)");
    var audit = Array.prototype.find.call(scroller.children, function (b) { return (b.getAttribute('onclick') || '').indexOf("'audit'") > -1; });
    if (audit) scroller.insertBefore(btn, audit); else scroller.appendChild(btn);
    if (typeof DATING_SECTIONS !== 'undefined') DATING_SECTIONS.helpfaq = 'helpFaqSection';
    btn.addEventListener('click', load);
  }

  function load() {
    var c = db(); if (!c) return;
    c.from('dating_faq').select('*').then(function (r) {
      if (r.error) { say(r.error.message + ' (run dating-migration-v74-help-answers.sql first)', true); return; }
      rows = r.data || [];
      if (window.WanaFAQ) window.WanaFAQ.setCustom(rows);
      renderAnswers(); testIt();
    });
    c.from('dating_assistant_questions').select('*').eq('handled', false).order('created_at', { ascending: false }).limit(300).then(function (r) {
      qs = r.data || []; renderQs();
    });
  }

  /* ---- unanswered questions, grouped by identical text ---- */
  function renderQs() {
    var box = $('hfQs'); if (!box) return;
    var map = {};
    qs.forEach(function (q) {
      var k = q.question.toLowerCase().trim() + '|' + q.kind;
      if (!map[k]) map[k] = { text: q.question, kind: q.kind, matched: q.matched, ids: [], last: q.created_at };
      map[k].ids.push(q.id);
    });
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.ids.length - a.ids.length; });
    if (!list.length) { box.replaceChildren(h('div', { class: 'admin-empty' }, 'No new questions. 🎉')); return; }
    box.replaceChildren.apply(box, list.map(function (g) {
      return h('div', { class: 'hf-item' },
        h('div', { class: 'top' }, h('strong', {}, g.text),
          h('span', { class: 'hf-tag' }, g.ids.length + '×' + (g.kind === 'unhelpful' ? ' not helpful' : ''))),
        h('small', {}, (g.kind === 'unhelpful' && g.matched ? 'Answer given: ' + g.matched + ' · ' : '') + fmt(g.last)),
        h('div', { class: 'hf-row', style: 'margin-top:6px;' },
          h('button', { class: 'admin-btn admin-btn-success', type: 'button', onclick: function () { fromQuestion(g); } }, 'Answer this'),
          h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { dismiss(g); } }, 'Dismiss')));
    }));
  }
  function fromQuestion(g) {
    fill(null);
    var am = window.WanaFAQ && window.WanaFAQ.isAmharic(g.text);
    $(am ? 'hfQAm' : 'hfQEn').value = g.text;
    $('hfKw').value = g.text.toLowerCase().replace(/[?.,!]/g, '').split(/\s+/).filter(function (w) { return w.length > 3; }).slice(0, 4).join(', ');
    $('hfFormTitle').textContent = 'New answer for: ' + g.text.slice(0, 50);
    editing = { fromIds: g.ids };
    $(am ? 'hfAAm' : 'hfAEn').focus();
  }
  function dismiss(g) {
    db().from('dating_assistant_questions').update({ handled: true }).in('id', g.ids).then(function () {
      qs = qs.filter(function (q) { return g.ids.indexOf(q.id) === -1; }); renderQs();
    });
  }

  /* ---- answers list ---- */
  function allAnswers() {
    var F = window.WanaFAQ; if (!F) return [];
    var bySlug = {}; rows.forEach(function (r) { if (r.slug) bySlug[r.slug] = r; });
    var out = F.BASE.map(function (b) {
      var r = bySlug[b.id];
      return { key: b.id, slug: b.id, builtin: true, row: r || null, off: !!(r && r.active === false),
        q_en: (r && r.q_en) || b.q.en, q_am: (r && r.q_am) || b.q.am, a_en: (r && r.a_en) || b.a.en, a_am: (r && r.a_am) || b.a.am,
        keywords: (r && r.keywords) || b.kw.join(', ') };
    });
    rows.forEach(function (r) { if (!r.slug || !F.BASE.some(function (b) { return b.id === r.slug; })) out.push({ key: 'r' + r.id, slug: r.slug, builtin: false, row: r, off: r.active === false, q_en: r.q_en, q_am: r.q_am, a_en: r.a_en, a_am: r.a_am, keywords: r.keywords }); });
    return out;
  }
  function renderAnswers() {
    var box = $('hfAnswers'); if (!box) return;
    var term = (($('hfSearch') || {}).value || '').toLowerCase();
    var list = allAnswers().filter(function (a) { return !term || (a.q_en + ' ' + a.q_am + ' ' + a.a_en + ' ' + a.keywords).toLowerCase().indexOf(term) > -1; });
    box.replaceChildren.apply(box, list.map(function (a) {
      var tag = a.builtin ? (a.row ? 'edited' : 'built-in') : 'custom';
      var acts = h('div', { class: 'hf-row', style: 'margin-top:6px;' },
        h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { fill(a); } }, 'Edit'),
        h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { toggle(a); } }, a.off ? 'Turn on' : 'Turn off'));
      if (!a.builtin) acts.append(h('button', { class: 'admin-btn admin-btn-danger', type: 'button', onclick: function () { remove(a); } }, 'Delete'));
      else if (a.row) acts.append(h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { remove(a); } }, 'Restore original'));
      return h('div', { class: 'hf-item' + (a.off ? ' hf-off' : '') },
        h('div', { class: 'top' }, h('strong', {}, a.q_en || a.q_am), h('span', { class: 'hf-tag' }, a.off ? 'off' : tag)),
        h('small', {}, (a.a_en || a.a_am || '').slice(0, 110) + '…'), acts);
    }));
  }
  function fill(a) {
    editing = a || null;
    $('hfFormTitle').textContent = a ? 'Edit answer' : 'New answer';
    $('hfQEn').value = a ? a.q_en || '' : ''; $('hfQAm').value = a ? a.q_am || '' : '';
    $('hfAEn').value = a ? a.a_en || '' : ''; $('hfAAm').value = a ? a.a_am || '' : '';
    $('hfKw').value = a ? a.keywords || '' : ''; say('');
    if (a) $('hfQEn').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---- save / toggle / delete ---- */
  function save() {
    var rec = { q_en: $('hfQEn').value.trim(), q_am: $('hfQAm').value.trim(), a_en: $('hfAEn').value.trim(), a_am: $('hfAAm').value.trim(),
      keywords: $('hfKw').value.trim(), active: true, updated_at: new Date().toISOString() };
    if (!rec.a_en && !rec.a_am) return say('Write an answer in English or Amharic.', true);
    if (!rec.q_en && !rec.q_am) return say('Write the question.', true);
    if (!rec.keywords) return say('Add a few trigger words so the assistant can find this answer.', true);
    var q;
    if (editing && editing.builtin) { rec.slug = editing.slug; q = db().from('dating_faq').upsert(rec, { onConflict: 'slug' }); }
    else if (editing && editing.row) q = db().from('dating_faq').update(rec).eq('id', editing.row.id);
    else q = db().from('dating_faq').insert(rec);
    q.then(function (r) {
      if (r.error) return say(r.error.message, true);
      log('Help answer saved', rec.q_en || rec.q_am);
      var ids = editing && editing.fromIds;
      if (ids) db().from('dating_assistant_questions').update({ handled: true }).in('id', ids).then(function () {});
      fill(null); say('Saved. Members will see it when they next open the site.'); load();
    });
  }
  function toggle(a) {
    var q;
    if (a.row) q = db().from('dating_faq').update({ active: a.off, updated_at: new Date().toISOString() }).eq('id', a.row.id);
    else q = db().from('dating_faq').insert({ slug: a.slug, q_en: a.q_en, q_am: a.q_am, a_en: a.a_en, a_am: a.a_am, keywords: a.keywords, active: false });
    q.then(function (r) { if (r.error) say(r.error.message, true); else { log('Help answer ' + (a.off ? 'on' : 'off'), a.q_en); load(); } });
  }
  function remove(a) {
    if (!confirm(a.builtin ? 'Restore the original built-in answer?' : 'Delete this answer?')) return;
    db().from('dating_faq').delete().eq('id', a.row.id).then(function (r) { if (r.error) say(r.error.message, true); else { log('Help answer removed', a.q_en); load(); } });
  }

  function testIt() {
    var out = $('hfTestOut'), t = (($('hfTest') || {}).value || '').trim();
    if (!out || !window.WanaFAQ) return;
    if (!t) { out.textContent = ''; return; }
    var r = window.WanaFAQ.answer(t);
    out.textContent = (r.fallback ? '⚠ No answer found — members would see the "didn\'t get that" message.\n' : '✓ ' + (r.id || '') + '\n') + r.text;
  }

  function init() { mount(); }
  if (document.querySelector('.admin-tab-scroll') && document.querySelector('main')) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
