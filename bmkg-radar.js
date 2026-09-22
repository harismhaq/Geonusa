/* ==========================================================================
   GeoNusa — BMKG Radar CMax Standalone Module (With Legend & Realtime Time)
   ==========================================================================*/

(function () {
  'use strict';

  // Menggunakan variabel konfigurasi dari config.js
  const radarCfg = typeof BMKG_RADAR_CMAX_CONFIG !== 'undefined' ? BMKG_RADAR_CMAX_CONFIG : {
    id: 'bmkg_radarcmax',
    name: 'Radar CMax BMKG (Reflektifitas)',
    url: 'https://gis.bmkg.go.id/arcgis/rest/services/radarcmax/MapServer',
    defaultOpacity: 0.75,
    attribution: '&copy; BMKG Indonesia'
  };

  let radarInstance = null;

// Format Tanggal & Jam Real-Time WIB yang Akurat
  function getRealtimeWIBTimestamp() {
    let now = new Date();
    // Menggunakan opsi Intl.DateTimeFormat untuk memastikan akurasi zona waktu Asia/Jakarta (WIB) secara otomatis
    let options = {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    let formatter = new Intl.DateTimeFormat('id-ID', options);
    let parts = formatter.formatToParts(now);
    
    let day = parts.find(p => p.type === 'day')?.value || '';
    let mon = parts.find(p => p.type === 'month')?.value || '';
    let year = parts.find(p => p.type === 'year')?.value || '';
    let hour = parts.find(p => p.type === 'hour')?.value || '';
    let min = parts.find(p => p.type === 'minute')?.value || '';
    let sec = parts.find(p => p.type === 'second')?.value || '';

    return `${day} ${mon} ${year} ${hour}:${min}:${sec} WIB (Live)`;
  }
  // Widget Waktu Mengambang di Peta
  function showRadarFloatingWidget(layerTitle) {
    if (typeof hideAllFloatingWidgets === 'function') {
      hideAllFloatingWidgets();
    } else {
      let existingAll = document.getElementById('airvisual-floating-time-widget');
      if (existingAll) existingAll.remove();
      let existingBmkg = document.getElementById('bmkg-floating-time-widget');
      if (existingBmkg) existingBmkg.remove();
    }

    let existing = document.getElementById('radar-floating-time-widget');
    if (existing) existing.remove();

    var widget = document.createElement('div');
    widget.id = 'radar-floating-time-widget';
    widget.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[950] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/80 flex flex-col items-center gap-1 w-[260px] sm:w-80 select-none';
    widget.innerHTML = `
      <div class="text-[11px] font-bold text-slate-700 tracking-wide text-center truncate w-full">${layerTitle}</div>
      <div id="radar-time-label" class="text-xs font-mono font-extrabold text-primary">${getRealtimeWIBTimestamp()}</div>
    `;

    document.body.appendChild(widget);

    // Update waktu setiap 1 detik secara real-time
    window._radarTimerInterval = setInterval(() => {
      let lbl = document.getElementById('radar-time-label');
      if (lbl) lbl.textContent = getRealtimeWIBTimestamp();
    }, 1000);
  }

  function hideRadarFloatingWidget() {
    if (window._radarTimerInterval) clearInterval(window._radarTimerInterval);
    let existing = document.getElementById('radar-floating-time-widget');
    if (existing) existing.remove();
  }

  // Fungsi Toggle Utama Layer Radar
  window.toggleBmkgRadarCmax = function(show) {
    if (typeof map === 'undefined') return;
    
    const layerKey = radarCfg.id;
    const layerTitle = radarCfg.name;

    if (!hubLayerNames.has(layerKey)) {
      hubLayerNames.set(layerKey, layerTitle);
    }
    if (!layerOpacities.has(layerKey)) {
      layerOpacities.set(layerKey, radarCfg.defaultOpacity);
    }

    if (!radarInstance) {
      radarInstance = L.tileLayer('https://example.invalid/blank/{z}/{y}/{x}', {
        attribution: radarCfg.attribution,
        maxZoom: 18,
        transparent: true,
        opacity: layerOpacities.get(layerKey)
      });

      radarInstance.getTileUrl = function (coords) {
        const z = coords.z;
        const tileSize = 256;
        const min = map.unproject([coords.x * tileSize, (coords.y + 1) * tileSize], z);
        const max = map.unproject([(coords.x + 1) * tileSize, coords.y * tileSize], z);
        const bbox = `${min.lng},${min.lat},${max.lng},${max.lat}`;
        
        // Cachebuster agar tile ter-refresh dinamis
        let ts = Math.floor(Date.now() / 60000); 
        return `${radarCfg.url}/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=256,256&format=png32&transparent=true&f=image&time=${ts}`;
      };

      hubLayersMap.set(layerKey, radarInstance);
    }

    if (show) {
      if (!map.hasLayer(radarInstance)) radarInstance.addTo(map);
      
      if (!activeLayerKeysOrder.includes(layerKey)) {
        activeLayerKeysOrder.unshift(layerKey);
      }
      if (typeof reorderMapLayers === 'function') reorderMapLayers();
      
      showRadarFloatingWidget(layerTitle);
      if (typeof showToast === 'function') showToast(`Layer ${layerTitle} diaktifkan.`);
    } else {
      if (map.hasLayer(radarInstance)) map.removeLayer(radarInstance);
      activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== layerKey);
      
      hideRadarFloatingWidget();
      if (typeof showToast === 'function') showToast(`Layer ${layerTitle} dinonaktifkan.`);
    }

    if (typeof updateLegendEditor === 'function') updateLegendEditor();
  };

  // Injeksi HTML Legenda Warna Standar Reflektifitas Radar Cuaca
  window.getRadarCMaxLegendHtml = function() {
    return `
      <div class="space-y-1.5 text-xs pt-1">
        <div class="font-bold text-slate-800 border-b pb-1">Reflektifitas (dBZ)</div>
        <div class="space-y-1 text-[11px]">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#00ffff] inline-block shrink-0"></span><span>Sangat Ringan (5 - 15 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#0080ff] inline-block shrink-0"></span><span>Ringan (15 - 25 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#0000ff] inline-block shrink-0"></span><span>Sedang (25 - 35 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#00ff00] inline-block shrink-0"></span><span>Lebat (35 - 45 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ffff00] inline-block shrink-0"></span><span>Sangat Lebat (45 - 50 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ff8000] inline-block shrink-0"></span><span>Ekstrem (50 - 55 dBZ)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ff0000] inline-block shrink-0"></span><span>Badai / Petir (> 55 dBZ)</span></div>
        </div>
      </div>
    `;
  };

  // Integrasi otomatis ke Legend Manager GeoNusa
  document.addEventListener('DOMContentLoaded', function() {
    let originalUpdateLegend = window.updateLegendEditor;
    if (typeof originalUpdateLegend === 'function') {
      window.updateLegendEditor = async function() {
        await originalUpdateLegend();
        if (activeLayerKeysOrder.includes('bmkg_radarcmax')) {
          let legendHtml = window.getRadarCMaxLegendHtml();
          let metaEl = document.getElementById('legend_meta_bmkg_radarcmax');
          let floatMetaEl = document.getElementById('floating_legend_meta_bmkg_radarcmax');
          if (metaEl) metaEl.innerHTML = legendHtml;
          if (floatMetaEl) floatMetaEl.innerHTML = legendHtml;
        }
      };
    }
  });

})();
// Otomatis aktifkan layer Radar CMax BMKG sebagai default saat peta dimuat
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      // Centang checkbox di sidebar secara otomatis jika ada
      let radarCheckbox = document.getElementById('toggleBmkgRadarCmax');
      if (radarCheckbox) {
        radarCheckbox.checked = true;
      }
      // Panggil fungsi toggle untuk memuat layer dan widgetnya ke peta
      if (typeof window.toggleBmkgRadarCmax === 'function') {
        window.toggleBmkgRadarCmax(true);
      }
    }, 600); // Penundaan 600ms memastikan peta utama (Leaflet) sudah siap sepenuhnya
  });
