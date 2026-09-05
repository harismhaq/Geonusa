/* ==========================================================================
   GeoNusa — WebGIS Geografi Nusantara
   Application Logic (Instant Real-time Style Update & Smart Bounds Fallback)
   ==========================================================================*/

let map;
let currentBasemapLayer;
let currentBasemapName = 'Satelit';
const geoportalLayers = new Map();           // cacheKey -> L.Layer
const layerColors = new Map();               // cacheKey -> hexColor String
const layerOpacities = new Map();            // cacheKey -> opacity Number (0-1)
let activeLayerKeysOrder = [];               // Array penampung urutan z-index layer
let measureLayerGroup;                       // Layer group untuk hasil pengukuran

const PONTIANAK_CENTER = [-0.0263, 109.3425];
const DEFAULT_ZOOM = 6;

// Koordinat Fallback Pusat Wilayah untuk Server yang Sering Bermasalah pada Bounds-nya
const REGION_CENTER_FALLBACKS = {
  'magelangkab': [-7.4917, 110.2137, 11], // Kabupaten Magelang
  'magelangkota': [-7.4794, 110.2178, 13],
  'kalbar': [0.1318, 111.0958, 7],
  'ptk': [-0.0263, 109.3425, 12]
};

// Daftar Koleksi Geoportal
const GEOPORTAL_SERVERS = [
  { id: 'ptk', name: 'Geoportal Kota Pontianak', url: 'https://geoportal.pontianak.go.id/geoserver/ows' },
  { id: 'kalbar', name: 'Satu Peta Prov. Kalbar', url: 'https://satupeta.kalbarprov.go.id/geoserver/ows' },
  { id: 'kaltimprov', name: 'JIGD Prov. Kalimantan Timur', url: 'https://jigd.kaltimprov.go.id/geoserver/ows' },
  { id: 'kotimkab', name: 'Geoportal Kab. Kotawaringin Timur', url: 'https://geoportal.kotimkab.go.id/geoserver/wms' },
  { id: 'mahakamulu', name: 'Geoportal Kab. Mahakam Ulu', url: 'https://geoserver-geoportal.mahakamulukab.go.id/geoserver/wms' },
  { id: 'sumbar', name: 'Geoportal Prov. Sumatera Barat', url: 'https://geoportal.sumbarprov.go.id/geoserver/wms' },
  { id: 'bengkuluprov', name: 'Geoportal Prov. Bengkulu', url: 'https://geo.bengkuluprov.go.id/geoserver/palapa/ows' },
  { id: 'jateng', name: 'Satu Peta Prov. Jawa Tengah', url: 'https://satupeta.jatengprov.go.id/geoserver/palapa/wms' },
  { id: 'magelangkab', name: 'Geoportal Kab. Magelang', url: 'https://geoportal.magelangkab.go.id/geoserver/ows' },
  { id: 'magelangkota', name: 'Geoportal Kota Magelang', url: 'https://geoportal.magelangkota.go.id/geoserver/ows' },
  { id: 'klatenkab', name: 'Geoportal Kab. Klaten', url: 'https://geoportal.klaten.go.id/geoserver/wms' },
  { id: 'mojokertokota', name: 'Geoportal Kota Mojokerto', url: 'https://geoportal.mojokertokota.go.id/geoserver/ows' },
  { id: 'bandungkota', name: 'Geoportal Kota Bandung', url: 'https://geodata.bandung.go.id/geoserver/ows' },
  { id: 'jogjakota', name: 'Geoportal Kota Yogyakarta', url: 'https://geoportal.jogjakota.go.id/geoserver/ows' }
];

function geoFetch(targetUrl, init) {
  return fetch(targetUrl, init);
}

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

function hexToRgba(hex, opacity) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`;
}

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
    setTimeout(() => { hideSplashScreen(); }, 500);
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
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
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

  measureLayerGroup = new L.FeatureGroup().addTo(map);
  
  map.on('draw:created', function (e) {
    const layer = e.layer;
    measureLayerGroup.addLayer(layer);
    const deleteId = L.stamp(layer);
    
    if (e.layerType === 'polyline') {
      const latlngs = layer.getLatLngs();
      let distance = 0;
      for (let i = 0; i < latlngs.length - 1; i++) {
        distance += latlngs[i].distanceTo(latlngs[i+1]);
      }
      const text = distance > 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(1)} meter`;
      
      layer.bindPopup(`
        <div class="p-1 flex items-center justify-between gap-3 text-xs">
          <div><strong>Panjang:</strong> <span class="text-primary font-bold">${text}</span></div>
          <button onclick="removeMeasureItem(${deleteId})" class="text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200">Hapus</button>
        </div>
      `).openPopup();
    } else if (e.layerType === 'polygon') {
      const latlngs = layer.getLatLngs()[0];
      let area = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latlngs) : calculateApproxPolygonArea(latlngs);
      let areaText = area > 1000000 ? `${(area / 1000000).toFixed(2)} km²` : `${(area / 10000).toFixed(2)} Hektar`;
      
      layer.bindPopup(`
        <div class="p-1 flex items-center justify-between gap-3 text-xs">
          <div><strong>Luas:</strong> <span class="text-primary font-bold">${areaText}</span></div>
          <button onclick="removeMeasureItem(${deleteId})" class="text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200">Hapus</button>
        </div>
      `).openPopup();
    }
  });
}

function removeMeasureItem(stampId) {
  if (measureLayerGroup) {
    measureLayerGroup.eachLayer(function (layer) {
      if (L.stamp(layer) === stampId) {
        measureLayerGroup.removeLayer(layer);
        showToast("Pengukuran dihapus.");
      }
    });
  }
}

function calculateApproxPolygonArea(latlngs) {
  let points = latlngs.map(pt => [pt.lng * 111320 * Math.cos(pt.lat * Math.PI / 180), pt.lat * 110540]);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    let j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area / 2);
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

async function fetchAllGeoportalCollections() {
  showLoading();
  const container = document.getElementById('layer-tree');
  if (!container) return;

  container.innerHTML = GEOPORTAL_SERVERS.map(s => `
    <div class="layer-folder border-b border-slate-100 py-1" id="folder_wrapper_${s.id}">
      <div class="folder-header opacity-75">
        <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-primary shrink-0"></i>
        <span class="folder-name font-semibold text-slate-700">${escapeBMKGHTML(s.name)}</span>
        <span class="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">Memuat...</span>
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
          <div class="folder-header" onclick="toggleFolder('folder_${server.id}')">
            <i data-lucide="chevron-right" class="folder-chevron"></i>
            <i data-lucide="folder" class="folder-icon opened"></i>
            <span class="folder-name font-bold text-slate-800">${escapeBMKGHTML(server.name)}</span>
            <span class="folder-badge">${layersList.length}</span>
          </div>
          <div class="folder-children" id="children-folder_${server.id}">
            ${layersList.length === 0 ? '<div class="px-3 py-1 text-[11px] text-slate-400 italic">Tidak ada layer.</div>' : 
              layersList.map(l => `
              <label class="layer-item" title="${escapeBMKGHTML(l.title)}">
                <input type="checkbox" data-layer-id="${l.name}" onchange="toggleGeoportalLayer('${l.name}', this.checked, '${server.url}', '${server.id}')" />
                <i data-lucide="map" class="layer-icon"></i>
                <span class="layer-name">${escapeBMKGHTML(resolveGeoportalLayerName(l.title))}</span>
              </label>
            `).join('')}
          </div>
        `;
      }
    } catch (err) {
      if (wrapper) {
        wrapper.innerHTML = `
          <div class="folder-header opacity-75">
            <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500 shrink-0"></i>
            <span class="folder-name font-semibold text-slate-600">${escapeBMKGHTML(server.name)}</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Offline</span>
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
            style: function() {
              return { color: initialColor, weight: 1.8, opacity: 0.9, fillColor: initialColor, fillOpacity: initialOpacity };
            },
            pointToLayer: function(feature, latlng) {
              return L.circleMarker(latlng, { radius: 6, color: initialColor, weight: 1.5, opacity: 0.9, fillColor: initialColor, fillOpacity: initialOpacity });
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
    console.warn("WFS fallback ke WMS:", err);
  }

  const cleanWmsBase = wmsUrl.split('?')[0];
  return L.tileLayer.wms(cleanWmsBase, {
    layers: layerName,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    opacity: initialOpacity > 0 ? initialOpacity + 0.3 : 0.8
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

        if (!activeLayerKeysOrder.includes(cacheKey)) {
          activeLayerKeysOrder.unshift(cacheKey);
        }

        vLayer.addTo(map);
        reorderMapLayers();

        // Smart Zoom / FlyToBounds dengan Fallback jika Bounds dari GeoServer Gagal/Kosong
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

function reorderMapLayers() {
  [...activeLayerKeysOrder].reverse().forEach(cacheKey => {
    const layer = geoportalLayers.get(cacheKey);
    if (layer && map.hasLayer(layer)) {
      if (typeof layer.bringToFront === 'function') layer.bringToFront();
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

// Perubahan Warna & Opasitas Secara Real-time Instan (Tanpa Lag/Debounce)
function changeLayerColor(cacheKey, newColor) {
  layerColors.set(cacheKey, newColor);
  updateLegendPreview(cacheKey);
  applyLayerStyle(cacheKey);
}

function changeLayerOpacity(cacheKey, newOpacity) {
  const parsedOpacity = parseFloat(newOpacity);
  layerOpacities.set(cacheKey, parsedOpacity);
  updateLegendPreview(cacheKey);
  applyLayerStyle(cacheKey);
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
    if (typeof layer.setStyle === 'function') layer.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(sub => {
        if (typeof sub.setStyle === 'function') sub.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
      });
    }
    if (typeof layer.setOpacity === 'function') layer.setOpacity(opacity);
  }
}

function filterLayers(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.layer-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
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

  if (container) {
    if (activeEntries.length === 0) {
      container.innerHTML = '<p class="text-[11px] text-slate-400 italic">Belum ada layer aktif.</p>';
    } else {
      container.innerHTML = activeEntries.map((cacheKey, idx) => {
        const [wmsUrl, layerName] = cacheKey.split('::');
        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.35;
        const cleanName = resolveGeoportalLayerName(layerName);

        return `
          <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-sm space-y-2">
            <div class="font-semibold text-slate-700 flex items-center justify-between gap-1">
              <span class="truncate pr-1 flex-1">${escapeBMKGHTML(cleanName)}</span>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="moveLayerOrder(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-30"' : ''}><i data-lucide="chevron-up" class="w-4 h-4"></i></button>
                <button onclick="moveLayerOrder(${idx}, 1)" ${idx === activeEntries.length - 1 ? 'disabled class="opacity-30"' : ''}><i data-lucide="chevron-down" class="w-4 h-4"></i></button>
                <button onclick="removeActiveLayerCustom('${cacheKey}')" class="text-rose-500 hover:text-rose-700 ml-1"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-md border border-slate-100 text-[10px]">
              <div class="flex items-center justify-between">
                <span>Warna:</span>
                <input type="color" value="${activeColor}" oninput="changeLayerColor('${cacheKey}', this.value)" class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              </div>
              <div class="flex items-center justify-between gap-1">
                <span>Opasitas:</span>
                <input type="range" min="0" max="1" step="0.01" value="${activeOpacity}" oninput="changeLayerOpacity('${cacheKey}', this.value)" class="w-16 h-1.5 accent-primary cursor-pointer" />
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

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
                <span data-legend-box="${escapeBMKGHTML(cacheKey)}" class="w-4 h-4 rounded border shadow-sm inline-block" style="background-color: ${rgbaColor}; border-color: ${activeColor};"></span>
                <span class="text-[10px]">Layer Aktif</span>
              </div>
              <input type="color" value="${activeColor}" oninput="changeLayerColor('${cacheKey}', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
        `;
      }).join('<hr class="my-1.5 border-gray-100" />');
    }
  }

  if (window.lucide) lucide.createIcons();
}

function removeActiveLayerCustom(cacheKey) {
  const layer = geoportalLayers.get(cacheKey);
  if (layer) {
    map.removeLayer(layer);
  }
  activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== cacheKey);
  
  if (cacheKey.includes('::')) {
    const [wmsUrl, layerName] = cacheKey.split('::');
    const cb = document.querySelector(`input[data-layer-id="${layerName}"][onchange*="${wmsUrl}"]`);
    if (cb) cb.checked = false;
  }
  updateLegendEditor();
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

async function exportMapJPEG() {
  showLoading();
  try {
    const container = document.getElementById('map');
    const canvas = await html2canvas(container, { useCORS: true, allowTaint: false });
    const link = document.createElement('a');
    link.download = `GeoNusa_Peta_${Date.now()}.jpeg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
    showToast("Peta berhasil diunduh!");
  } catch (err) {
    showToast("Gagal mencetak peta.");
  } finally {
    hideLoading();
  }
}

function openHelpModal() {
  let modal = document.getElementById('tutorial-modal');
  if (!modal) {
    const modalHTML = `
      <div id="tutorial-modal" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl border max-w-md w-full p-6 relative flex flex-col text-left">
          <div class="flex items-center justify-between mb-4 border-b pb-3">
            <h3 class="text-base font-bold text-slate-800">Panduan GeoNusa</h3>
            <button onclick="document.getElementById('tutorial-modal').remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <div class="space-y-2 text-xs text-slate-600">
            <p>1. Gunakan Geoportal Hub untuk menampilkan data wilayah.</p>
            <p>2. Gunakan menu ukur untuk jarak dan area poligon.</p>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) lucide.createIcons();
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  showLoading();
  const reader = new FileReader();
  const fileName = file.name.toLowerCase();

  reader.onload = function(e) {
    try {
      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        addCustomUserLayer(JSON.parse(e.target.result), file.name);
      } else if (fileName.endsWith('.kml')) {
        const dom = new DOMParser().parseFromString(e.target.result, 'text/xml');
        addCustomUserLayer(toGeoJSON.kml(dom), file.name);
      } else if (fileName.endsWith('.zip')) {
        shp(e.target.result).then(data => addCustomUserLayer(data, file.name)).catch(() => hideLoading());
        return;
      }
    } catch(err) {
      showToast("Gagal memproses file.");
      hideLoading();
    } finally {
      event.target.value = '';
    }
  };
  if (fileName.endsWith('.zip')) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

function addCustomUserLayer(geojsonObj, name) {
  const layer = L.geoJSON(geojsonObj, {
    style: { color: '#0284c7', weight: 2, fillOpacity: 0.4 },
    onEachFeature: function(feature, l) {
      if (feature.properties) {
        let rows = Object.entries(feature.properties).map(([k, v]) => `<tr><td>${escapeBMKGHTML(k)}</td><td>${escapeBMKGHTML(v)}</td></tr>`).join('');
        l.bindPopup(`<table class="text-[11px]">${rows}</table>`);
      }
    }
  }).addTo(map);

  const key = `user_${Date.now()}`;
  geoportalLayers.set(key, layer);
  activeLayerKeysOrder.unshift(key);
  if (layer.getBounds().isValid()) map.flyToBounds(layer.getBounds().pad(0.1));
  showToast(`Berhasil memuat: ${name}`);
  hideLoading();
  updateLegendEditor();
}

function startMeasure(type) {
  if (!map) return;
  if (type === 'polyline') {
    new L.Draw.Polyline(map, { shapeOptions: { color: '#0284c7', weight: 4 } }).enable();
    showToast("Mode Ukur Jarak Aktif.");
  } else if (type === 'polygon') {
    new L.Draw.Polygon(map, { shapeOptions: { color: '#0284c7', weight: 3, fillOpacity: 0.3 } }).enable();
    showToast("Mode Ukur Luas Aktif.");
  }
}