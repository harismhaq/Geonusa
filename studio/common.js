// Kode bersama GeoNusa (sosmed & studio): auth, profil, peta dasar, sidebar kaca
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = () => window.lucide && lucide.createIcons();
const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const styleOf = l => ({ color: l.color || '#008bb0', fillColor: l.color || '#008bb0', fillOpacity: (l.opacity ?? .7) * .45, weight: l.stroke_width ?? 2, opacity: l.opacity ?? .7 });

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const BASES = {
  street: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap contributors', 'Peta Jalan (OSM)'],
  sat: [ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community', 'Satelit (Esri Imagery)'],
  dark: [ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors', 'Gelap (Esri Dark Gray)', { maxNativeZoom: 16 }]
};

let sb = null, user = null, profile = null, authMode = 'login', map = null;
const authCbs = [], onAuth = f => authCbs.push(f);

function toast(m, t) {
  const e = document.createElement('div');
  e.className = 'px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg ' + (t === 'error' ? 'bg-rose-600' : t === 'ok' ? 'bg-emerald-600' : 'bg-slate-800');
  e.textContent = m; $('toasts').appendChild(e); setTimeout(() => e.remove(), 3500);
}

document.head.insertAdjacentHTML('beforeend', `<style>
body{font-family:'Inter',sans-serif}.leaflet-container{font:inherit;isolation:isolate}
.sidebar-panel{position:absolute;top:.75rem;left:.75rem;bottom:.75rem;width:var(--sidebar-width,400px);max-width:calc(100vw - 1.5rem);transition:transform .3s ease}
.sidebar-panel.collapsed{transform:translateX(-115%)}.sidebar-panel.is-resizing{transition:none}
.sidebar-inner{background:rgba(255,255,255,.62);backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);border:1px solid rgba(255,255,255,.75);border-radius:28px;box-shadow:0 20px 50px rgba(15,23,42,.25)}
.sidebar-resizer{position:absolute;top:0;right:-5px;bottom:0;width:10px;cursor:col-resize}
.custom-scrollbar::-webkit-scrollbar{width:5px}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px}
.glass{background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 24px rgba(15,23,42,.18)}
.gp-pop .leaflet-popup-content-wrapper{border-radius:16px;padding:0;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.28);background:rgba(255,255,255,.98)}
.gp-pop .leaflet-popup-content{margin:0;width:auto!important;font-size:11px;line-height:1.35}.gp-pop .leaflet-popup-tip{background:rgba(255,255,255,.98)}
.gp-pop a.leaflet-popup-close-button{top:8px;right:8px;width:22px;height:22px;padding:0;border-radius:9999px;background:rgba(255,255,255,.25);color:#fff;font:700 15px/21px Inter,sans-serif;text-align:center}
.gp-h{display:flex;align-items:center;gap:8px;padding:10px 38px 10px 12px;background:linear-gradient(90deg,#008bb0,#00b0d8);color:#fff;font-size:12px}
.gp-h span,.gp-s span{width:10px;height:10px;border-radius:3px;border:2px solid #fff;flex:none;box-shadow:0 0 0 1px rgba(15,23,42,.25)}
.gp-b{max-height:240px;overflow-y:auto;padding:2px 0 4px}.gp-s{display:flex;align-items:center;gap:6px;padding:6px 12px;margin-top:2px;background:#e0f2f7;color:#0b4a75;font-weight:800}
.gp-r{display:flex;justify-content:space-between;gap:16px;padding:5px 12px}.gp-r:nth-child(even){background:#f8fafc}
.gp-r span{color:#64748b;flex:none;max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gp-r b{color:#0f172a;text-align:right;word-break:break-word;font-weight:600}
.gp-e{padding:4px 12px;color:#94a3b8;font-size:10px}
.leaflet-container .leaflet-control-attribution{font:500 10px/1.45 Inter,sans-serif!important;color:#475569;background:rgba(255,255,255,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:2px 9px;margin:0;border-radius:10px 0 0 0;box-shadow:none}
.leaflet-control-attribution a{color:#0b4a75;text-decoration:none}.leaflet-control-attribution a:hover{text-decoration:underline}
.leaflet-control-attribution svg,.leaflet-attribution-flag{display:none!important}
.leaflet-control-zoom{border:0!important;box-shadow:0 4px 14px rgba(15,23,42,.18)!important;border-radius:12px!important;overflow:hidden}
.leaflet-control-zoom a{width:32px!important;height:32px!important;line-height:32px!important;font:600 16px Inter,sans-serif!important;color:#334155!important}.leaflet-control-zoom a:hover{background:#f1f5f9!important;color:#008bb0!important}
</style>`);
const INP = 'w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs';
document.body.insertAdjacentHTML('beforeend', `<div id="toasts" class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1500] flex flex-col gap-2 pointer-events-none"></div>
<div id="authModal" class="fixed inset-0 z-[1300] hidden items-center justify-center bg-slate-900/60 p-4"><div class="bg-white rounded-3xl max-w-md w-full p-8 relative">
 <button onclick="closeAuth()" class="absolute top-5 right-5 text-slate-400">✕</button><h3 id="authTitle" class="text-2xl font-extrabold text-center">Masuk</h3>
 <form onsubmit="submitAuth(event)" class="space-y-3 mt-5"><input id="aName" placeholder="Nama lengkap / instansi" class="hidden ${INP}"><input id="aEmail" type="email" required placeholder="Email" class="${INP}"><input id="aPass" type="password" required minlength="6" placeholder="Password (min. 6 karakter)" class="${INP}">
 <button id="aSubmit" class="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-2xl">Masuk</button></form>
 <button onclick="toggleAuthMode()" id="aToggle" class="w-full mt-3 text-xs text-primary font-semibold">Belum punya akun? Daftar</button>
 <button onclick="googleLogin()" class="w-full mt-4 py-3 border border-slate-200 text-xs font-semibold rounded-2xl hover:bg-slate-50">Lanjutkan dengan Google</button></div></div>
<div id="profileModal" class="fixed inset-0 z-[1300] hidden items-center justify-center bg-slate-900/60 p-4"><div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
 <button onclick="closeProfile()" class="absolute top-5 right-5 text-slate-400">✕</button><h3 class="text-xl font-extrabold text-center">Edit Profil</h3>
 <div class="flex flex-col items-center gap-2 mt-4"><div id="pAvatar"></div>
  <div class="flex gap-4 text-xs font-bold"><button type="button" onclick="$('pFile').click()" class="text-primary">Ganti foto</button><button type="button" id="pDel" onclick="removeAvatar()" class="text-rose-600">Hapus foto</button></div>
  <input type="file" id="pFile" accept="image/png,image/jpeg,image/webp" class="hidden" onchange="pickAvatar(this)"></div>
 <form onsubmit="saveProfile(event)" class="space-y-3 mt-4">
  <input id="pName" required maxlength="60" placeholder="Nama lengkap" class="${INP}">
  <input id="pOrg" maxlength="80" placeholder="Instansi / organisasi / profesi" class="${INP}">
  <input id="pLoc" maxlength="60" placeholder="Lokasi (mis. Pontianak, Kalimantan Barat)" class="${INP}">
  <input id="pWeb" maxlength="120" placeholder="Situs web / tautan (https://...)" class="${INP}">
  <textarea id="pBio" rows="3" maxlength="200" placeholder="Deskripsi singkat tentang Anda" class="${INP} resize-none"></textarea>
  <input id="pEmail" disabled class="${INP} bg-slate-100 text-slate-500">
  <button id="pSave" class="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-2xl">Simpan</button></form></div></div>`);

/* ---- Auth & profil ---- */
const openAuth = () => { location.href = 'login.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search); }, closeAuth = () =>$('authModal').classList.replace('flex', 'hidden');
const closeProfile = () => $('profileModal').classList.replace('flex', 'hidden');
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login'; const r = authMode === 'register';
  $('authTitle').textContent = r ? 'Buat Akun' : 'Masuk'; $('aSubmit').textContent = r ? 'Daftar' : 'Masuk';
  $('aName').classList.toggle('hidden', !r);$('aToggle').textContent = r ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
}
async function submitAuth(e) {
  e.preventDefault(); const email = $('aEmail').value.trim(), password = $('aPass').value; $('aSubmit').disabled = true;
  try {
    if (authMode === 'register') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: $('aName').value.trim() || email.split('@')[0] } } });
      if (error) throw error;
      if (!data.session) { toast('Cek email Anda untuk konfirmasi akun.', 'ok'); closeAuth(); return; }
    } else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
    closeAuth(); toast('Berhasil masuk', 'ok');
  } catch (err) { toast(err.message === 'Invalid login credentials' ? 'Email atau password salah.' : err.message, 'error'); }
  finally { $('aSubmit').disabled = false; }
}
async function googleLogin() {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname + location.search } });
  if (error) toast(error.message, 'error');
}
async function logout() { await sb.auth.signOut(); await setSession(null); }
let avBlob = null, avRemove = false;
function openProfile() {
  if (!user) return; const p = profile || {}; avBlob = null; avRemove = false;
  $('pName').value = p.full_name || ''; $('pOrg').value = p.organization || ''; $('pLoc').value = p.location || ''; $('pWeb').value = p.website || ''; $('pBio').value = p.bio || ''; $('pEmail').value = user.email;
  $('pAvatar').innerHTML = avatarHTML(p.avatar_url, p.full_name, 'w-24 h-24 text-3xl'); $('pDel').classList.toggle('hidden', !p.avatar_url);
  $('profileModal').classList.replace('hidden', 'flex');
}
/* ---- Crop foto profil: geser & zoom ---- */
let cr = null;
function pickAvatar(inp) {
  const f = inp.files[0]; inp.value = ''; if (!f) return;
  if (f.size > 8 * 1024 * 1024) return toast('Foto maksimal 8 MB.', 'error');
  const img = new Image();
  img.onload = () => { const S = 280; cr = { img, base: Math.max(S / img.width, S / img.height), z: 1, x: S / 2, y: S / 2 }; $('cropZoom').value = 100; drawCrop(); $('cropModal').classList.replace('hidden', 'flex'); };
  img.onerror = () => toast('Gambar tidak dapat dibaca.', 'error'); img.src = URL.createObjectURL(f);
}
function drawCrop() {
  const S = 280, s = cr.base * cr.z, w = cr.img.width * s, h = cr.img.height * s;
  cr.x = Math.min(w / 2, Math.max(S - w / 2, cr.x)); cr.y = Math.min(h / 2, Math.max(S - h / 2, cr.y));
  const c = $('cropCv').getContext('2d'); c.clearRect(0, 0, S, S); c.drawImage(cr.img, cr.x - w / 2, cr.y - h / 2, w, h);
}
function setZoom(v) { const k = (v / 100) / cr.z; cr.z = v / 100; cr.x = 140 + (cr.x - 140) * k; cr.y = 140 + (cr.y - 140) * k; $('cropZoom').value = v; drawCrop(); }
function closeCrop() { $('cropModal').classList.replace('flex', 'hidden'); }
function applyCrop() {
  const o = document.createElement('canvas'); o.width = o.height = 400; const k = 400 / 280, s = cr.base * cr.z * k, w = cr.img.width * s, h = cr.img.height * s;
  o.getContext('2d').drawImage(cr.img, cr.x * k - w / 2, cr.y * k - h / 2, w, h);
  o.toBlob(b => { avBlob = b; avRemove = false; $('pAvatar').innerHTML = avatarHTML(URL.createObjectURL(b), $('pName').value, 'w-24 h-24 text-3xl'); $('pDel').classList.remove('hidden'); closeCrop(); }, 'image/jpeg', .88);
}
function removeAvatar() { avBlob = null; avRemove = true; $('pAvatar').innerHTML = avatarHTML('', $('pName').value, 'w-24 h-24 text-3xl'); $('pDel').classList.add('hidden'); }
async function saveProfile(e) {
  e.preventDefault(); $('pSave').disabled = true;
  try {
    let avatar_url = profile.avatar_url || null; const path = `${user.id}/avatar.jpg`;
    if (avRemove) { avatar_url = null; await sb.storage.from('avatars').remove([path]); }
    if (avBlob) {
      const { error: ue } = await sb.storage.from('avatars').upload(path, avBlob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' }); if (ue) throw ue;
      avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
    }
    let web = $('pWeb').value.trim(); if (web && !/^https?:\/\//i.test(web)) web = 'https://' + web;
    const row = { full_name: $('pName').value.trim(), bio: $('pBio').value.trim(), organization: $('pOrg').value.trim() || null, location: $('pLoc').value.trim() || null, website: web || null, avatar_url };
    const { error } = await sb.from('profiles').update(row).eq('id', user.id); if (error) throw error;
    Object.assign(profile, row); renderUser(); closeProfile(); window.onProfileSaved && onProfileSaved(); toast('Profil diperbarui', 'ok');
  } catch (err) { toast(err.message || 'Gagal menyimpan profil.', 'error'); } finally { $('pSave').disabled = false; }
}
function renderUser() {
  const isStudio = location.pathname.includes('studio');
  const href = isStudio ? 'index.html' : 'studio.html';
  const lbl = isStudio ? 'Beranda' : 'Studio';
  const n = profile?.full_name || user?.email || '';

  $('userPill').innerHTML = `<div class="flex items-center gap-1">` +
    `<a href="panduan.html" class="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all">Panduan</a><a href="${href}" class="px-3 py-1.5 text-xs font-bold text-primary hover:bg-slate-100 rounded-xl transition-all">${lbl}</a>` +
    (user
      ? `<a href="profile.html?u=${user.id}" class="flex items-center gap-2 px-1 ml-1" title="Profil saya">${avatarHTML(profile?.avatar_url, n, 'w-8 h-8 text-xs')}<span class="hidden sm:block text-xs font-bold truncate max-w-[120px]">${esc(n)}</span></a><button onclick="logout()" class="p-2 text-slate-400 hover:text-rose-600" title="Keluar"><i data-lucide="log-out" class="w-4 h-4"></i></button>`
      : `<button onclick="openAuth()" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all shadow-xs ml-1">Daftar / Masuk</button>`) +
    `</div>`;
  icons();
}
async function setSession(s) {
  user = s?.user || null; profile = null;
  if (user) { const { data } = await sb.from('profiles').select('full_name,bio,avatar_url,organization,location,website').eq('id', user.id).maybeSingle(); profile = data || { full_name: user.email.split('@')[0] }; }
  renderUser(); for (const f of authCbs) await f();
}
async function bootAuth() {
  if (typeof SUPABASE_CONFIG === 'undefined' || !window.supabase) { toast('Konfigurasi Supabase tidak ditemukan.', 'error'); return; }
  sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  const { data: { session } } = await sb.auth.getSession(); await setSession(session);
  sb.auth.onAuthStateChange((ev, s) => { if (['SIGNED_IN', 'SIGNED_OUT'].includes(ev) && s?.user?.id !== user?.id) setTimeout(() => setSession(s), 0); });
}

/* ---- Sidebar kaca & peta ---- */
function mountSidebar(sub, html) {
  $('app').insertAdjacentHTML('afterbegin', `<aside id="sidebar" class="sidebar-panel flex flex-col z-[900]"><div class="sidebar-inner w-full h-full flex flex-col overflow-hidden">
   <div class="px-5 h-[72px] flex items-center justify-between shrink-0 border-b border-white/40"><div class="flex items-center gap-3">
    <div class="w-11 h-11 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-center shrink-0 shadow-sm p-2"><img src="logo-sidebar.png" alt="GeoNusa" class="w-full h-full object-contain" onerror="this.style.display='none'"></div>
    <div class="flex flex-col"><span class="text-base font-extrabold leading-tight">Geo<span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-600">Nusa</span></span><span class="text-[10px] font-bold text-sky-800 tracking-wider uppercase">${sub}</span></div></div>
    <button onclick="toggleSidebar()" class="w-8 h-8 rounded-full bg-white/50 hover:bg-white flex items-center justify-center border border-white/70" title="Tutup Menu"><i data-lucide="x" class="w-4 h-4"></i></button></div>${html}</div><div id="resizer" class="sidebar-resizer"></div></aside>`);
  const sd = $('sidebar'), r =$('resizer'); let on = false; r.style.touchAction = 'none';
  r.addEventListener('pointerdown', e => { on = true; sd.classList.add('is-resizing'); r.setPointerCapture(e.pointerId); e.preventDefault(); });
  addEventListener('pointermove', e => { if (!on) return; const w = e.clientX - sd.getBoundingClientRect().left; if (w >= 280 && w <= innerWidth * .88) sd.style.width = w + 'px'; });
  const stop = () => { if (on) { on = false; sd.classList.remove('is-resizing'); map && map.invalidateSize(); window.onResizeEnd && onResizeEnd(); } };
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
}
function toggleSidebar() {
  const s = $('sidebar'); s.classList.toggle('collapsed');$('openMenu').classList.toggle('hidden', !s.classList.contains('collapsed')); setTimeout(() => map.invalidateSize(), 350);
}
function fitTo(b) {
  if (!b.isValid()) return; const s = $('sidebar'), w = (s.classList.contains('collapsed') || innerWidth < 640) ? 0 : s.offsetWidth + 12;
  map.fitBounds(b, { paddingTopLeft: [w + 30, 60], paddingBottomRight: [70, 40] });
}
function locateMe() { map.once('locationfound', e => map.setView(e.latlng, 14)); map.once('locationerror', () => toast('Lokasi tidak dapat diakses.', 'error')); map.locate(); }
function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-2.5489, 118.0149], 5); let bl;
  window.changeBasemap = k => { if (bl) map.removeLayer(bl); bl = L.tileLayer(BASES[k][0], { maxZoom: 19, ...(BASES[k][3] || {}) }).addTo(map); bl.bringToBack(); $('attr').textContent = BASES[k][1];$('bmModal').classList.add('hidden'); };
  const T = [['locate-fixed', 'Lokasi Saya', 'locateMe()'], ['image', 'Ganti Basemap', "$('bmModal').classList.toggle('hidden')"], ['plus', 'Perbesar', 'map.zoomIn()'], ['minus', 'Perkecil', 'map.zoomOut()'], ['help-circle', 'Bantuan & Panduan', 'showWelcome()']];
  $('mainArea').insertAdjacentHTML('beforeend', `<button id="openMenu" onclick="toggleSidebar()" class="hidden absolute top-3 left-3 z-[850] glass px-3.5 py-2.5 rounded-2xl items-center gap-2 text-xs font-bold flex"><i data-lucide="menu" class="w-4 h-4 text-primary"></i><span>Buka Menu</span></button>
   <div class="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 z-[800] glass px-4 py-2 rounded-2xl items-center gap-2 select-none pointer-events-none"><img src="logo.png" alt="GeoNusa Logo" class="w-6 h-6 object-contain" onerror="this.style.display='none'"><span class="text-xs font-extrabold text-slate-800 tracking-tight">Geo<span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-600">Nusa</span></span></div>
   <div id="attr" class="absolute bottom-1 left-1/2 -translate-x-1/2 z-[800] text-[9px] text-slate-700 bg-white/60 px-2 rounded pointer-events-none"></div>
   <div class="absolute bottom-4 right-2 sm:bottom-6 sm:right-6 z-[900] flex flex-col gap-2 items-end">${T.map(([ic, tip, fn]) => `<div class="relative group flex items-center justify-end"><span class="absolute right-14 px-2.5 py-1 bg-slate-800/90 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">${tip}</span><button onclick="${fn}" class="w-11 h-11 glass hover:bg-white rounded-xl flex items-center justify-center"><i data-lucide="${ic}" class="w-5 h-5 text-primary"></i></button></div>`).join('')}</div>
   <div id="bmModal" class="hidden absolute bottom-16 right-16 sm:bottom-20 sm:right-20 z-[950] glass p-3 rounded-2xl w-48"><div class="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2 px-1">Pilih Basemap</div><div class="grid gap-2">${Object.entries(BASES).map(([k, v]) => `<button onclick="changeBasemap('${k}')" class="px-3 py-2 rounded-xl border border-gray-200/60 text-xs font-medium text-left hover:bg-white/80">${v[2]}</button>`).join('')}</div></div>`);
  changeBasemap('street'); icons(); return map;
}
/* ---- Gaya layer & pratinjau (dipakai studio, sosmed, profil) ---- */
const lyrStyle = (c, op = .7, w = 2) => ({ color: c, fillColor: c, weight: w, opacity: Math.min(1, op + .3), fillOpacity: op * .85 });
const feats = g => g.type === 'FeatureCollection' ? g.features : g.type === 'Feature' ? [g] : [{ type: 'Feature', geometry: g }];
const colorOf = (l, f) => colorFn(l)(f);
function cnt(c) { return !c.length ? 0 : typeof c[0] === 'number' ? 1 : c.reduce((a, x) => a + cnt(x), 0); }
// Sederhanakan proporsional: tiap ring/garis minimal 4 titik, jadi poligon kecil tidak hilang
function simp(c, r) {
  if (!c.length) return c; if (typeof c[0] === 'number') return [+c[0].toFixed(5), +c[1].toFixed(5)];
  if (typeof c[0][0] === 'number') { const n = c.length, keep = Math.min(n, Math.max(4, Math.ceil(n * r))), st = (n - 1) / ((keep - 1) || 1), o = []; for (let i = 0; i < keep; i++) o.push(simp(c[Math.round(i * st)], r)); return o; }
  return c.map(x => simp(x, r));
}
// Gabungan semua layer; warna & opasitas disimpan per fitur (_c, _o); jika fitur sangat banyak, disampel per warna agar semua warna tetap ada
function makePreview(ls, maxPts = 3000, maxFeat = 800) {
  let all = []; ls.forEach(l => feats(l.geojson).forEach(f => { if (f.geometry?.coordinates?.length) all.push({ g: f.geometry, c: colorOf(l, f), o: l.opacity ?? .7 }); }));
  if (all.length > maxFeat) {
    const by = {}; all.forEach(x => (by[x.c + x.o] ||= []).push(x)); const out = [];
    Object.values(by).forEach(a => { const k = Math.max(1, Math.round(maxFeat * a.length / all.length)), s = a.length / k; for (let i = 0; i < k; i++) out.push(a[Math.floor(i * s)]); }); all = out;
  }
  const n = all.reduce((a, x) => a + cnt(x.g.coordinates), 0), r = Math.min(1, maxPts / Math.max(n, 1));
  return { type: 'FeatureCollection', v: 2, features: all.map(x => ({ type: 'Feature', properties: { _c: x.c, _o: x.o }, geometry: { type: x.g.type, coordinates: simp(x.g.coordinates, r) } })) };
}
// Aturan warna & gaya layer: DIPAKAI BERSAMA oleh Studio, halaman postingan, dan thumbnail
function colorFn(l) {
  const a = l.d ? l.d.attr : l.style_attr, cm = (l.d ? l.d.colorMap : l.style_colormap) || {}, base = l.color || '#008bb0';
  return f => a ? (cm[String(f.properties?.[a] ?? 'Lainnya')] || cm.__else || '#008bb0') : base;
}
function styledLayer(l, st, w = 2) {
  const cf = colorFn(l);
  return L.geoJSON(l.geojson, { pointToLayer: (f, ll) => L.circleMarker(ll, { radius: w > 1.6 ? 5 : 3 }), style: f => lyrStyle(cf(f), st.op, w) });
}
// Thumbnail = hasil render Leaflet (kanvas, tanpa basemap) dengan fungsi gaya yang sama dengan halaman postingan → identik
async function renderPreviewImage(ls, W = 640) {
  const ps = ls.map(l => styledLayer(l, { op: l.opacity ?? .7 }, 1.5)).filter(g => g.getLayers().length);
  if (!ps.length) return null;
  let b = L.featureGroup(ps).getBounds(); if (!b.isValid()) return null;
  if (b.getEast() - b.getWest() < 1e-4 || b.getNorth() - b.getSouth() < 1e-4) b = L.latLngBounds([b.getSouth() - .003, b.getWest() - .003], [b.getNorth() + .003, b.getEast() + .003]);
  b = b.pad(.04);
  const P = L.CRS.EPSG3857.project.bind(L.CRS.EPSG3857), nw = P(b.getNorthWest()), se = P(b.getSouthEast()), ar = (se.x - nw.x) / (nw.y - se.y);
  const w = ar >= 1 ? W : Math.max(60, Math.round(W * ar)), h = ar >= 1 ? Math.max(60, Math.round(W / ar)) : W;
  const host = document.createElement('div'); host.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px`; document.body.appendChild(host);
  try {
    const m = L.map(host, { renderer: L.canvas({ padding: 0 }), preferCanvas: true, zoomControl: false, attributionControl: false, zoomAnimation: false, fadeAnimation: false, zoomSnap: 0, maxZoom: 22 });
    m.fitBounds(b, { animate: false }); ps.forEach(g => g.addTo(m));
    await new Promise(r => { requestAnimationFrame(() => setTimeout(r, 80)); setTimeout(r, 600); });
    const cv = host.querySelector('canvas'); if (!cv) return null;
    const o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(cv, 0, 0, w, h);
    let u = o.toDataURL('image/webp', .85); if (!u.startsWith('data:image/webp')) u = o.toDataURL('image/png');
    const vb = m.getBounds(); m.remove();
    return { preview_img: u, preview_bounds: [[vb.getSouth(), vb.getWest()], [vb.getNorth(), vb.getEast()], 3] };   // elemen ke-3 = versi pembuat thumbnail
  } finally { host.remove(); }
}
// Pakai gambar tersimpan; postingan lama dibuat dari layer penuh (dan disimpan bila milik sendiri)
async function getPreview(p) {
  if (p.preview_img && p.preview_bounds?.[2] === 3) return { img: p.preview_img, bounds: p.preview_bounds.slice(0, 2) };   // thumbnail versi lama otomatis dibuat ulang
  const { data: ls } = await sb.from('spatial_layers').select('geojson,color,opacity,style_attr,style_colormap,is_visible').eq('post_id', p.id).order('sort_order');
  const pv = await renderPreviewImage((ls || []).filter(l => l.is_visible !== false).map(l => ({ geojson: l.geojson, color: l.color, opacity: l.opacity, d: { attr: l.style_attr || '', colorMap: l.style_colormap || {} } })));
  if (!pv) return null; p.preview_img = pv.preview_img; p.preview_bounds = pv.preview_bounds;
  if (user && p.user_id === user.id) sb.from('posts').update(pv).eq('id', p.id).then(() => {});
  return { img: pv.preview_img, bounds: pv.preview_bounds.slice(0, 2) };
}

/* ---- Avatar (foto profil atau inisial) ---- */
const okUrl = u => /^https?:\/\//.test(u || '');
const avatarHTML = (url, name, cls = 'w-9 h-9 text-xs') => okUrl(url)
  ? `<img src="${esc(url)}" alt="" class="${cls} rounded-full object-cover bg-slate-100 shrink-0">`
  : `<span class="${cls} rounded-full bg-primary text-white font-extrabold flex items-center justify-center shrink-0">${esc((name || 'U')[0].toUpperCase())}</span>`;
const ringAvatar = (url, name, sz = 'w-9 h-9', tx = 'text-xs') => `<span class="${sz} rounded-full p-[2px] bg-gradient-to-tr from-primary to-accent shrink-0 block">${okUrl(url)
  ? `<img src="${esc(url)}" alt="" class="w-full h-full rounded-full object-cover bg-white">`
  : `<span class="w-full h-full rounded-full bg-white flex items-center justify-center ${tx} font-extrabold text-primary">${esc((name || 'K')[0].toUpperCase())}</span>`}</span>`;

/* ---- Modal crop & navigasi bawah ala Instagram ---- */
document.body.insertAdjacentHTML('beforeend', `<div id="cropModal" class="fixed inset-0 z-[1400] hidden items-center justify-center bg-slate-900/70 p-4"><div class="bg-white rounded-3xl w-full max-w-sm p-5 space-y-3">
 <h3 class="text-sm font-extrabold text-center">Atur Foto Profil</h3><p class="text-[11px] text-slate-500 text-center">Geser untuk memosisikan, geser slider untuk zoom.</p>
 <div class="relative mx-auto w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-100 touch-none select-none"><canvas id="cropCv" width="280" height="280" class="w-[280px] h-[280px] cursor-grab"></canvas><div class="absolute inset-0 rounded-full pointer-events-none" style="box-shadow:0 0 0 999px rgba(255,255,255,.7),inset 0 0 0 2px #008bb0"></div></div>
 <input id="cropZoom" type="range" min="100" max="300" value="100" oninput="setZoom(+this.value)" class="w-full accent-primary">
 <div class="flex gap-2"><button onclick="closeCrop()" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold">Batal</button><button onclick="applyCrop()" class="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl text-xs font-bold">Terapkan</button></div></div></div>`);
(() => {
  const cv = $('cropCv'); let d = null;
  cv.onpointerdown = e => { if (!cr) return; d = { x: e.clientX, y: e.clientY, cx: cr.x, cy: cr.y }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!d || !cr) return; cr.x = d.cx + e.clientX - d.x; cr.y = d.cy + e.clientY - d.y; drawCrop(); };
  cv.onpointerup = cv.onpointercancel = () => { d = null; };
  cv.onwheel = e => { if (!cr) return; e.preventDefault(); setZoom(Math.min(300, Math.max(100, +$('cropZoom').value - e.deltaY / 4))); };
})();
function mountNav(active) {
  const it = [['home', 'Beranda', 'index.html', 'home'], ['search', 'Cari', 'index.html?cari=1', 'search'], ['plus-square', 'Buat', 'studio.html', 'studio'], ['bookmark', 'Tersimpan', 'profile.html?tab=saved', 'saved'], ['user', 'Profil', 'profile.html', 'me']];
  document.body.insertAdjacentHTML('beforeend', `<nav id="bnav" class="fixed bottom-0 inset-x-0 z-[1100] bg-white/95 backdrop-blur border-t border-slate-200" style="padding-bottom:env(safe-area-inset-bottom)"><div class="max-w-xl mx-auto flex items-center justify-around h-14">${it.map(([ic, l, href, k]) => `<a href="${href}" data-nav="${k}" class="flex flex-col items-center gap-0.5 px-3 text-[10px] font-semibold ${active === k ? 'text-primary' : 'text-slate-500 hover:text-primary'}"><i data-lucide="${ic}" class="w-6 h-6"></i><span>${l}</span></a>`).join('')}</div></nav>`);
  document.body.style.paddingBottom = '4.5rem';
  document.querySelectorAll('#bnav a').forEach(a => a.addEventListener('click', e => {
    const k = a.dataset.nav;
    if (['studio', 'saved', 'me'].includes(k) && !user) { e.preventDefault(); openAuth(); }
    else if (k === 'search' && $('q')) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); $('q').focus(); }
  })); icons();
}

/* ---- Popup atribut bergaya, mendeteksi semua layer yang tumpang tindih di titik klik ---- */
const POP = { maxWidth: 300, minWidth: 230, className: 'gp-pop', autoPanPadding: [30, 30] };
function popupHTML(hits) {   // hits: [{ name, props, c }]
  const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toLocaleString('id-ID', { maximumFractionDigits: 4 })) : String(v);
  const multi = hits.length > 1;
  const sec = h => { const rows = Object.entries(h.props || {}).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !k.startsWith('_')), more = rows.length - 14;
    return (multi ? `<div class="gp-s"><span style="background:${esc(h.c)}"></span>${esc(h.name)}</div>` : '') + (rows.slice(0, 14).map(([k, v]) => `<div class="gp-r"><span title="${esc(k)}">${esc(k)}</span><b>${esc(fmt(v))}</b></div>`).join('') || '<p class="gp-e">Tidak ada atribut.</p>') + (more > 0 ? `<p class="gp-e">+${more} atribut lainnya</p>` : ''); };
  return `<div class="gp-h">${multi ? '' : `<span style="background:${esc(hits[0].c)}"></span>`}<b>${esc(multi ? hits.length + ' layer di titik ini' : hits[0].name)}</b></div><div class="gp-b">${hits.slice(0, 6).map(sec).join('')}</div>`;
}
function polyHit(pt, g) {
  const inRing = r => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  const inPoly = rs => inRing(rs[0]) && !rs.slice(1).some(inRing);
  return g.type === 'Polygon' ? inPoly(g.coordinates) : g.type === 'MultiPolygon' ? g.coordinates.some(inPoly) : false;
}
function showFeaturePopup(m, latlng, srcs) {   // srcs: [{ name, gj, colorFor }]
  const pt = [latlng.lng, latlng.lat], hits = [];
  srcs.forEach(s => feats(s.gj).forEach(f => { if (f.geometry && polyHit(pt, f.geometry)) hits.push({ name: s.name, props: f.properties, c: s.colorFor(f) }); }));
  if (!hits.length) return false;
  L.popup(POP).setLatLng(latlng).setContent(popupHTML(hits)).openOn(m); return true;
}
/* ---- Panel "Layer & Legenda": tampil/sembunyi, kategori warna, opasitas ---- */
function layerPanel(m, ops) {   // ops: [{ lg, st:{op}, nm, on, sw:[[label,color]] }]
  const c = L.control({ position: 'bottomleft' });
  c.onAdd = () => {
    const d = L.DomUtil.create('div', 'bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-white text-[11px] w-60 max-w-[72vw] overflow-hidden');
    L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
    const open = innerWidth >= 640 || ops.length === 1;
    d.innerHTML = `<button class="w-full flex items-center justify-between px-3 py-2.5 font-extrabold text-slate-700 hover:bg-slate-50" data-t><span class="flex items-center gap-1.5"><i data-lucide="layers" class="w-4 h-4 text-primary"></i>Layer &amp; Legenda${ops.length > 1 ? ` (${ops.length})` : ''}</span><span data-ch class="transition-transform ${open ? 'rotate-180' : ''}"><i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i></span></button>
     <div data-b class="${open ? '' : 'hidden'} max-h-64 overflow-y-auto border-t border-slate-100 divide-y divide-slate-100">${ops.map((o, i) => `<div class="px-3 py-2 space-y-1.5">
      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked data-v="${i}" class="accent-primary w-3.5 h-3.5"><span class="font-bold truncate">${esc(o.nm)}</span></label>
      <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 pl-5">${o.sw.slice(0, 12).map(([v, col]) => `<div class="flex items-center gap-1.5 min-w-0"><span class="w-3 h-3 rounded-sm shrink-0" style="background:${esc(col)}"></span><span class="truncate" title="${esc(v ?? '')}">${esc(v ?? 'Warna layer')}</span></div>`).join('')}${o.sw.length > 12 ? `<span class="text-slate-400 col-span-2">+${o.sw.length - 12} kategori lain</span>` : ''}</div>
      <label class="flex items-center gap-2 pl-5 text-slate-500">Opasitas<input type="range" min="10" max="100" value="${Math.round(o.st.op * 100)}" data-o="${i}" class="flex-1 accent-primary"></label></div>`).join('')}</div>`;
    const b = d.querySelector('[data-b]'), ch = d.querySelector('[data-ch]');
    d.querySelector('[data-t]').onclick = () => { b.classList.toggle('hidden'); ch.classList.toggle('rotate-180'); };
    d.querySelectorAll('[data-v]').forEach(x => x.onchange = () => { const o = ops[x.dataset.v]; o.on = x.checked; x.checked ? m.addLayer(o.lg) : m.removeLayer(o.lg); });
    d.querySelectorAll('[data-o]').forEach(r => r.oninput = () => { const o = ops[r.dataset.o]; o.st.op = r.value / 100; o.lg.setStyle(o.lg.options.style); });
    return d;
  };
  c.addTo(m); icons();
}

/* ---- Ekspor Shapefile (ZIP) tanpa dependensi: .shp .shx .dbf .prj .cpg per layer & jenis geometri ---- */
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
  const d = new Date(), dt = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate(), tm = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1;
  files.forEach(f => {
    const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length, h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
    h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
    c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cd.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + n;
  });
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cd.reduce((a, x) => a + x.length, 0), true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
function makeShp(recs, kind) {
  const T = kind === 'point' ? 1 : kind === 'line' ? 3 : 5; let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  const upd = (a, b, c, d) => { X0 = Math.min(X0, a); Y0 = Math.min(Y0, b); X1 = Math.max(X1, c); Y1 = Math.max(Y1, d); };
  const bodies = recs.map(r => {
    if (kind === 'point') { const [x, y] = r.pt, b = new DataView(new ArrayBuffer(20)); upd(x, y, x, y); b.setInt32(0, 1, true); b.setFloat64(4, x, true); b.setFloat64(12, y, true); return b; }
    const pts = r.parts.flat(), n = pts.length, np = r.parts.length, b = new DataView(new ArrayBuffer(44 + 4 * np + 16 * n));
    let a = Infinity, c = Infinity, d = -Infinity, e = -Infinity; pts.forEach(([x, y]) => { if (x < a) a = x; if (y < c) c = y; if (x > d) d = x; if (y > e) e = y; }); upd(a, c, d, e);
    b.setInt32(0, T, true); [a, c, d, e].forEach((v, i) => b.setFloat64(4 + 8 * i, v, true)); b.setInt32(36, np, true); b.setInt32(40, n, true);
    let o = 44, idx = 0; r.parts.forEach(p => { b.setInt32(o, idx, true); o += 4; idx += p.length; });
    pts.forEach(([x, y]) => { b.setFloat64(o, x, true); b.setFloat64(o + 8, y, true); o += 16; });
    return b;
  });
  const total = 100 + bodies.reduce((a, b) => a + 8 + b.byteLength, 0), shp = new DataView(new ArrayBuffer(total)), shx = new DataView(new ArrayBuffer(100 + 8 * bodies.length));
  const hdr = (v, bytes) => { v.setInt32(0, 9994, false); v.setInt32(24, bytes / 2, false); v.setInt32(28, 1000, true); v.setInt32(32, T, true); [X0, Y0, X1, Y1].forEach((x, i) => v.setFloat64(36 + 8 * i, x, true)); };
  hdr(shp, total); hdr(shx, 100 + 8 * bodies.length);
  let off = 100; bodies.forEach((b, i) => {
    shp.setInt32(off, i + 1, false); shp.setInt32(off + 4, b.byteLength / 2, false); new Uint8Array(shp.buffer, off + 8).set(new Uint8Array(b.buffer));
    shx.setInt32(100 + 8 * i, off / 2, false); shx.setInt32(104 + 8 * i, b.byteLength / 2, false); off += 8 + b.byteLength;
  });
  return { shp: new Uint8Array(shp.buffer), shx: new Uint8Array(shx.buffer) };
}
function makeDbf(rowsIn) {
  const enc = new TextEncoder(), used = new Set(); let rows = rowsIn;
  let cols = [...new Set(rows.flatMap(r => Object.keys(r)))].map(k => { let nm = k.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 10) || 'F', i = 1; while (used.has(nm.toUpperCase())) { const s = String(i++); nm = nm.slice(0, 10 - s.length) + s; } used.add(nm.toUpperCase()); return { k, nm }; });
  if (!cols.length) { cols = [{ k: '__id', nm: 'ID' }]; rows = rows.map((_, i) => ({ __id: i + 1 })); }
  const str = v => v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  cols.forEach(c => {
    const vals = rows.map(r => r[c.k]).filter(v => v !== null && v !== undefined && v !== '');
    c.num = vals.length > 0 && vals.every(v => typeof v === 'number' && isFinite(v));
    if (c.num) {
      let dec = 0, ip = 1; vals.forEach(v => { const s = String(v); dec = Math.max(dec, s.includes('e') ? 10 : (s.split('.')[1] || '').length); ip = Math.max(ip, String(Math.floor(Math.abs(v))).length + (v < 0 ? 1 : 0)); });
      c.dec = Math.min(dec, 15); c.w = Math.min(24, ip + (c.dec ? c.dec + 1 : 0)); if (ip + (c.dec ? c.dec + 1 : 0) > 24) c.dec = Math.max(0, 24 - ip - 1); c.w = Math.max(c.w, 1);
    } else { c.w = Math.min(254, Math.max(1, ...vals.map(v => enc.encode(str(v)).length), 1)); c.dec = 0; }
  });
  const rl = 1 + cols.reduce((a, c) => a + c.w, 0), hl = 33 + 32 * cols.length, out = new Uint8Array(hl + rl * rows.length + 1), v = new DataView(out.buffer), d = new Date();
  v.setUint8(0, 3); v.setUint8(1, d.getFullYear() - 1900); v.setUint8(2, d.getMonth() + 1); v.setUint8(3, d.getDate()); v.setUint32(4, rows.length, true); v.setUint16(8, hl, true); v.setUint16(10, rl, true);
  cols.forEach((c, i) => { const o = 32 + 32 * i; out.set(enc.encode(c.nm), o); out[o + 11] = c.num ? 78 : 67; out[o + 16] = c.w; out[o + 17] = c.dec; });
  out[32 + 32 * cols.length] = 13;
  rows.forEach((r, ri) => {
    let o = hl + rl * ri; out[o++] = 32;
    cols.forEach(c => {
      const val = r[c.k]; let b;
      if (c.num) { b = enc.encode(val === null || val === undefined || val === '' ? ' '.repeat(c.w) : val.toFixed(c.dec).padStart(c.w).slice(-c.w)); }
      else { let s = str(val); b = enc.encode(s); while (b.length > c.w) { s = s.slice(0, -1); b = enc.encode(s); } }
      out.fill(32, o, o + c.w); out.set(b.subarray(0, c.w), o); o += c.w;
    });
  });
  out[out.length - 1] = 26; return out;
}
const ringArea = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
const polyParts = polys => polys.flatMap(rs => rs.map((r, i) => {   // luar = searah jarum jam, lubang = berlawanan (aturan ESRI)
  r = r.map(p => [p[0], p[1]]); const f = r[0], l = r[r.length - 1]; if (f[0] !== l[0] || f[1] !== l[1]) r.push([f[0], f[1]]);
  return (i === 0 ? ringArea(r) > 0 : ringArea(r) < 0) ? r.reverse() : r;
}));
function buildShapefileZip(ls) {
  const enc = new TextEncoder(), files = [], used = new Set();
  const PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
  ls.forEach(l => {
    const sets = { polygon: [], line: [], point: [] };
    feats(l.geojson).forEach(f => {
      const g = f.geometry, props = f.properties || {}; if (!g?.coordinates?.length) return;
      if (g.type === 'Polygon' || g.type === 'MultiPolygon') sets.polygon.push({ props, parts: polyParts(g.type === 'Polygon' ? [g.coordinates] : g.coordinates) });
      else if (g.type === 'LineString' || g.type === 'MultiLineString') sets.line.push({ props, parts: g.type === 'LineString' ? [g.coordinates] : g.coordinates });
      else if (g.type === 'Point') sets.point.push({ props, pt: g.coordinates });
      else if (g.type === 'MultiPoint') g.coordinates.forEach(p => sets.point.push({ props, pt: p }));
    });
    const kinds = Object.keys(sets).filter(k => sets[k].length), base = String(l.name || 'layer').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'layer';
    kinds.forEach(k => {
      let nm = kinds.length > 1 ? `${base}_${k}` : base, i = 1; while (used.has(nm.toLowerCase())) nm = `${base}_${k}_${++i}`; used.add(nm.toLowerCase());
      const { shp, shx } = makeShp(sets[k], k);
      files.push({ name: nm + '.shp', data: shp }, { name: nm + '.shx', data: shx }, { name: nm + '.dbf', data: makeDbf(sets[k].map(r => r.props)) }, { name: nm + '.prj', data: enc.encode(PRJ) }, { name: nm + '.cpg', data: enc.encode('UTF-8') });
    });
  });
  if (!files.length) throw new Error('Tidak ada geometri yang dapat diekspor.');
  return zipStore(files);
}
// Unduh postingan sebagai ZIP Shapefile (satu set berkas per layer & jenis geometri), WGS84
async function downloadPostZip(id) {
  const { data, error } = await sb.from('posts').select('title,allow_download,spatial_layers(name,geojson,sort_order,is_visible)').eq('id', id).single();
  const ls = (data?.spatial_layers || []).filter(l => l.is_visible !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (error || !data?.allow_download || !ls.length) return toast('Peta ini tidak dapat diunduh.', 'error');
  try {
    const blob = buildShapefileZip(ls), a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (String(data.title).replace(/[^\w\- ]+/g, '_').trim() || 'peta') + '.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); toast('Mengunduh ZIP Shapefile…', 'ok');
  } catch (e) { console.error(e); toast('Gagal membuat Shapefile: ' + e.message, 'error'); }
}
