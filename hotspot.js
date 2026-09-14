/* ==========================================================================
   GeoNusa — Hotspot Karhutla Module (hotspot.js)
   ==========================================================================*/

(function () {
  'use strict';

  var HOTSPOT_API = 'https://opsroom.sipongidata.my.id/api/opsroom/indoHotspot?wilayah=IN&filterperiode=false&from=&to=&late=24&satelit[]=NASA-MODIS&satelit[]=NASA-SNPP&satelit[]=NASA-NOAA20&confidence[]=low&confidence[]=medium&confidence[]=high&provinsi=&kabkota=';

  var heatmapLayer = null;
  var hotspotMarkerGroup = null;
  var hotspotDataLoaded = false;
  var hotspotFeatures = [];
  var allData = [];
  var filteredData = [];
  var hotspotGroupLayer = L.layerGroup();

  function getConfidenceColor(level) {
    var l = (level || '').toLowerCase();
    if (l === 'high') return '#dc2626';    // Merah
    if (l === 'medium') return '#f59e0b';  // Kuning / Amber
    return '#22c55e';                      // Hijau
  }

  function fetchHotspotData(callback) {
    fetch(HOTSPOT_API)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (json) { callback(null, json); })
      .catch(function (e) { callback(e, null); });
  }

  function loadHotspotData(callback) {
    if (hotspotDataLoaded) { callback(true); return; }
    fetchHotspotData(function (err, geojson) {
      if (err || !geojson || !geojson.features) {
        console.error('[Hotspot] Gagal fetch:', err);
        callback(false);
        return;
      }
      hotspotFeatures = geojson.features;
      allData = aggregateFeatures(hotspotFeatures);
      filteredData = allData.slice();
      hotspotDataLoaded = true;
      callback(true);
    });
  }

  function aggregateFeatures(features) {
    var result = [];
    for (var i = 0; i < features.length; i++) {
      var p = features[i].properties;
      if (p.lat == null || p.long == null) continue;
      var conf = p.confidence_level || 'Low';
      conf = conf.charAt(0).toUpperCase() + conf.slice(1);
      result.push({
        provinsi: p.nama_provinsi || '-',
        kabupaten: p.kabkota || '-',
        sumber: p.sumber || '-',
        confidence: conf,
        tanggal: p.date_hotspot || '-'
      });
    }
    return result;
  }

  function showHotspotLayer() {
    loadHotspotData(function (ok) {
      if (!ok || !hotspotFeatures.length) return;

      var high = 0, medium = 0, low = 0;
      var latlngs = [];

      hotspotMarkerGroup = L.layerGroup();

      for (var i = 0; i < hotspotFeatures.length; i++) {
        var f = hotspotFeatures[i];
        var p = f.properties;
        if (p.lat == null || p.long == null) continue;

        if (p.confidence_level === 'high') high++;
        else if (p.confidence_level === 'medium') medium++;
        else low++;

        var intensity = p.confidence_level === 'high' ? 1.0 : p.confidence_level === 'medium' ? 0.6 : 0.3;
        latlngs.push([p.lat, p.long, intensity]);

        var color = getConfidenceColor(p.confidence_level);
        var marker = L.circleMarker([p.lat, p.long], {
          radius: 4,
          fillColor: color,
          color: '#fff',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.85
        });

        var popupHtml = `
          <div class="p-1 min-w-[200px] font-sans">
            <strong class="text-xs font-bold text-slate-800 block mb-1">Hotspot Karhutla</strong>
            <div class="text-[11px] text-slate-600 space-y-0.5">
              <div><b>${p.desa || '-'}</b>, ${p.kecamatan || '-'}</div>
              <div>${p.kabkota || '-'}, ${p.nama_provinsi || '-'}</div>
              <div class="mt-1">${p.sumber || '-'} | <span style="color:${color}" class="font-bold">${p.confidence_level || '-'}</span></div>
              <div class="text-[10px] text-slate-400">${p.date_hotspot || '-'}</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        hotspotMarkerGroup.addLayer(marker);
      }

      if (typeof L.heatLayer === 'function') {
        heatmapLayer = L.heatLayer(latlngs, { 
          radius: 20, blur: 15, maxZoom: 17, max: 1.0,
          gradient: { 0.2: '#22c55e', 0.5: '#f59e0b', 1.0: '#dc2626' }
        });
      }

      // Masukkan ke group layer utama
      hotspotGroupLayer.clearLayers();
      if (heatmapLayer) hotspotGroupLayer.addLayer(heatmapLayer);
      if (hotspotMarkerGroup) hotspotGroupLayer.addLayer(hotspotMarkerGroup);

      const layerKey = 'hotspot_karhutla';
      hubLayerNames.set(layerKey, 'Titik Panas Karhutla (24 Jam)');
      hubLayersMap.set(layerKey, hotspotGroupLayer);

      hotspotGroupLayer.addTo(map);
      if (!activeLayerKeysOrder.includes(layerKey)) activeLayerKeysOrder.unshift(layerKey);
      if (typeof reorderMapLayers === 'function') reorderMapLayers();

      renderHotspotUI(high, medium, low);
      if (typeof updateLegendEditor === 'function') updateLegendEditor();
    });
  }

  // Fungsi tunggal yang bersih untuk menutup/menghilangkan layer hotspot sepenuhnya
  function hideHotspotLayer() {
    const layerKey = 'hotspot_karhutla';
    
    // 1. Hapus layer dari peta jika sedang tampil
    var layer = hubLayersMap.get(layerKey);
    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
    
    // 2. Hapus referensi dari daftar layer aktif global
    activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== layerKey);
    hubLayersMap.delete(layerKey);

    if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null; }
    if (hotspotMarkerGroup) { map.removeLayer(hotspotMarkerGroup); hotspotMarkerGroup = null; }
    
    // 3. Sembunyikan legenda melayang
    hideFloatingLegend();
    
    // 4. Reset menu Tools / Legenda Editor ke teks kosong default
    var legendListEl = document.getElementById('legend-editor-list');
    if (legendListEl) {
      legendListEl.innerHTML = '<p class="text-[11px] text-slate-500 italic">Belum ada layer aktif yang ditampilkan.</p>';
    }
    
    // 5. Hapus total kartu Ringkasan Hotspot di tab Cuaca
    var summaryContainer = document.getElementById('hotspot-summary-card');
    if (summaryContainer) summaryContainer.innerHTML = '';

    // 6. Hapus total tabel Top 5 Provinsi di tab Cuaca
    var tableContainer = document.getElementById('hotspot-table-container');
    if (tableContainer) tableContainer.innerHTML = '';

    // 7. Matikan centang (uncheck) pada checkbox di tab cuaca
    var checkbox = document.getElementById('toggleHotspotLayer');
    if (checkbox) checkbox.checked = false;

    // 8. Perbarui editor legenda sistem secara keseluruhan
    if (typeof updateLegendEditor === 'function') updateLegendEditor();
  }

  function showFloatingLegend(high, medium, low) {
    var legendEl = document.getElementById('floating-legend');
    var contentEl = document.getElementById('floating-legend-content');
    if (!legendEl || !contentEl) return;

    contentEl.innerHTML = `
      <div class="space-y-1.5 text-xs">
        <div class="font-bold text-slate-800 border-b pb-1">Titik Panas Karhutla</div>
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> High</span>
          <span class="font-semibold text-slate-600">${high}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Medium</span>
          <span class="font-semibold text-slate-600">${medium}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Low</span>
          <span class="font-semibold text-slate-600">${low}</span>
        </div>
      </div>
    `;
    legendEl.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function hideFloatingLegend() {
    var legendEl = document.getElementById('floating-legend');
    if (legendEl) legendEl.classList.add('hidden');
  }

  function renderHotspotUI(high, medium, low) {
    var total = high + medium + low;
    
    // Render Legenda ke menu Tools (#legend-editor-list) lengkap dengan tombol tutup 'x'
    var legendListEl = document.getElementById('legend-editor-list');
    if (legendListEl) {
      legendListEl.innerHTML = `
        <div class="bg-white/60 border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-2">
          <div class="flex items-center justify-between font-bold text-xs text-slate-800 border-b pb-1.5">
            <span class="truncate">Titik Panas Karhutla (24 Jam)</span>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">${total.toLocaleString('id-ID')} Titik</span>
              <button id="closeHotspotLayerBtn" class="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer" title="Tutup Layer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-600 inline-block shadow-xs"></span> High Confidence</span>
              <span class="font-bold text-slate-700">${high.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs"></span> Medium Confidence</span>
              <span class="font-bold text-slate-700">${medium.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs"></span> Low Confidence</span>
              <span class="font-bold text-slate-700">${low.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      `;

      var closeBtn = document.getElementById('closeHotspotLayerBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          hideHotspotLayer();
        });
      }
    }

    var summaryContainer = document.getElementById('hotspot-summary-card');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="bg-white/40 border border-white/60 rounded-2xl p-3 shadow-sm space-y-2 mt-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <i data-lucide="flame" class="w-4 h-4 text-rose-500"></i> Ringkasan Hotspot
            </span>
            <span class="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">${total.toLocaleString('id-ID')} Titik</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5 text-center">
            <div class="bg-white/60 p-1.5 rounded-xl border border-white/50">
              <div class="text-[10px] text-slate-500 font-semibold">High</div>
              <div class="text-xs font-extrabold text-rose-600">${high}</div>
            </div>
            <div class="bg-white/60 p-1.5 rounded-xl border border-white/50">
              <div class="text-[10px] text-slate-500 font-semibold">Medium</div>
              <div class="text-xs font-extrabold text-amber-600">${medium}</div>
            </div>
            <div class="bg-white/60 p-1.5 rounded-xl border border-white/50">
              <div class="text-[10px] text-slate-500 font-semibold">Low</div>
              <div class="text-xs font-extrabold text-emerald-600">${low}</div>
            </div>
          </div>
        </div>
      `;
    }

    var tableContainer = document.getElementById('hotspot-table-container');
    if (tableContainer) {
      renderTableContent(tableContainer);
    }

    if (window.lucide) lucide.createIcons();
  }

  function renderTableContent(container) {
    var provMap = {};
    for (var i = 0; i < allData.length; i++) {
      var d = allData[i];
      var prov = d.provinsi;
      if (!provMap[prov]) {
        provMap[prov] = { provinsi: prov, total: 0, tanggal: d.tanggal };
      }
      provMap[prov].total++;
      if (d.tanggal && d.tanggal > provMap[prov].tanggal) {
        provMap[prov].tanggal = d.tanggal;
      }
    }

    var aggregatedList = [];
    var keys = Object.keys(provMap);
    for (var k = 0; k < keys.length; k++) {
      aggregatedList.push(provMap[keys[k]]);
    }
    aggregatedList.sort(function (a, b) { return b.total - a.total; });

    var searchVal = document.getElementById('hotspotSearchInput') ? document.getElementById('hotspotSearchInput').value.toLowerCase().trim() : '';
    var displayList = aggregatedList.filter(function (item) {
      return item.provinsi.toLowerCase().includes(searchVal);
    });

    var top5List = displayList.slice(0, 5);
    var rowsHtml = '';

    for (var j = 0; j < top5List.length; j++) {
      var item = top5List[j];
      rowsHtml += `
        <tr class="border-b border-slate-100 hover:bg-white/30 transition-all">
          <td class="py-2.5 px-1 text-[10px] text-slate-600 font-bold">${j + 1}</td>
          <td class="py-2.5 px-1 text-[10px] font-extrabold text-slate-800">${item.provinsi}</td>
          <td class="py-2.5 px-1 text-[10px] text-center"><span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold">${item.total.toLocaleString('id-ID')} Titik</span></td>
          <td class="py-2.5 px-1 text-[10px] text-slate-500">${item.tanggal}</td>
        </tr>
      `;
    }

    if (top5List.length === 0) {
      rowsHtml = `<tr><td colspan="4" class="text-center py-3 text-[11px] text-slate-400 italic">Tidak ada data ditemukan</td></tr>`;
    }

    container.innerHTML = `
      <div class="bg-white/40 border border-white/60 rounded-2xl p-3 shadow-sm space-y-2 mt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-rose-600"></i> Top 5 Provinsi Hotspot Terbanyak
          </span>
          <span class="text-[10px] text-slate-500 font-semibold">24 Jam Terakhir</span>
        </div>
        <input type="text" id="hotspotSearchInput" placeholder="Cari provinsi..." value="${searchVal}" class="w-full px-3 py-1.5 text-xs border border-white/60 rounded-xl bg-white/50 focus:bg-white focus:border-primary outline-none transition-all" />
        <div class="overflow-x-auto max-h-48 custom-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase">
                <th class="py-1.5 px-1">No</th>
                <th class="py-1.5 px-1">Provinsi</th>
                <th class="py-1.5 px-1 text-center">Jumlah</th>
                <th class="py-1.5 px-1">Tanggal</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;

    var searchInput = document.getElementById('hotspotSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        renderTableContent(container);
      });
    }
  }

  // Event listener saat checkbox dicentang / di-uncheck
  document.addEventListener('DOMContentLoaded', function () {
    var checkbox = document.getElementById('toggleHotspotLayer');
    if (checkbox) {
      checkbox.addEventListener('change', function () {
        if (this.checked) {
          showHotspotLayer();
        } else {
          hideHotspotLayer();
        }
      });
    }
  });
})();