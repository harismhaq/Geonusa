  /* ==========================================================================
    GeoNusa — Layers & Hub Manager (alat-layers.js)
    ==========================================================================*/

  const hubLayersMap = new Map();
  const hubLayerNames = new Map();

  function switchSidebarTab(tab) {
    const geoDiv = document.getElementById('sidebar-geoportal');
    const sdaDiv = document.getElementById('sidebar-sda');
    const kehutananDiv = document.getElementById('sidebar-kehutanan');
    const cuacaDiv = document.getElementById('sidebar-cuaca');
    const perizinanDiv = document.getElementById('sidebar-perizinan');
    const batasDiv = document.getElementById('sidebar-batas');
    const transDiv = document.getElementById('sidebar-transmigrasi');
    const bencanaDiv = document.getElementById('sidebar-kebencanaan');
    const saranaDiv = document.getElementById('sidebar-sarana');
    const toolDiv = document.getElementById('sidebar-tools');
    
    const tabs = ['tab-geoportal', 'tab-sda', 'tab-kehutanan', 'tab-cuaca', 'tab-perizinan', 'tab-batas', 'tab-transmigrasi', 'tab-kebencanaan', 'tab-sarana', 'tab-tools'];
    const divs = [geoDiv, sdaDiv, kehutananDiv, cuacaDiv, perizinanDiv, batasDiv, transDiv, bencanaDiv, saranaDiv, toolDiv];

    divs.forEach(d => { if (d) d.classList.add('hidden'); });

    const inactiveClass = "px-3 py-2 font-semibold rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/40 transition-all flex items-center gap-1.5 shrink-0 group cursor-pointer";
    const activeClass = "px-3 py-2 font-bold rounded-xl text-primary bg-white/85 shadow-xs border border-white/80 transition-all flex items-center gap-1.5 shrink-0 group cursor-pointer";

    tabs.forEach(tId => {
      const el = document.getElementById(tId);
      if (el) el.className = inactiveClass;
    });

    const activeTabMap = {
      'geoportal': { div: geoDiv, btn: 'tab-geoportal' },
      'sda': { div: sdaDiv, btn: 'tab-sda' },
      'kehutanan': { div: kehutananDiv, btn: 'tab-kehutanan' },
      'cuaca': { div: cuacaDiv, btn: 'tab-cuaca' },
      'perizinan': { div: perizinanDiv, btn: 'tab-perizinan' },
      'batas': { div: batasDiv, btn: 'tab-batas' },
      'transmigrasi': { div: transDiv, btn: 'tab-transmigrasi' },
      'kebencanaan': { div: bencanaDiv, btn: 'tab-kebencanaan' },
      'sarana': { div: saranaDiv, btn: 'tab-sarana' },
      'tools': { div: toolDiv, btn: 'tab-tools' }
    };

    if (activeTabMap[tab]) {
      if (activeTabMap[tab].div) {
        activeTabMap[tab].div.classList.remove('hidden');
        activeTabMap[tab].div.classList.add('flex');
      }
      const btnEl = document.getElementById(activeTabMap[tab].btn);
      if (btnEl) btnEl.className = activeClass;
    }
  }

  function renderSdaHubList() {
    const container = document.getElementById('sda-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2">
        <input type="text" placeholder="Cari layer SDA & Lingkungan..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterSdaLayers(this.value)" />
      </div>
      <div id="sda-layers-list" class="space-y-1 px-1">
        ${SDA_LAYERS.map(l => `
          <label class="sda-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="sda_${l.id}" onchange="toggleHubLayer('sda', '${l.id}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer shrink-0" />
            <i data-lucide="trees" class="w-3.5 h-3.5 text-primary shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterSdaLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.sda-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderBatasHubList() {
    const container = document.getElementById('batas-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2">
        <input type="text" placeholder="Cari layer batas wilayah..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterBatasLayers(this.value)" />
      </div>
      <div id="batas-layers-list" class="space-y-1 px-1">
        ${BATAS_LAYERS.map(l => `
          <label class="batas-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="batas_${l.id}" onchange="toggleHubLayer('batas', '${l.id}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer shrink-0" />
            <i data-lucide="map" class="w-3.5 h-3.5 text-primary shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterBatasLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.batas-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderTransmigrasiHubList() {
    const container = document.getElementById('transmigrasi-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2">
        <input type="text" placeholder="Cari layer kawasan khusus..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterTransLayers(this.value)" />
      </div>
      <div id="trans-layers-list" class="space-y-1 px-1">
        ${TRANSMIGRASI_LAYERS.map(l => `
          <label class="trans-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="transmigrasi_${l.id}" onchange="toggleHubLayer('transmigrasi', '${l.id}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer shrink-0" />
            <i data-lucide="home" class="w-3.5 h-3.5 text-primary shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterTransLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.trans-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderKebencanaanHubList() {
    const container = document.getElementById('kebencanaan-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2">
        <input type="text" placeholder="Cari layer kebencanaan..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterBencanaLayers(this.value)" />
      </div>
      <div id="bencana-layers-list" class="space-y-1 px-1">
        ${KEBENCANAAN_LAYERS.map(l => `
          <label class="bencana-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="bencana_${l.id}" onchange="toggleHubLayer('bencana', '${l.id}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer shrink-0" />
            <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-rose-500 shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterBencanaLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.bencana-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderKehutananHubList() {
    const container = document.getElementById('kehutanan-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2 flex gap-1.5">
        <input type="text" placeholder="Cari layer kehutanan..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterKehutananLayers(this.value)" />
        <button onclick="promptAddLayer('kehutanan')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer" title="Tambah Link Layer Baru">
          <i data-lucide="plus" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="kehutanan-layers-list" class="space-y-1 px-1">
        ${KEHUTANAN_LAYERS.map(l => `
          <label class="kehutanan-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="kehutanan_${l.id}" onchange="toggleHubLayer('kehutanan', '${l.id}', this.checked)" class="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0" />
            <i data-lucide="trees" class="w-3.5 h-3.5 text-green-600 shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterKehutananLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.kehutanan-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderPerizinanHubList() {
    const container = document.getElementById('perizinan-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2 flex gap-1.5">
        <input type="text" placeholder="Cari layer perizinan..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterPerizinanLayers(this.value)" />
        <button onclick="promptAddLayer('perizinan')" class="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer" title="Tambah Link Layer Baru">
          <i data-lucide="plus" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="perizinan-layers-list" class="space-y-1 px-1">
        ${PERIZINAN_PERTANAHAN_LAYERS.map(l => `
          <label class="perizinan-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="perizinan_${l.id}" onchange="toggleHubLayer('perizinan', '${l.id}', this.checked)" class="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0" />
            <i data-lucide="file-check" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterPerizinanLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.perizinan-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function renderSaranaHubList() {
    const container = document.getElementById('sarana-hub-tree');
    if (!container) return;

    container.innerHTML = `
      <div class="px-1 pb-2 flex gap-1.5">
        <input type="text" placeholder="Cari layer sarana..." class="w-full px-3 py-2 text-xs border border-white/60 rounded-xl bg-white/40 focus:bg-white/80 focus:border-primary outline-none transition-all shadow-inner" oninput="filterSaranaLayers(this.value)" />
        <button onclick="promptAddLayer('sarana')" class="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer" title="Tambah Link Layer Baru">
          <i data-lucide="plus" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="sarana-layers-list" class="space-y-1 px-1">
        ${SARANA_PRASARANA_LAYERS.map(l => `
          <label class="sarana-layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.name)}">
            <input type="checkbox" data-hub-key="sarana_${l.id}" onchange="toggleHubLayer('sarana', '${l.id}', this.checked)" class="w-4 h-4 accent-cyan-600 rounded cursor-pointer shrink-0" />
            <i data-lucide="building-2" class="w-3.5 h-3.5 text-cyan-600 shrink-0"></i>
            <span class="text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(l.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function filterSaranaLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.sarana-layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function promptAddLayer(category) {
    const name = prompt("Masukkan nama layer peta:");
    if (!name || !name.trim()) return;
    const url = prompt("Masukkan URL / link peta (ArcGIS REST / WMS / Tile / GeoJSON):");
    if (!url || !url.trim()) return;

    const newId = 'custom_' + Date.now();
    const newLayer = { id: newId, name: name.trim(), url: url.trim(), type: 'Custom' };

    if (category === 'kehutanan') {
      KEHUTANAN_LAYERS.push(newLayer);
      renderKehutananHubList();
    } else if (category === 'perizinan') {
      PERIZINAN_PERTANAHAN_LAYERS.push(newLayer);
      renderPerizinanHubList();
    } else if (category === 'sarana') {
      SARANA_PRASARANA_LAYERS.push(newLayer);
      renderSaranaHubList();
    }
    showToast(`Layer "${name}" berhasil ditambahkan ke menu!`);
  }

  function normalizeArcGISMapServerUrl(url) {
    if (!url) return '';
    let cleaned = String(url).split('?')[0].trim().replace(/\/+$/, '');
    if (!cleaned) return '';
    if (/\/MapServer\/\d+$/i.test(cleaned)) {
      return cleaned.replace(/\/MapServer\/\d+$/i, '/MapServer');
    }
    return cleaned;
  }

  function buildArcGISExportUrl(serviceRootUrl, layerId, bbox) {
    const root = normalizeArcGISMapServerUrl(serviceRootUrl);
    if (!root) return '';
    const layerFilter = Number.isFinite(Number(layerId)) ? `&layers=show:${layerId}` : '';
    return `${root}/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=256,256&format=png32&transparent=true&f=image${layerFilter}`;
  }

  function resolveArcGISHubLayerMeta(category, typeOrId) {
    let listObj = null;
    let serviceRoot = '';
    let isDirect = false;

    if (category === 'sda') listObj = SDA_LAYERS;
    else if (category === 'kehutanan') listObj = KEHUTANAN_LAYERS;
    else if (category === 'perizinan') listObj = PERIZINAN_PERTANAHAN_LAYERS;
    else if (category === 'batas') listObj = BATAS_LAYERS;
    else if (category === 'transmigrasi') listObj = TRANSMIGRASI_LAYERS;
    else if (category === 'bencana') listObj = KEBENCANAAN_LAYERS;
    else if (category === 'sarana') listObj = SARANA_PRASARANA_LAYERS;

    if (!listObj) return null;
    const found = listObj.find(l => String(l.id) === String(typeOrId));
    if (!found) return null;

    if (category === 'sda') {
      if (String(typeOrId).startsWith('simontana_')) {
        return { serviceRoot: normalizeArcGISMapServerUrl(found.url), layerId: null, displayName: found.name, isDirect: true };
      }
      serviceRoot = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer';
    } else if (category === 'batas') {
      serviceRoot = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer';
    } else if (category === 'transmigrasi') {
      serviceRoot = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KAWASAN_KHUSUS_DAN_TRANSMIGRASI/MapServer';
    } else {
      serviceRoot = normalizeArcGISMapServerUrl(found.url);
    }

    return {
      serviceRoot: serviceRoot,
      layerId: category === 'bencana' ? 0 : found.id,
      displayName: found.name,
      isDirect: isDirect
    };
  }

  function toggleHubLayer(category, typeOrId, visible) {
    showLoading();
    try {
      const layerMeta = resolveArcGISHubLayerMeta(category, typeOrId);
      if (!layerMeta) return;

      const { serviceRoot, layerId, displayName, isDirect } = layerMeta;
      const mapServerUrl = normalizeArcGISMapServerUrl(serviceRoot);
      const layerKey = `${category}_${typeOrId}`;
      hubLayerNames.set(layerKey, displayName);

      if (!layerColors.has(layerKey)) layerColors.set(layerKey, '#008bb0');
      if (!layerOpacities.has(layerKey)) layerOpacities.set(layerKey, 0.8);

      let targetLayer = hubLayersMap.get(layerKey);

      if (!targetLayer) {
        if (isDirect && serviceRoot.toLowerCase().includes('/wms')) {
          targetLayer = L.tileLayer.wms(serviceRoot.split('?')[0], {
            layers: '0', format: 'image/png', transparent: true, opacity: layerOpacities.get(layerKey)
          });
        } else {
          targetLayer = L.tileLayer('https://example.invalid/blank/{z}/{y}/{x}', {
            attribution: '&copy; GeoNusa Layers', maxZoom: 18, transparent: true, opacity: layerOpacities.get(layerKey)
          });
          targetLayer.getTileUrl = function (coords) {
            const z = coords.z;
            const tileSize = 256;
            const min = map.unproject([coords.x * tileSize, (coords.y + 1) * tileSize], z);
            const max = map.unproject([(coords.x + 1) * tileSize, coords.y * tileSize], z);
            const bbox = `${min.lng},${min.lat},${max.lng},${max.lat}`;
            return buildArcGISExportUrl(mapServerUrl, layerId, bbox);
          };
        }
        hubLayersMap.set(layerKey, targetLayer);
      }

      if (visible) {
        targetLayer.addTo(map);
        if (!activeLayerKeysOrder.includes(layerKey)) activeLayerKeysOrder.unshift(layerKey);
        reorderMapLayers();
        showToast('Layer berhasil diaktifkan!');
      } else {
        if (map.hasLayer(targetLayer)) map.removeLayer(targetLayer);
        activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== layerKey);
        showToast('Layer dinonaktifkan.');
      }
      updateLegendEditor();
    } catch (err) {
      showToast('Gagal memuat layer.');
    } finally {
      hideLoading();
    }
  }

  async function fetchAllGeoportalCollections() {
    showLoading();
    const container = document.getElementById('layer-tree');
    if (!container) return;

    container.innerHTML = GEOPORTAL_SERVERS.map(s => `
      <div class="layer-folder border-b border-slate-100 py-1" id="folder_wrapper_${s.id}">
        <div class="folder-header opacity-75 py-2 px-1 rounded-lg">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-primary shrink-0"></i>
          <span class="folder-name font-bold text-slate-700 text-xs">${escapeBMKGHTML(s.name)}</span>
          <span class="text-[9px] bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded-full">Memuat...</span>
        </div>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();

    const fetchPromises = GEOPORTAL_SERVERS.map(async (server) => {
      const wrapper = document.getElementById(`folder_wrapper_${server.id}`);
      try {
        const baseUrl = server.url.includes('?') ? server.url + '&' : server.url + '?';
        const capsUrl = `${baseUrl}service=WMS&version=1.1.1&request=GetCapabilities`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await geoFetch(capsUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xmlText = await res.text();
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        const layerElements = doc.querySelectorAll('Capability > Layer > Layer');

        let layersList = [];
        layerElements.forEach(el => {
          const nameEl = el.querySelector('Name');
          const titleEl = el.querySelector('Title');
          if (nameEl && titleEl) {
            layersList.push({ name: nameEl.textContent.trim(), title: titleEl.textContent.trim() });
          }
        });

        if (wrapper) {
          wrapper.innerHTML = `
            <div class="folder-header py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" onclick="toggleFolder('folder_${server.id}')">
              <i data-lucide="chevron-right" class="folder-chevron w-4 h-4 text-slate-500"></i>
              <i data-lucide="folder" class="folder-icon opened w-4 h-4 text-primary"></i>
              <span class="folder-name font-bold text-slate-800 text-xs truncate flex-1">${escapeBMKGHTML(server.name)}</span>
              <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold">${layersList.length}</span>
            </div>
            <div class="folder-children pl-4 space-y-1 mt-1" id="children-folder_${server.id}">
              ${layersList.length === 0 ? '<div class="px-2 py-1 text-[11px] text-slate-400 italic">Tidak ada layer.</div>' : 
                layersList.map(l => `
                <label class="layer-item flex items-center gap-2.5 py-2 px-1 hover:bg-white/30 rounded-lg cursor-pointer transition-all" title="${escapeBMKGHTML(l.title)}">
                  <input type="checkbox" data-layer-id="${l.name}" onchange="toggleGeoportalLayer('${l.name}', this.checked, '${server.url}', '${server.id}')" class="w-4 h-4 accent-primary rounded cursor-pointer shrink-0" />
                  <i data-lucide="map" class="w-3.5 h-3.5 text-primary shrink-0"></i>
                  <span class="layer-name text-xs font-bold text-slate-700 truncate flex-1">${escapeBMKGHTML(resolveGeoportalLayerName(l.title))}</span>
                </label>
              `).join('')}
            </div>
          `;
        }
      } catch (err) {
        if (wrapper) {
          wrapper.innerHTML = `
            <div class="folder-header opacity-75 py-2 px-1 rounded-lg">
              <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500 shrink-0"></i>
              <span class="folder-name font-bold text-slate-600 text-xs">${escapeBMKGHTML(server.name)}</span>
              <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Offline</span>
            </div>
          `;
        }
      } finally {
        if (window.lucide) lucide.createIcons();
      }
    });

    hideLoading();
    await Promise.allSettled(fetchPromises);
  }

  function toggleFolder(id) {
    const children = document.getElementById('children-' + id);
    const header = children ? children.previousElementSibling : null;
    if (children) children.classList.toggle('expanded');
    if (header) header.classList.toggle('expanded');
  }

  async function loadGeoportalVectorLayer(layerName, wmsUrl, initialColor = '#008bb0', initialOpacity = 0.35) {
    const wfsUrl = wfsUrlFromWmsUrl(wmsUrl);
    const cleanDisplayName = resolveGeoportalLayerName(layerName);

    try {
      const fetchUrl = `${wfsUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=${encodeURIComponent(layerName)}&outputFormat=application/json&srsName=EPSG:4326`;
      const res = await geoFetch(fetchUrl);
      
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();

        if (!text.trim().startsWith('<?xml') && (contentType.includes('json') || text.trim().startsWith('{'))) {
          const data = JSON.parse(text);
          if (data && data.features && data.features.length) {
            return L.geoJSON(data, {
              style: function() { return { color: initialColor, weight: 1.8, opacity: 0.9, fillColor: initialColor, fillOpacity: initialOpacity }; },
              pointToLayer: function(feature, latlng) { return L.circleMarker(latlng, { radius: 6, color: initialColor, weight: 1.5, opacity: 0.9, fillColor: initialColor, fillOpacity: initialOpacity }); },
              onEachFeature: function(feature, layer) {
                if (feature.properties) {
                  let rows = '';
                  for (const [k, v] of Object.entries(feature.properties)) {
                    if (v !== null && v !== undefined && v !== '') {
                      rows += `<tr><td class="font-semibold text-slate-500 pr-2 py-0.5">${escapeBMKGHTML(k)}</td><td class="text-slate-800 py-0.5">${escapeBMKGHTML(v)}</td></tr>`;
                    }
                  }
                  layer.bindPopup(`<div class="p-1"><strong class="text-xs text-primary block border-b pb-1 mb-1">${escapeBMKGHTML(cleanDisplayName)}</strong><table class="text-[11px] w-full">${rows}</table></div>`);
                }
              }
            });
          }
        }
      }
    } catch (err) {}

    return L.tileLayer.wms(wmsUrl.split('?')[0], {
      layers: layerName, format: 'image/png', transparent: true, version: '1.1.1', opacity: initialOpacity > 0 ? initialOpacity + 0.3 : 0.8
    });
  }

  async function toggleGeoportalLayer(layerName, visible, wmsUrl, serverId) {
    const cacheKey = `${wmsUrl}::${layerName}`;
    const layer = geoportalLayers.get(cacheKey);

    if (!layer) {
      if (!visible) return;
      showLoading();
      try {
        const currentColor = layerColors.get(cacheKey) || '#008bb0';
        const currentOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;
        
        const vLayer = await loadGeoportalVectorLayer(layerName, wmsUrl, currentColor, currentOpacity);
        if (vLayer) {
          geoportalLayers.set(cacheKey, vLayer);
          if (!layerColors.has(cacheKey)) layerColors.set(cacheKey, currentColor);
          if (!layerOpacities.has(cacheKey)) layerOpacities.set(cacheKey, currentOpacity);

          if (!activeLayerKeysOrder.includes(cacheKey)) activeLayerKeysOrder.unshift(cacheKey);
          vLayer.addTo(map);
          reorderMapLayers();

          let hasFlown = false;
          if (typeof vLayer.getBounds === 'function') {
            try {
              const bounds = vLayer.getBounds();
              if (bounds && bounds.isValid()) {
                map.flyToBounds(bounds.pad(0.12), { maxZoom: 16, duration: 0.8 });
                hasFlown = true;
              }
            } catch(e) {}
          }
          if (!hasFlown && serverId && REGION_CENTER_FALLBACKS[serverId]) {
            const [fallbackLat, fallbackLng, fallbackZoom] = REGION_CENTER_FALLBACKS[serverId];
            map.setView([fallbackLat, fallbackLng], fallbackZoom, { animate: true });
          }
          showToast(`Layer "${resolveGeoportalLayerName(layerName)}" dimuat!`);
        }
      } catch (err) {
        showToast("Gagal memuat layer.");
      } finally {
        hideLoading();
        updateLegendEditor();
      }
      return;
    }

    if (visible) {
      if (!map.hasLayer(layer)) layer.addTo(map);
      if (!activeLayerKeysOrder.includes(cacheKey)) activeLayerKeysOrder.unshift(cacheKey);
      reorderMapLayers();
    } else {
      map.removeLayer(layer);
      activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== cacheKey);
    }
    updateLegendEditor();
  }

  function filterLayers(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.layer-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }