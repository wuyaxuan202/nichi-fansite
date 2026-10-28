(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const CFG = window.SITE_CONFIG || {};
  const sb = CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey)
    : null;

  const state = { profile: null, works: [], interviews: [], news: [], loaded: false };
  let isAdmin = false, adminOn = false;

  const SCHEMA = {
    works: { title: "作品", fields: [
      { k: "year", label: "年份", ph: "2025", req: true },
      { k: "title", label: "作品名稱", ph: "晚安，瑪卡龍", req: true },
      { k: "category", label: "類型", type: "select", opts: ["劇集", "電影", "短片", "單元劇", "MV", "廣告", "舞台劇", "綜藝", "其他"] },
      { k: "role", label: "飾演角色", ph: "田田" },
      { k: "platform", label: "播出平台 / 出品", ph: "公視人生劇展" },
      { k: "link", label: "相關連結", type: "url", ph: "https://" },
      { k: "note", label: "簡介", type: "textarea" },
      { k: "image", label: "劇照或海報（選填）", type: "image" }
    ]},
    interviews: { title: "訪談", fields: [
      { k: "pub_date", label: "日期", type: "date", req: true },
      { k: "outlet", label: "媒體", ph: "NOWnews", req: true },
      { k: "title", label: "標題", req: true },
      { k: "kind", label: "形式", type: "select", opts: ["文字專訪", "新聞報導", "記者會", "影音", "Podcast", "雜誌"] },
      { k: "link", label: "原文連結", type: "url", ph: "https://" },
      { k: "summary", label: "重點摘要（用自己的話寫）", type: "textarea" }
    ]},
    news: { title: "近況", fields: [
      { k: "pub_date", label: "日期", type: "date", req: true },
      { k: "body", label: "內容", type: "textarea", req: true },
      { k: "link", label: "相關連結", type: "url", ph: "https://" }
    ]},
    profile: { title: "個人資料", fields: [
      { k: "name", label: "中文名", req: true },
      { k: "latin", label: "英文名 / 暱稱" },
      { k: "tagline", label: "一句話介紹", type: "textarea" },
      { k: "bio", label: "簡介", type: "textarea" },
      { k: "agency", label: "經紀公司" },
      { k: "instagram", label: "Instagram 帳號（不含 @）" },
      { k: "photo", label: "形象照", type: "image" }
    ]}
  };

  /* ---------- helpers ---------- */
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids) { if (c == null || c === false) continue; n.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return n;
  }
  const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u.trim())) ? u.trim() : null;
  const fmtDate = (d) => (d || "").replace(/-/g, ".");
  function toast(msg) { const t = el("div", { class: "toast", text: msg, role: "status" }); document.body.append(t); setTimeout(() => t.remove(), 2400); }
  function editBtn(kind, id) { return el("button", { class: "btn small admin-only", text: "編輯", onclick: () => openEditor(kind, id) }); }
  const link = (href, text, style) => el("a", { href, target: "_blank", rel: "noopener", text, style });

  /* ---------- render ---------- */
  function renderProfile() {
    const p = state.profile || {};
    $("#pName").textContent = p.name || "趙妮綺";
    $("#pLatin").textContent = p.latin || "";
    $("#pLatin").hidden = !p.latin;
    $("#pTag").textContent = p.tagline || "台灣新生代演員。這裡整理她的作品、訪談與近況。";
    $("#pBio").textContent = p.bio || (state.loaded ? "還沒有簡介。" : "資料載入中…");
    const facts = $("#pFacts"); facts.replaceChildren();
    if (p.agency) facts.append(el("span", { class: "fact" }, el("b", { text: "經紀" }), p.agency));
    if (state.works.length) facts.append(el("span", { class: "fact" }, el("b", { text: "作品" }), state.works.length + " 部"));
    const ig = (p.instagram || "tanya_o_c").replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
    const a = $("#pIg"); a.href = "https://www.instagram.com/" + ig + "/"; a.textContent = "Instagram @" + ig + " ↗";
    const por = $("#portrait"), src = safeUrl(p.photo);
    const old = por.querySelector("img"); if (old) old.remove();
    por.querySelector(".mono").hidden = !!src;
    if (src) por.prepend(el("img", { src, alt: (p.name || "趙妮綺") + " 形象照", onerror: function () { this.remove(); por.querySelector(".mono").hidden = false; } }));
  }

  function emptyRow(tag, msg) { return el(tag, { class: "empty", style: "display:block" }, state.loaded ? msg : "載入中…"); }

  function renderWorks() {
    const list = $("#lWorks"); list.replaceChildren();
    const items = [...state.works].sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")) || String(a.title || "").localeCompare(String(b.title || "")));
    $("#cWorks").textContent = items.length ? String(items.length).padStart(2, "0") : "";
    if (!items.length) { list.append(emptyRow("li", "還沒有作品資料。")); return; }
    for (const w of items) {
      const href = safeUrl(w.link), img = safeUrl(w.image);
      list.append(el("li", null,
        el("div", { class: "yr", text: w.year || "—" }),
        el("div", { style: "min-width:0" },
          el("h3", { class: "t" }, href ? link(href, w.title || "未命名", "color:inherit;text-decoration:none") : (w.title || "未命名")),
          w.role ? el("p", { class: "role" }, el("span", { class: "as", text: "飾" }), w.role) : null,
          el("div", { class: "meta" },
            w.category ? el("span", { class: "tag", text: w.category }) : null,
            w.platform ? el("span", { text: w.platform }) : null,
            href ? link(href, "相關連結 ↗") : null),
          w.note ? el("p", { class: "note", text: w.note }) : null),
        el("div", { style: "display:grid;gap:8px;justify-items:end" },
          img ? el("img", { class: "thumb", src: img, alt: (w.title || "") + " 劇照", loading: "lazy", onerror: function () { this.remove(); } }) : null,
          editBtn("works", w.id))
      ));
    }
  }

  function renderPress() {
    const box = $("#lPress"); box.replaceChildren();
    const items = [...state.interviews].sort((a, b) => String(b.pub_date || "").localeCompare(String(a.pub_date || "")));
    $("#cPress").textContent = items.length ? String(items.length).padStart(2, "0") : "";
    if (!items.length) { box.append(emptyRow("div", "還沒有訪談或報導。")); return; }
    for (const it of items) {
      const href = safeUrl(it.link);
      box.append(el("article", { class: "pcard" },
        el("div", { class: "row" }, el("span", { text: it.outlet || "" }), el("span", { text: fmtDate(it.pub_date) })),
        el("h3", null, href ? link(href, it.title || "未命名") : (it.title || "未命名")),
        it.summary ? el("p", { text: it.summary }) : null,
        el("div", { class: "foot" },
          it.kind ? el("span", { class: "kind", text: it.kind }) : el("span"),
          el("span", { style: "display:flex;gap:8px;align-items:center" },
            href ? link(href, "閱讀原文 ↗", "font-size:13px") : null,
            editBtn("interviews", it.id)))
      ));
    }
  }

  function renderNews() {
    const list = $("#lNews"); list.replaceChildren();
    const items = [...state.news].sort((a, b) => String(b.pub_date || "").localeCompare(String(a.pub_date || "")));
    if (!items.length) { list.append(emptyRow("li", "目前沒有近況。")); return; }
    for (const n of items) {
      const href = safeUrl(n.link);
      list.append(el("li", null,
        el("span", { class: "d", text: fmtDate(n.pub_date) }),
        el("div", { style: "min-width:0" }, el("p", { text: n.body || "" }), href ? link(href, "相關連結 ↗", "font-size:13px") : null),
        editBtn("news", n.id)));
    }
  }

  function renderAll() { renderProfile(); renderWorks(); renderPress(); renderNews(); }

  /* ---------- data ---------- */
  async function loadData() {
    try {
      if (sb) {
        const [p, w, i, n] = await Promise.all([
          sb.from("profile").select("*").eq("id", 1).maybeSingle(),
          sb.from("works").select("*"),
          sb.from("interviews").select("*"),
          sb.from("news").select("*")
        ]);
        for (const r of [p, w, i, n]) if (r.error) throw r.error;
        state.profile = p.data; state.works = w.data || []; state.interviews = i.data || []; state.news = n.data || [];
      } else {
        const res = await fetch("data/seed.json", { cache: "no-cache" });
        const d = await res.json();
        state.profile = d.profile; state.works = d.works || []; state.interviews = d.interviews || []; state.news = d.news || [];
      }
    } catch (e) {
      console.error("載入資料失敗", e);
    }
    state.loaded = true;
    renderAll();
  }

  /* ---------- auth ---------- */
  async function refreshAdmin() {
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    if (!data.session) { isAdmin = false; }
    else {
      const r = await sb.rpc("is_admin");
      isAdmin = !r.error && r.data === true;
    }
    $("#adminToggle").hidden = !isAdmin;
    $("#adminLink").hidden = isAdmin;
    if (!isAdmin) setAdmin(false);
  }

  function openLogin() {
    if (!sb) { toast("後台尚未設定，請先依 README 完成 Supabase 設定。"); return; }
    const err = el("p", { class: "err", role: "alert" });
    const email = el("input", { id: "login-email", type: "email", autocomplete: "username", required: true });
    const pw = el("input", { id: "login-pw", type: "password", autocomplete: "current-password", required: true });
    const submit = el("button", { type: "submit", class: "btn primary", text: "登入" });
    const form = el("form", { class: "panel", novalidate: true },
      el("h3", { text: "管理員登入" }),
      el("div", { class: "field" }, el("label", { for: "login-email", text: "Email" }), email),
      el("div", { class: "field" }, el("label", { for: "login-pw", text: "密碼" }), pw),
      err,
      el("div", { class: "actions" }, submit, el("button", { type: "button", class: "btn", text: "取消", onclick: closeSheet })));
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); err.textContent = "";
      submit.disabled = true; submit.textContent = "登入中…";
      const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pw.value });
      submit.disabled = false; submit.textContent = "登入";
      if (error) { err.textContent = "Email 或密碼不正確。"; return; }
      await refreshAdmin();
      if (!isAdmin) { err.textContent = "這個帳號沒有管理權限，請請站長把你的 Email 加進管理員名單。"; await sb.auth.signOut(); return; }
      closeSheet(); setAdmin(true); toast("已登入，管理模式已開啟");
      if (location.hash === "#admin") history.replaceState(null, "", location.pathname);
    });
    showSheet(form);
  }

  /* ---------- sheet ---------- */
  let onKey = null;
  function showSheet(panel) {
    closeSheet();
    onKey = (e) => { if (e.key === "Escape") closeSheet(); };
    document.addEventListener("keydown", onKey);
    $("#sheetRoot").replaceChildren(el("div", { class: "sheet", onclick: (ev) => { if (ev.target.classList.contains("sheet")) closeSheet(); } }, panel));
    const first = panel.querySelector("input,select,textarea"); if (first) first.focus();
  }
  function closeSheet() {
    $("#sheetRoot").replaceChildren();
    if (onKey) document.removeEventListener("keydown", onKey);
    onKey = null;
  }

  /* ---------- editor ---------- */
  async function uploadImage(kind, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = kind + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  function openEditor(kind, id) {
    if (!isAdmin || !sb) return;
    const sch = SCHEMA[kind];
    const isProfile = kind === "profile";
    const cur = isProfile ? (state.profile || {}) : (id ? (state[kind].find((x) => x.id === id) || {}) : {});
    const isNew = !isProfile && !id;
    const vals = {};
    for (const f of sch.fields) vals[f.k] = cur[f.k] || "";
    const err = el("p", { class: "err", role: "alert" });
    const form = el("form", { class: "panel", novalidate: true }, el("h3", { text: (isNew ? "新增" : "編輯") + sch.title }));

    for (const f of sch.fields) {
      const fid = "f-" + kind + "-" + f.k;
      const wrap = el("div", { class: "field" }, el("label", { for: fid, text: f.label + (f.req ? " *" : "") }));
      let input;
      if (f.type === "select") {
        input = el("select", { id: fid }, el("option", { value: "", text: "—" }));
        for (const o of f.opts) input.append(el("option", { value: o, text: o, selected: vals[f.k] === o }));
      } else if (f.type === "textarea") {
        input = el("textarea", { id: fid, placeholder: f.ph }); input.value = vals[f.k];
      } else if (f.type === "image") {
        const prev = el("img", { class: "imgprev", alt: "", hidden: !safeUrl(vals[f.k]), src: safeUrl(vals[f.k]) });
        const status = el("span", { class: "hint" });
        const rm = el("button", { type: "button", class: "btn small", text: "移除圖片", hidden: !vals[f.k], onclick: () => { vals[f.k] = ""; prev.hidden = true; rm.hidden = true; } });
        const file = el("input", { id: fid, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif" });
        file.addEventListener("change", async () => {
          const fl = file.files && file.files[0]; if (!fl) return;
          if (fl.size > 5 * 1024 * 1024) { status.textContent = "檔案太大，請用 5MB 以下的圖片。"; return; }
          status.textContent = "上傳中…";
          try { vals[f.k] = await uploadImage(kind, fl); prev.src = vals[f.k]; prev.hidden = false; rm.hidden = false; status.textContent = "已上傳"; }
          catch (e) { console.error(e); status.textContent = "上傳失敗，請確認已登入，或稍後再試。"; }
        });
        wrap.append(el("div", { style: "display:flex;gap:12px;align-items:end;flex-wrap:wrap" }, prev, el("div", { style: "display:grid;gap:6px" }, file, rm, status)));
        form.append(wrap); continue;
      } else {
        input = el("input", { id: fid, type: f.type === "date" ? "date" : f.type === "url" ? "url" : "text", placeholder: f.ph });
        input.value = vals[f.k];
      }
      input.dataset.k = f.k;
      wrap.append(input); form.append(wrap);
    }

    const saveBtn = el("button", { type: "submit", class: "btn primary", text: "儲存" });
    const actions = el("div", { class: "actions" }, saveBtn, el("button", { type: "button", class: "btn", text: "取消", onclick: closeSheet }));
    if (!isNew && !isProfile) {
      const del = el("button", { type: "button", class: "btn danger", text: "刪除", style: "margin-left:auto" });
      del.addEventListener("click", () => {
        del.replaceWith(el("span", { style: "margin-left:auto;display:flex;gap:6px;align-items:center;font-size:13px" }, "確定刪除？",
          el("button", { type: "button", class: "btn small danger", text: "刪除", onclick: async () => {
            const { error } = await sb.from(kind).delete().eq("id", id);
            if (error) { err.textContent = "刪除失敗，請確認登入狀態。"; return; }
            closeSheet(); toast("已刪除"); loadData();
          }}),
          el("button", { type: "button", class: "btn small", text: "保留", onclick: () => openEditor(kind, id) })));
      });
      actions.append(del);
    }
    form.append(err, actions);

    form.addEventListener("submit", async (e) => {
      e.preventDefault(); err.textContent = "";
      form.querySelectorAll("[data-k]").forEach((i) => { vals[i.dataset.k] = (i.value || "").trim(); });
      for (const f of sch.fields) if (f.req && !vals[f.k]) { err.textContent = "請填寫「" + f.label + "」。"; return; }
      for (const f of sch.fields) if (f.type === "url" && vals[f.k] && !safeUrl(vals[f.k])) { err.textContent = "「" + f.label + "」需要以 https:// 開頭。"; return; }
      const row = {};
      for (const f of sch.fields) row[f.k] = vals[f.k] === "" ? null : vals[f.k];
      saveBtn.disabled = true; saveBtn.textContent = "儲存中…";
      let res;
      if (isProfile) res = await sb.from("profile").upsert(Object.assign({ id: 1 }, row));
      else if (isNew) res = await sb.from(kind).insert(row);
      else res = await sb.from(kind).update(row).eq("id", id);
      saveBtn.disabled = false; saveBtn.textContent = "儲存";
      if (res.error) { console.error(res.error); err.textContent = "儲存失敗，請確認登入狀態後再試。"; return; }
      closeSheet(); toast("已儲存"); loadData();
    });

    showSheet(form);
  }

  function setAdmin(on) {
    adminOn = on;
    document.body.classList.toggle("admin-on", on);
    $("#adminToggle").textContent = on ? "結束管理" : "管理模式";
    $("#adminToggle").setAttribute("aria-pressed", String(on));
  }

  /* ---------- wire up ---------- */
  $("#adminToggle").addEventListener("click", () => setAdmin(!adminOn));
  $("#editProfile").addEventListener("click", () => openEditor("profile"));
  $("#logout").addEventListener("click", async () => { if (sb) await sb.auth.signOut(); await refreshAdmin(); toast("已登出"); });
  $("#adminLink").addEventListener("click", (e) => { e.preventDefault(); openLogin(); });
  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => openEditor(b.dataset.add)));

  renderAll();
  loadData();
  if (sb) {
    // Supabase 建議不要在 onAuthStateChange 裡直接呼叫其他 API，延到下一輪再查權限
    sb.auth.onAuthStateChange(() => { setTimeout(refreshAdmin, 0); });
  }
  if (location.hash === "#admin") openLogin();
})();
