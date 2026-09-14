/* ==========================================================================
   GeoNusa — Map Core & Utilities (map-core.js)
   ==========================================================================*/

let map;
let currentBasemapLayer;
let currentBasemapName = 'OpenStreetMap';
const geoportalLayers = new Map();
const layerColors = new Map();
const layerOpacities = new Map();
let activeLayerKeysOrder = [];
let measureLayerGroup;

let bmkgTimestampsHub = [];
let currentTimestampIndex = 0;

let dailyDatesHub = [];
let currentDailyDateIndex = 0;

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

function initMap() {
  map = L.map('map', {
    center: PONTIANAK_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
    attributionControl: true
  }); 

  changeBasemap('osm');
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
    area += points[i][0] * points[j];
    area -= points[j][0] * points[i];
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

function showLoading() { const el = document.getElementById('loading-indicator'); if (el) el.classList.remove('hidden'); }
function hideLoading() { const el = document.getElementById('loading-indicator'); if (el) el.classList.add('hidden'); }

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function getYesterdayDate() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function generateDailyDatesArray() {
  let arr = [];
  let d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 30; i >= 0; i--) {
    let tempD = new Date(d);
    tempD.setDate(d.getDate() - i);
    arr.push(tempD.toISOString().slice(0, 10));
  }
  return arr;
}

function hideAllFloatingWidgets() {
  ['daily-floating-time-widget', 'bmkg-floating-time-widget', 'airvisual-floating-time-widget'].forEach(id => {
    let el = document.getElementById(id);
    if (el) el.remove();
  });
}

function formatReadableDate(dateStr) {
  try {
    if (!dateStr) return '';
    let parts = String(dateStr).split('-');
    if (parts.length < 3) return dateStr;
    
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // Diperbaiki: mengambil indeks ke-1 untuk bulan
    let day = parseInt(parts[2], 10);       // Diperbaiki: mengambil indeks ke-2 untuk hari
    
    let d = new Date(year, month, day);
    if (isNaN(d.getTime())) return dateStr;

    let months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    let dayStr = String(d.getDate()).padStart(2, '0');
    let monStr = months[d.getMonth()] || '';
    let yearStr = d.getFullYear();
    return `${dayStr} ${monStr} ${yearStr}`;
  } catch (e) {
    return dateStr;
  }
}

function getGibsDateUrl(layerId, ext, dateStr) {
  return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' + layerId + '/default/' + dateStr + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.' + ext;
}

const satelliteDisplayNames = {
  'toggleModisTerra': 'MODIS Terra TrueColor',
  'toggleModisAqua': 'MODIS Aqua TrueColor',
  'toggleViirs20': 'VIIRS NOAA-20 TrueColor',
  'toggleViirs21': 'VIIRS NOAA-21 TrueColor',
  'toggleBmkgHimawari': 'Himawari-9 IR Enhanced',
  'toggleBmkgHimawariFd': 'Himawari-9 Full Disk',
  'toggleBmkgHimawariHires': 'Himawari-9 Hi-Res',
  'toggleBmkgGk2a': 'GK-2A Infrared',
  'toggleBmkgGk2aWv': 'GK-2A Water Vapor',
  'toggleNoaaTrue': 'NOAA NNVL True Color',
  'toggleNoaaGoesIr': 'NOAA GOES IR',
  'toggleSentinel2': 'Sentinel-2 Cloudless'
};

var BMKG_TILETYPE = {
  'toggleBmkgHimawari': 'himawari9',
  'toggleBmkgHimawariFd': 'himawari9fd',
  'toggleBmkgHimawariHires': 'himawari9hires',
  'toggleBmkgGk2a': 'gk2a',
  'toggleBmkgGk2aWv': 'gk2a'
};

var BMKG_PARAMS = {
  'toggleBmkgHimawari': 'EH',
  'toggleBmkgHimawariFd': 'EH',
  'toggleBmkgHimawariHires': 'VS',
  'toggleBmkgGk2a': 'EH',
  'toggleBmkgGk2aWv': 'WV'
};

var selectedDailyDate = getYesterdayDate();

function formatBmkgTimestamp(tsStr) {
  try {
    let d = new Date(tsStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return tsStr;
    let months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    let day = String(d.getDate()).padStart(2, '0');
    let mon = months[d.getMonth()];
    let year = d.getFullYear();
    let hour = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${mon} ${year} ${hour}:${min} WIB`;
  } catch (e) {
    return tsStr;
  }
}

function showDailyFloatingTimeWidget(layerTitle) {
  hideAllFloatingWidgets();

  var widget = document.createElement('div');
  widget.id = 'daily-floating-time-widget';
  widget.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[950] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/80 flex flex-col items-center gap-1.5 w-[260px] sm:w-80 select-none';
  widget.innerHTML = `
    <div class="text-[11px] font-bold text-slate-700 tracking-wide text-center truncate w-full">${layerTitle}</div>
    <div class="flex items-center justify-between w-full gap-2">
      <button id="daily-prev-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Hari Sebelumnya">
        <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
      </button>
      <input type="range" id="daily-time-slider" min="0" max="0" value="0" step="1" class="w-full accent-primary cursor-pointer" />
      <button id="daily-next-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Hari Selanjutnya">
        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
      </button>
    </div>
    <div id="daily-time-label" class="text-xs font-mono font-extrabold text-primary">Memuat tanggal...</div>
  `;
  document.body.appendChild(widget);
  if (window.lucide) lucide.createIcons();

  dailyDatesHub = generateDailyDatesArray();
  currentDailyDateIndex = dailyDatesHub.length - 1;

  let slider = document.getElementById('daily-time-slider');
  slider.max = dailyDatesHub.length - 1;
  slider.value = currentDailyDateIndex;

  slider.addEventListener('input', function() {
    currentDailyDateIndex = parseInt(this.value, 10);
    applySelectedDailyDate();
  });

  document.getElementById('daily-prev-btn').addEventListener('click', function() {
    if (currentDailyDateIndex > 0) {
      currentDailyDateIndex--;
      slider.value = currentDailyDateIndex;
      applySelectedDailyDate();
    }
  });

  document.getElementById('daily-next-btn').addEventListener('click', function() {
    if (currentDailyDateIndex < dailyDatesHub.length - 1) {
      currentDailyDateIndex++;
      slider.value = currentDailyDateIndex;
      applySelectedDailyDate();
    }
  });

  applySelectedDailyDate();
}

function hideDailyFloatingTimeWidget() {
  let existing = document.getElementById('daily-floating-time-widget');
  if (existing) existing.remove();
}

function applySelectedDailyDate() {
  if (!dailyDatesHub.length) return;
  selectedDailyDate = dailyDatesHub[currentDailyDateIndex];
  
  let dateInput = document.getElementById('gibsDateRange');
  if (dateInput) {
    dateInput.value = selectedDailyDate;
  }
  if (typeof window.applyDateChange === 'function') {
    window.applyDateChange();
  }

  let label = document.getElementById('daily-time-label');
  if (label) label.textContent = formatReadableDate(selectedDailyDate);

  ['toggleModisTerra', 'toggleModisAqua', 'toggleViirs20', 'toggleViirs21'].forEach(key => {
    let layer = hubLayersMap.get(key);
    if (layer && map.hasLayer(layer)) {
      if (key === 'toggleModisTerra') layer.setUrl(getGibsDateUrl('MODIS_Terra_CorrectedReflectance_TrueColor', 'jpg', selectedDailyDate));
      if (key === 'toggleModisAqua') layer.setUrl(getGibsDateUrl('MODIS_Aqua_CorrectedReflectance_TrueColor', 'jpg', selectedDailyDate));
      if (key === 'toggleViirs20') layer.setUrl(getGibsDateUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'jpeg', selectedDailyDate));
      if (key === 'toggleViirs21') layer.setUrl(getGibsDateUrl('VIIRS_NOAA21_CorrectedReflectance_TrueColor', 'jpeg', selectedDailyDate));
    }
  });
}

function showBmkgFloatingTimeWidget(layerTitle) {
  let existing = document.getElementById('bmkg-floating-time-widget');
  if (existing) existing.remove();

  var widget = document.createElement('div');
  widget.id = 'bmkg-floating-time-widget';
  widget.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[950] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/80 flex flex-col items-center gap-1.5 w-[260px] sm:w-80 select-none';
  widget.innerHTML = `
    <div class="text-[11px] font-bold text-slate-700 tracking-wide text-center truncate w-full">${layerTitle}</div>
    <div class="flex items-center justify-between w-full gap-2">
      <button id="bmkg-prev-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Waktu Sebelumnya">
        <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
      </button>
      <input type="range" id="bmkg-time-slider" min="0" max="0" value="0" step="1" class="w-full accent-primary cursor-pointer" />
      <button id="bmkg-next-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Waktu Selanjutnya">
        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
      </button>
    </div>
    <div id="bmkg-time-label" class="text-xs font-mono font-extrabold text-primary">Memuat waktu...</div>
  `;

  document.body.appendChild(widget);
  if (window.lucide) lucide.createIcons();

  let slider = document.getElementById('bmkg-time-slider');
  let label = document.getElementById('bmkg-time-label');

  slider.addEventListener('input', function() {
    currentTimestampIndex = parseInt(this.value);
    applySelectedBmkgTimestamp();
  });

  document.getElementById('bmkg-prev-btn').addEventListener('click', function() {
    if (currentTimestampIndex > 0) {
      currentTimestampIndex--;
      slider.value = currentTimestampIndex;
      applySelectedBmkgTimestamp();
    }
  });

  document.getElementById('bmkg-next-btn').addEventListener('click', function() {
    if (currentTimestampIndex < bmkgTimestampsHub.length - 1) {
      currentTimestampIndex++;
      slider.value = currentTimestampIndex;
      applySelectedBmkgTimestamp();
    }
  });
}

function hideBmkgFloatingTimeWidget() {
  let existing = document.getElementById('bmkg-floating-time-widget');
  if (existing) existing.remove();
}

function applySelectedBmkgTimestamp() {
  if (!bmkgTimestampsHub.length) return;
  let selectedTs = bmkgTimestampsHub[currentTimestampIndex];
  let label = document.getElementById('bmkg-time-label');
  if (label) label.textContent = formatBmkgTimestamp(selectedTs);

  Object.keys(BMKG_TILETYPE).forEach(chkId => {
    let layer = hubLayersMap.get(chkId);
    let modelName = BMKG_TILETYPE[chkId];
    if (layer && map.hasLayer(layer)) {
      let param = BMKG_PARAMS[chkId];
      let newUrl = 'https://satellite.bmkg.go.id/api22/tile/{z}/{x}/{y}.png?tiletype=himawari9&modelname=' + modelName + '&param=' + param + '&baserun=' + encodeURIComponent(selectedTs);
      layer.setUrl(newUrl);
    }
  });
}

function getBmkgLegendHtml() {
  return `
    <div class="space-y-1.5 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px]">
      <div class="font-bold text-slate-700 mb-1">Skala Suhu / Intensitas Awan (IR/EH):</div>
      <div class="h-3 w-full rounded bg-gradient-to-r from-blue-900 via-cyan-400 via-yellow-200 to-red-600 shadow-inner"></div>
      <div class="flex justify-between text-[9px] text-slate-500 font-medium px-0.5">
        <span>Sangat Dingin (Puncak Awan Tinggi)</span>
        <span>Hangat (Permukaan)</span>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function () {
  var dateInput = document.getElementById('gibsDateRange');
  if (dateInput) dateInput.value = selectedDailyDate;

  const satelliteMappings = {
    'toggleModisTerra': () => L.tileLayer(getGibsDateUrl('MODIS_Terra_CorrectedReflectance_TrueColor', 'jpg', selectedDailyDate), { maxZoom: 12, attribution: 'NASA GIBS', transparent: true }),
    'toggleModisAqua': () => L.tileLayer(getGibsDateUrl('MODIS_Aqua_CorrectedReflectance_TrueColor', 'jpg', selectedDailyDate), { maxZoom: 12, attribution: 'NASA GIBS', transparent: true }),
    'toggleViirs20': () => L.tileLayer(getGibsDateUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'jpeg', selectedDailyDate), { maxZoom: 9, attribution: 'NASA GIBS', transparent: true }),
    'toggleViirs21': () => L.tileLayer(getGibsDateUrl('VIIRS_NOAA21_CorrectedReflectance_TrueColor', 'jpeg', selectedDailyDate), { maxZoom: 9, attribution: 'NASA GIBS', transparent: true }),
    'toggleNoaaTrue': () => L.tileLayer('https://gis.nnvl.noaa.gov/arcgis/rest/services/TRUE/TRUE_current/ImageServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'NOAA NNVL', transparent: true }),
    'toggleNoaaGoesIr': () => L.tileLayer('https://gis.nnvl.noaa.gov/arcgis/rest/services/GOES/GOES_current/ImageServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'NOAA GOES', transparent: true }),
    'toggleSentinel2': () => L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg', { maxZoom: 13, attribution: 'Sentinel-2 EOX', transparent: true })
  };

  Object.keys(satelliteMappings).forEach(chkId => {
    var chk = document.getElementById(chkId);
    if (chk) {
      chk.addEventListener('change', function () {
        const displayName = satelliteDisplayNames[chkId];
        hubLayerNames.set(chkId, displayName);

        let targetLayer = hubLayersMap.get(chkId);
        if (!targetLayer) {
          targetLayer = satelliteMappings[chkId]();
          hubLayersMap.set(chkId, targetLayer);
        }

        if (this.checked) {
          targetLayer.addTo(map);
          if (['toggleModisTerra', 'toggleModisAqua', 'toggleViirs20', 'toggleViirs21'].includes(chkId)) {
            showDailyFloatingTimeWidget(displayName);
          }
        } else {
          if (map.hasLayer(targetLayer)) map.removeLayer(targetLayer);

          let hasActiveDaily = ['toggleModisTerra', 'toggleModisAqua', 'toggleViirs20', 'toggleViirs21'].some(id => {
            let l = hubLayersMap.get(id);
            return l && map.hasLayer(l);
          });
          if (!hasActiveDaily) hideDailyFloatingTimeWidget();
        }
      });
    }
  });

  Object.keys(BMKG_TILETYPE).forEach(chkId => {
    var chk = document.getElementById(chkId);
    if (chk) {
      chk.addEventListener('change', function () {
        var modelName = BMKG_TILETYPE[chkId];
        var param = BMKG_PARAMS[chkId];
        const displayName = satelliteDisplayNames[chkId];
        
        hubLayerNames.set(chkId, displayName);
        if (!layerColors.has(chkId)) layerColors.set(chkId, '#008bb0');
        if (!layerOpacities.has(chkId)) layerOpacities.set(chkId, 0.9);

        if (this.checked) {
          showLoading();
          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'https://satellite.bmkg.go.id/api22/modelrun', true);
          xhr.timeout = 10000;
          xhr.onload = function() {
            hideLoading();
            let tileUrl = 'https://satellite.bmkg.go.id/api22/tile/{z}/{x}/{y}.png?tiletype=himawari9&modelname=' + modelName + '&param=' + param + '&baserun=';
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                var data = JSON.parse(xhr.responseText);
                let rawList = data[modelName] || [];
                bmkgTimestampsHub = rawList.sort((a, b) => new Date(a.replace(' ', 'T')) - new Date(b.replace(' ', 'T')));
                
                if (bmkgTimestampsHub.length > 0) {
                  currentTimestampIndex = bmkgTimestampsHub.length - 1;
                  let latestTs = bmkgTimestampsHub[currentTimestampIndex];
                  tileUrl += encodeURIComponent(latestTs);
                }
              } catch (e) {}
            }
            var bmkgLayer = L.tileLayer(tileUrl, { maxZoom: 10, minZoom: 3, tms: true, attribution: 'BMKG', transparent: true });
            hubLayersMap.set(chkId, bmkgLayer);
            bmkgLayer.addTo(map);
            
            if (!activeLayerKeysOrder.includes(chkId)) activeLayerKeysOrder.unshift(chkId);
            if (typeof reorderMapLayers === 'function') reorderMapLayers();
            
            if (typeof updateLegendEditor === 'function') {
              updateLegendEditor();
              setTimeout(() => {
                let metaEl = document.getElementById(`legend_meta_${CSS.escape(chkId)}`);
                let floatMetaEl = document.getElementById(`floating_legend_meta_${CSS.escape(chkId)}`);
                let customLegend = getBmkgLegendHtml();
                if (metaEl) metaEl.innerHTML = customLegend;
                if (floatMetaEl) floatMetaEl.innerHTML = customLegend;
              }, 100);
            }

            showBmkgFloatingTimeWidget(displayName);
            let slider = document.getElementById('bmkg-time-slider');
            if (slider && bmkgTimestampsHub.length > 0) {
              slider.max = bmkgTimestampsHub.length - 1;
              slider.value = currentTimestampIndex;
              applySelectedBmkgTimestamp();
            }
          };
          xhr.onerror = function() {
            hideLoading();
            if (typeof showToast === 'function') showToast("Gagal memuat data model BMKG.");
          };
          xhr.send();
        } else {
          var targetLayer = hubLayersMap.get(chkId);
          if (targetLayer && map.hasLayer(targetLayer)) {
            map.removeLayer(targetLayer);
          }
          activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== chkId);
          if (typeof updateLegendEditor === 'function') updateLegendEditor();
          
          let hasActiveBmkg = Object.keys(BMKG_TILETYPE).some(id => {
            let l = hubLayersMap.get(id);
            return l && map.hasLayer(l);
          });
          if (!hasActiveBmkg) hideBmkgFloatingTimeWidget();
        }
      });
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const btnLocate = document.getElementById('btn-lokasi-saya');
  if (btnLocate) {
    btnLocate.addEventListener('click', function() {
      if (typeof map !== 'undefined' && map) {
        if (typeof showToast === 'function') showToast("Mendeteksi lokasi Anda...");
        
        map.locate({ setView: true, maxZoom: 16 });

        map.off('locationfound');
        map.on('locationfound', function(e) {
          if (window.userLocationMarker) {
            map.removeLayer(window.userLocationMarker);
          }

        window.userLocationMarker = L.circleMarker(e.latlng, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#008bb0',
          fillOpacity: 1
        }).addTo(map).bindPopup(`
          <div class="flex items-center pr-6 pl-1 py-0.5 text-xs">
            <span class="font-bold text-slate-800 whitespace-nowrap">Lokasi Anda</span>
          </div>
        `, {
          offset: [0, -15],
          minWidth: 100
        }).openPopup();

        window.userLocationMarker.on('popupclose', function() {
          if (window.userLocationMarker) {
            map.removeLayer(window.userLocationMarker);
            window.userLocationMarker = null;
          }
        });

          if (typeof showToast === 'function') showToast("Berhasil menemukan lokasi Anda!");
        });

        map.off('locationerror');
        map.on('locationerror', function(e) {
          if (typeof showToast === 'function') showToast("Gagal mengakses lokasi. Pastikan izin GPS aktif.");
        });
      }
    });
  }
});