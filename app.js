/* ==========================================================================
   GeoNusa — WebGIS Geografi Nusantara
   Application Logic (Independent Streaming Fetch & Smart WMS Fallback)
   ==========================================================================*/

let map;
let currentBasemapLayer;
let currentBasemapName = 'Satelit';
const geoportalLayers = new Map();           // cacheKey -> L.Layer
const layerColors = new Map();               // cacheKey -> hexColor String
const layerOpacities = new Map();            // cacheKey -> opacity Number (0-1)
let activeLayerKeysOrder = [];               // Array penampung urutan z-index layer

const PONTIANAK_CENTER = [-0.0263, 109.3425];
const DEFAULT_ZOOM = 6;

// Daftar Koleksi Geoportal
const GEOPORTAL_SERVERS = [
  {
    id: 'ptk',
    name: 'Geoportal Kota Pontianak',
    url: 'https://geoportal.pontianak.go.id/geoserver/ows'
  },
  {
    id: 'kalbar',
    name: 'Satu Peta Prov. Kalbar',
    url: 'https://satupeta.kalbarprov.go.id/geoserver/ows'
  },
  {
    id: 'kaltimprov',
    name: 'JIGD Prov. Kalimantan Timur',
    url: 'https://jigd.kaltimprov.go.id/geoserver/ows'
  },
  {
    id: 'kotimkab',
    name: 'Geoportal Kab. Kotawaringin Timur',
    url: 'https://geoportal.kotimkab.go.id/geoserver/wms'
  },
  {
    id: 'mahakamulu',
    name: 'Geoportal Kab. Mahakam Ulu',
    url: 'https://geoserver-geoportal.mahakamulukab.go.id/geoserver/wms'
  },
  {
    id: 'sumbar',
    name: 'Geoportal Prov. Sumatera Barat',
    url: 'https://geoportal.sumbarprov.go.id/geoserver/wms'
  },
  {
    id: 'bengkuluprov',
    name: 'Geoportal Prov. Bengkulu',
    url: 'https://geo.bengkuluprov.go.id/geoserver/palapa/ows'
  },
  {
    id: 'jateng',
    name: 'Satu Peta Prov. Jawa Tengah',
    url: 'https://satupeta.jatengprov.go.id/geoserver/palapa/wms'
  },
  {
    id: 'magelangkab',
    name: 'Geoportal Kab. Magelang',
    url: 'https://geoportal.magelangkab.go.id/geoserver/ows'
  },
  {
    id: 'magelangkota',
    name: 'Geoportal Kota Magelang',
    url: 'https://geoportal.magelangkota.go.id/geoserver/ows'
  },
  {
    id: 'klatenkab',
    name: 'Geoportal Kab. Klaten',
    url: 'https://geoportal.klaten.go.id/geoserver/wms'
  },
  {
    id: 'mojokertokota',
    name: 'Geoportal Kota Mojokerto',
    url: 'https://geoportal.mojokertokota.go.id/geoserver/ows'
  },
  {
    id: 'bandungkota',
    name: 'Geoportal Kota Bandung',
    url: 'https://geodata.bandung.go.id/geoserver/ows'
  },
  {
    id: 'jogjakota',
    name: 'Geoportal Kota Yogyakarta',
    url: 'https://geoportal.jogjakota.go.id/geoserver/ows'
  }
];

// Direct Fetch murni tanpa proxy
function geoFetch(targetUrl, init) {
  return fetch(targetUrl, init);
}

// Menghapus prefix geonode: dari nama layer
function resolveGeoportalLayerName(layerName) {
  if (layerName && layerName.startsWith('geonode:')) {
    return layerName.slice(8);
  }
  return layerName || '';
}

function wfsUrlFromWmsUrl(wmsUrl) {
  let cleanUrl = wmsUrl.split('?')[0];
  if (/\/wms\/?$/i.test(cleanUrl)) return cleanUrl.replace(/\/wms\/?$/i, '/wfs');
  if (/\/ows\/?$/i.test(cleanUrl)) return cleanUrl.replace(/\/ows\/?$/i, '/wfs');
  return cleanUrl;
}

function escapeBMKGHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

// Convert Hex & Opacity to RGBA
function hexToRgba(hex, opacity) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`;
}

// Basemap List
const BASEMAPS = {
  satellite: {
    name: 'Satelit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { attribution: '&copy; Esri &mdash; World Imagery', maxZoom: 18 }
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }
  },
  positron: {
    name: 'Light Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: { attribution: '&copy; CARTO &copy; OSM', maxZoom: 20 }
  },
  dark: {
    name: 'Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { attribution: '&copy; CARTO &copy; OSM', maxZoom: 20 }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    initMap();
    
    setTimeout(() => {
      hideSplashScreen();
    }, 500);

    fetchAllGeoportalCollections();
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
});

function hideSplashScreen() {
  const splash = document.getElementById('app-splash-screen');
  const modal = document.getElementById('welcome-modal');

  if (splash && splash.style.display !== 'none') {
    splash.classList.add('splash-hidden');
    setTimeout(() => {
      splash.style.display = 'none';

      if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      }
    }, 400);
  }
}

function closeWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

function initMap() {
  map = L.map('map', {
    center: PONTIANAK_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
    attributionControl: true
  });

  changeBasemap('satellite');
  L.control.zoom({ position: 'bottomright' }).addTo(map);
}

function changeBasemap(key) {
  if (currentBasemapLayer) map.removeLayer(currentBasemapLayer);
  const bm = BASEMAPS[key];
  currentBasemapName = bm.name;
  currentBasemapLayer = L.tileLayer(bm.url, bm.options).addTo(map);

  document.querySelectorAll('.basemap-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.basemap === key);
  });
}

function switchSidebarTab(tab) {
  const geoDiv = document.getElementById('sidebar-geoportal');
  const toolDiv = document.getElementById('sidebar-tools');
  const tabGeo = document.getElementById('tab-geoportal');
  const tabTool = document.getElementById('tab-tools');

  if (tab === 'geoportal') {
    geoDiv.classList.remove('hidden');
    toolDiv.classList.add('hidden');
    tabGeo.className = "flex-1 py-2 text-xs font-semibold rounded-md text-primary bg-white shadow-sm flex items-center justify-center gap-1.5";
    tabTool.className = "flex-1 py-2 text-xs font-semibold rounded-md text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5";
  } else {
    toolDiv.classList.remove('hidden');
    geoDiv.classList.add('hidden');
    tabTool.className = "flex-1 py-2 text-xs font-semibold rounded-md text-primary bg-white shadow-sm flex items-center justify-center gap-1.5";
    tabGeo.className = "flex-1 py-2 text-xs font-semibold rounded-md text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5";
  }
}

// ─── STREAMING FETCH: TAMPIL BERTAHAP TANPA MENUNGGU SERVER LAIN ───────────────
async function fetchAllGeoportalCollections() {
  showLoading();
  const container = document.getElementById('layer-tree');
  if (!container) return;

  container.innerHTML = GEOPORTAL_SERVERS.map(s => `
    <div class="layer-folder border-b border-slate-100 py-1" id="folder_wrapper_${s.id}">
      <div class="folder-header opacity-75">
        <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-primary shrink-0"></i>
        <span class="folder-name font-semibold text-slate-700">${escapeBMKGHTML(s.name)}</span>
        <span class="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          Memuat data...
        </span>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();

  let totalLayersAccumulated = 0;

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
          layersList.push({
            name: nameEl.textContent.trim(),
            title: titleEl.textContent.trim()
          });
        }
      });

      totalLayersAccumulated += layersList.length;

      if (wrapper) {
        wrapper.innerHTML = `
          <div class="folder-header" onclick="toggleFolder('folder_${server.id}')">
            <i data-lucide="chevron-right" class="folder-chevron"></i>
            <i data-lucide="folder" class="folder-icon opened"></i>
            <span class="folder-name font-bold text-slate-800">${escapeBMKGHTML(server.name)}</span>
            <span class="folder-badge">${layersList.length}</span>
          </div>
          <div class="folder-children" id="children-folder_${server.id}">
            ${layersList.length === 0 ? '<div class="px-3 py-1 text-[11px] text-slate-400 italic">Tidak ada layer tersedia.</div>' : 
              layersList.map(l => `
              <label class="layer-item" title="${escapeBMKGHTML(l.title)}">
                <input type="checkbox" data-layer-id="${l.name}" onchange="toggleGeoportalLayer('${l.name}', this.checked, '${server.url}')" />
                <i data-lucide="map" class="layer-icon"></i>
                <span class="layer-name">${escapeBMKGHTML(resolveGeoportalLayerName(l.title))}</span>
              </label>
            `).join('')}
          </div>
        `;
      }
    } catch (err) {
      console.warn(`Timeout / Error [${server.name}]:`, err);
      if (wrapper) {
        wrapper.innerHTML = `
          <div class="folder-header opacity-75">
            <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500 shrink-0"></i>
            <span class="folder-name font-semibold text-slate-600">${escapeBMKGHTML(server.name)}</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Offline / CORS</span>
          </div>
        `;
      }
    } finally {
      if (window.lucide) lucide.createIcons();
    }
  });

  hideLoading();
  await Promise.allSettled(fetchPromises);
  showToast("Seluruh Geoportal selesai dikoneksikan!");
}

function toggleFolder(id) {
  const children = document.getElementById('children-' + id);
  const header = children ? children.previousElementSibling : null;
  if (children) children.classList.toggle('expanded');
  if (header) header.classList.toggle('expanded');
}

// ─── LOAD DATA VEKTOR DENGAN FALLBACK AUTOMATIC WMS TILE + BOUNDS ───────────────
async function loadGeoportalVectorLayer(layerName, wmsUrl, initialColor = '#008bb0', initialOpacity = 0.35) {
  const wfsUrl = wfsUrlFromWmsUrl(wmsUrl);
  const cleanDisplayName = resolveGeoportalLayerName(layerName);

  // 1. Coba Tarik Vektor WFS GeoJSON
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
            style: function() {
              return {
                color: initialColor,
                weight: 1.8,
                opacity: 0.9,
                fillColor: initialColor,
                fillOpacity: initialOpacity
              };
            },
            pointToLayer: function(feature, latlng) {
              return L.circleMarker(latlng, {
                radius: 6,
                color: initialColor,
                weight: 1.5,
                opacity: 0.9,
                fillColor: initialColor,
                fillOpacity: initialOpacity
              });
            },
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
  } catch (err) {
    console.warn(`WFS GeoJSON tidak didukung untuk [${layerName}], beralih ke WMS Tile...`);
  }

  // 2. Fallback WMS Tile Layer
  const cleanWmsBase = wmsUrl.split('?')[0];
  const wmsTileLayer = L.tileLayer.wms(cleanWmsBase, {
    layers: layerName,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    opacity: initialOpacity > 0 ? initialOpacity + 0.3 : 0.8
  });

  // Penanganan BBOX / Bounds khusus WMS Tile agar auto-zoom tetap bekerja
  if (wmsUrl.includes('kotimkab.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-3.30, 112.30], [-1.20, 113.30]); // BBOX Kab. Kotawaringin Timur
    };
  } else if (wmsUrl.includes('kaltimprov.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-2.50, 113.80], [2.50, 119.00]); // BBOX Prov. Kalimantan Timur
    };
  } else if (wmsUrl.includes('mahakamulukab.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([0.00, 113.80], [1.80, 115.80]); // BBOX Kab. Mahakam Ulu
    };
  } else if (wmsUrl.includes('bengkuluprov.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-5.50, 101.00], [-2.20, 103.80]); // BBOX Prov. Bengkulu
    };
  } else if (wmsUrl.includes('sumbarprov.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-3.50, 98.50], [0.95, 101.90]); // BBOX Prov. Sumatera Barat
    };
  } else if (wmsUrl.includes('bandung.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-6.97, 107.54], [-6.84, 107.72]); // BBOX Kota Bandung
    };
  } else if (wmsUrl.includes('mojokertokota.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-7.49, 112.41], [-7.44, 112.46]); // BBOX Kota Mojokerto
    };
  } else if (wmsUrl.includes('klaten.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-7.80, 110.50], [-7.55, 110.75]); // BBOX Kab. Klaten
    };
  } else if (wmsUrl.includes('magelangkota.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-7.50, 110.20], [-7.45, 110.25]); // BBOX Kota Magelang
    };
  } else if (wmsUrl.includes('magelangkab.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-7.62, 110.05], [-7.32, 110.42]); // BBOX Kab. Magelang
    };
  } else if (wmsUrl.includes('jogjakota.go.id')) {
    wmsTileLayer.getBounds = function() {
      return L.latLngBounds([-7.835, 110.345], [-7.765, 110.405]); // BBOX Kota Yogyakarta
    };
  }

  return wmsTileLayer;
}

// ─── TOGGLE LAYER ─────────────────────────────────────────────────────────────
async function toggleGeoportalLayer(layerName, visible, wmsUrl) {
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

        if (!activeLayerKeysOrder.includes(cacheKey)) {
          activeLayerKeysOrder.unshift(cacheKey);
        }

        vLayer.addTo(map);
        reorderMapLayers();

        if (typeof vLayer.getBounds === 'function' && vLayer.getBounds().isValid()) {
          map.flyToBounds(vLayer.getBounds().pad(0.12), { maxZoom: 16, duration: 0.8 });
        }
        showToast(`Layer "${resolveGeoportalLayerName(layerName)}" berhasil dimuat!`);
      } else {
        showToast(`Layer "${resolveGeoportalLayerName(layerName)}" tidak dapat ditayangkan.`);
      }
    } catch (err) {
      console.error("Gagal memuat layer:", err);
      showToast(`Gagal memuat layer "${resolveGeoportalLayerName(layerName)}".`);
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
    if (typeof layer.getBounds === 'function' && layer.getBounds().isValid()) {
      map.flyToBounds(layer.getBounds().pad(0.12), { maxZoom: 16, duration: 0.8 });
    }
  } else {
    map.removeLayer(layer);
    activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== cacheKey);
  }
  updateLegendEditor();
}

// ─── REORDER MAP LAYERS ───────────────────────────────────────────────────────
function reorderMapLayers() {
  [...activeLayerKeysOrder].reverse().forEach(cacheKey => {
    const layer = geoportalLayers.get(cacheKey);
    if (layer && map.hasLayer(layer)) {
      if (typeof layer.bringToFront === 'function') {
        layer.bringToFront();
      }
    }
  });
}

function moveLayerOrder(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= activeLayerKeysOrder.length) return;

  const temp = activeLayerKeysOrder[index];
  activeLayerKeysOrder[index] = activeLayerKeysOrder[targetIndex];
  activeLayerKeysOrder[targetIndex] = temp;

  reorderMapLayers();
  updateLegendEditor();
}

// ─── FAST REAL-TIME STYLE UPDATER (SUPER SMOOTH) ─────────────────────────────
function changeLayerColor(cacheKey, newColor) {
  layerColors.set(cacheKey, newColor);
  applyLayerStyle(cacheKey);
  updateLegendPreview(cacheKey);
}

function changeLayerOpacity(cacheKey, newOpacity) {
  layerOpacities.set(cacheKey, parseFloat(newOpacity));
  applyLayerStyle(cacheKey);
  updateLegendPreview(cacheKey);
}

function updateLegendPreview(cacheKey) {
  const color = layerColors.get(cacheKey) || '#008bb0';
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;
  const rgbaColor = hexToRgba(color, opacity);

  const floatingBox = document.querySelector(`[data-legend-box="${CSS.escape(cacheKey)}"]`);
  if (floatingBox) {
    floatingBox.style.backgroundColor = rgbaColor;
    floatingBox.style.borderColor = color;
  }
}

function applyLayerStyle(cacheKey) {
  const layer = geoportalLayers.get(cacheKey);
  const color = layerColors.get(cacheKey) || '#008bb0';
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;

  if (layer) {
    if (typeof layer.setStyle === 'function') {
      layer.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: opacity
      });
    }

    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(subLayer => {
        if (typeof subLayer.setStyle === 'function') {
          subLayer.setStyle({
            color: color,
            fillColor: color,
            fillOpacity: opacity
          });
        }
      });
    }

    if (typeof layer.setOpacity === 'function') {
      layer.setOpacity(opacity);
    }
  }
}

// ─── UI CONTROLS & UTILITIES ──────────────────────────────────────────────────
function filterLayers(query) {
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('.layer-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
}

function updateLegendEditor() {
  const container = document.getElementById('legend-editor-list');
  const floatingLegend = document.getElementById('floating-legend');
  const floatingContent = document.getElementById('floating-legend-content');

  const activeEntries = activeLayerKeysOrder.filter(key => {
    const l = geoportalLayers.get(key);
    return l && map.hasLayer(l);
  });

  // 1. Update Sidebar Tools
  if (container) {
    if (activeEntries.length === 0) {
      container.innerHTML = '<p class="text-[11px] text-slate-400 italic">Belum ada layer aktif yang ditampilkan.</p>';
    } else {
      container.innerHTML = activeEntries.map((cacheKey, idx) => {
        const [wmsUrl, layerName] = cacheKey.split('::');
        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;
        const cleanName = resolveGeoportalLayerName(layerName);

        const isFirst = idx === 0;
        const isLast = idx === activeEntries.length - 1;

        return `
          <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-sm space-y-2">
            <div class="font-semibold text-slate-700 flex items-center justify-between gap-1">
              <span class="truncate pr-1 flex-1" title="${escapeBMKGHTML(cleanName)}">${escapeBMKGHTML(cleanName)}</span>
              
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="moveLayerOrder(${idx}, -1)" ${isFirst ? 'disabled class="opacity-30 cursor-not-allowed text-slate-400"' : 'class="text-slate-600 hover:text-primary"'} title="Pindahkan Layer Ke Atas">
                  <i data-lucide="chevron-up" class="w-4 h-4"></i>
                </button>
                <button onclick="moveLayerOrder(${idx}, 1)" ${isLast ? 'disabled class="opacity-30 cursor-not-allowed text-slate-400"' : 'class="text-slate-600 hover:text-primary"'} title="Pindahkan Layer Ke Bawah">
                  <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </button>
                <button onclick="removeActiveLayer('${layerName}', '${wmsUrl}')" class="text-rose-500 hover:text-rose-700 ml-1" title="Hapus Layer">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-md border border-slate-100 text-[10px]">
              <div class="flex items-center justify-between">
                <span class="font-medium text-slate-500">Warna:</span>
                <input type="color" value="${activeColor}" oninput="changeLayerColor('${cacheKey}', this.value)" class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" title="Ubah warna" />
              </div>
              <div class="flex items-center justify-between gap-1">
                <span class="font-medium text-slate-500">Opasitas:</span>
                <input type="range" min="0" max="1" step="0.01" value="${activeOpacity}" oninput="changeLayerOpacity('${cacheKey}', this.value)" class="w-16 h-1.5 accent-primary cursor-pointer" title="Atur Transparansi" />
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Update Floating Legend di Atas Peta
  if (floatingLegend && floatingContent) {
    if (activeEntries.length === 0) {
      floatingLegend.classList.add('hidden');
    } else {
      floatingLegend.classList.remove('hidden');
      floatingContent.innerHTML = activeEntries.map((cacheKey) => {
        const [, layerName] = cacheKey.split('::');
        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;
        const cleanName = resolveGeoportalLayerName(layerName);
        const rgbaColor = hexToRgba(activeColor, activeOpacity);

        return `
          <div class="space-y-1.5 py-1">
            <div class="font-semibold text-slate-800 text-[11px]">${escapeBMKGHTML(cleanName)}</div>
            <div class="flex items-center justify-between gap-2 px-1">
              <div class="flex items-center gap-2">
                <span data-legend-box="${escapeBMKGHTML(cacheKey)}" class="w-4 h-4 rounded border shadow-sm inline-block transition-all" style="background-color: ${rgbaColor}; border-color: ${activeColor};"></span>
                <span class="text-[10px] font-medium text-slate-600">Simbol Vektor / Tile</span>
              </div>
              <input type="color" value="${activeColor}" oninput="changeLayerColor('${cacheKey}', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" title="Ubah warna layer" />
            </div>
          </div>
        `;
      }).join('<hr class="my-1.5 border-gray-100" />');
    }
  }

  if (window.lucide) lucide.createIcons();
}

function removeActiveLayer(layerName, wmsUrl) {
  const cb = document.querySelector(`input[data-layer-id="${layerName}"][onchange*="${wmsUrl}"]`);
  if (cb) cb.checked = false;
  toggleGeoportalLayer(layerName, false, wmsUrl);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
  setTimeout(() => { if (map) map.invalidateSize(); }, 300);
}

function showLoading() { const el = document.getElementById('loading-indicator'); if (el) el.classList.remove('hidden'); }
function hideLoading() { const el = document.getElementById('loading-indicator'); if (el) el.classList.add('hidden'); }
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── FITUR CETAK MAP JPEG ─────────────────────────────────────────────────────
async function exportMapJPEG() {
  showLoading();
  try {
    const container = document.getElementById('map');
    const canvas = await html2canvas(container, { useCORS: true, allowTaint: false });
    const link = document.createElement('a');
    link.download = `GeoNusa_Peta_${Date.now()}.jpeg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
    showToast("Peta berhasil diunduh sebagai JPEG!");
  } catch (err) {
    console.error("Cetak Peta Error:", err);
    showToast("Gagal mencetak gambar peta.");
  } finally {
    hideLoading();
  }
}