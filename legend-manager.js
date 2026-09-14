/* ==========================================================================
   GeoNusa — Legend & Active Layers Manager (legend-manager.js)
   ==========================================================================*/

function reorderMapLayers() {
  [...activeLayerKeysOrder].reverse().forEach((cacheKey, index) => {
    const layer = geoportalLayers.get(cacheKey) || hubLayersMap.get(cacheKey);
    if (layer && map.hasLayer(layer)) {
      const zIndexVal = 500 + index * 10;
      if (typeof layer.setZIndex === 'function') layer.setZIndex(zIndexVal);
      if (typeof layer.bringToFront === 'function') {
        try { layer.bringToFront(); } catch (e) {}
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

function changeLayerColor(cacheKey, newColor) {
  layerColors.set(cacheKey, newColor);
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;
  const rgbaColor = hexToRgba(newColor, opacity);
  
  document.querySelectorAll(`[data-legend-box="${CSS.escape(cacheKey)}"]`).forEach(box => {
    box.style.backgroundColor = rgbaColor;
    box.style.borderColor = newColor;
  });
  applyLayerStyle(cacheKey);
}

function changeLayerOpacity(cacheKey, newOpacity) {
  const parsedOpacity = parseFloat(newOpacity);
  layerOpacities.set(cacheKey, parsedOpacity);
  const color = layerColors.get(cacheKey) || '#008bb0';
  const rgbaColor = hexToRgba(color, parsedOpacity);
  
  document.querySelectorAll(`[data-legend-box="${CSS.escape(cacheKey)}"]`).forEach(box => {
    box.style.backgroundColor = rgbaColor;
  });
  applyLayerStyle(cacheKey);
}

function applyLayerStyle(cacheKey) {
  const layer = geoportalLayers.get(cacheKey);
  const hubLayer = hubLayersMap.get(cacheKey);
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;

  if (layer) {
    const color = layerColors.get(cacheKey) || '#008bb0';
    if (typeof layer.setStyle === 'function') layer.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(sub => { if (typeof sub.setStyle === 'function') sub.setStyle({ color: color, fillColor: color, fillOpacity: opacity }); });
    }
    if (typeof layer.setOpacity === 'function') layer.setOpacity(opacity);
  }
  if (hubLayer && typeof hubLayer.setOpacity === 'function') hubLayer.setOpacity(opacity);
}

async function updateLegendEditor() {
  const container = document.getElementById('legend-editor-list');
  const floatingLegend = document.getElementById('floating-legend');
  const floatingContent = document.getElementById('floating-legend-content');

  const activeEntries = activeLayerKeysOrder.filter(key => {
    const l = geoportalLayers.get(key) || hubLayersMap.get(key);
    return l && map.hasLayer(l);
  });

  if (container) {
    if (activeEntries.length === 0) {
      container.innerHTML = '<p class="text-[11px] text-slate-400 italic">Belum ada layer aktif.</p>';
    } else {
      container.innerHTML = activeEntries.map((cacheKey, idx) => {
        let cleanName = '';
        let isGeoportal = cacheKey.includes('::');
        let isMagelang = cacheKey.includes('magelangkab.go.id');

        if (isGeoportal) {
          const [, layerName] = cacheKey.split('::');
          cleanName = resolveGeoportalLayerName(layerName);
        } else {
          cleanName = hubLayerNames.get(cacheKey) || cacheKey;
        }

        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;
        const rgbaColor = hexToRgba(activeColor, activeOpacity);
        const isColorBoxOnly = (isGeoportal && !isMagelang) || cacheKey.startsWith('user_');

        return `
          <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-sm space-y-2">
            <div class="font-semibold text-slate-700 flex items-center justify-between gap-1">
              <span class="truncate pr-1 flex-1">${escapeBMKGHTML(cleanName)}</span>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="moveLayerOrder(${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-30"' : ''}><i data-lucide="chevron-up" class="w-4 h-4"></i></button>
                <button onclick="moveLayerOrder(${idx}, 1)" ${idx === activeEntries.length - 1 ? 'disabled class="opacity-30"' : ''}><i data-lucide="chevron-down" class="w-4 h-4"></i></button>
                <button onclick="removeActiveLayerCustom('${cacheKey}')"><i data-lucide="x" class="w-3.5 h-3.5 text-rose-500"></i></button>
              </div>
            </div>
            ${isColorBoxOnly ? `
              <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-md border border-slate-100 text-[10px]">
                <div class="flex items-center justify-between">
                  <span>Warna:</span>
                  <input type="color" value="${activeColor}" oninput="changeLayerColor('${cacheKey}', this.value)" onchange="changeLayerColor('${cacheKey}', this.value)" class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                </div>
                <div class="flex items-center justify-between gap-1">
                  <span>Opasitas:</span>
                  <input type="range" min="0" max="1" step="0.01" value="${activeOpacity}" oninput="changeLayerOpacity('${cacheKey}', this.value)" class="w-16 h-1.5 accent-primary cursor-pointer" />
                </div>
              </div>
            ` : ''}
            <div id="legend_meta_${CSS.escape(cacheKey)}" class="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              ${isColorBoxOnly ? `
                <div class="flex items-center gap-2 mt-1">
                  <span data-legend-box="${escapeBMKGHTML(cacheKey)}" class="w-4 h-4 rounded border shadow-sm inline-block shrink-0" style="background-color: ${rgbaColor}; border-color: ${activeColor};"></span>
                  <span class="text-[10px] text-slate-600 font-medium">Simbol Peta</span>
                </div>
              ` : '<span class="italic text-slate-400">Memuat legenda asli...</span>'}
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
        let cleanName = '';
        let isGeoportal = cacheKey.includes('::');
        let isMagelang = cacheKey.includes('magelangkab.go.id');

        if (isGeoportal) {
          const [, layerName] = cacheKey.split('::');
          cleanName = resolveGeoportalLayerName(layerName);
        } else {
          cleanName = hubLayerNames.get(cacheKey) || cacheKey;
        }

        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;
        const rgbaColor = hexToRgba(activeColor, activeOpacity);
        const isColorBoxOnly = (isGeoportal && !isMagelang) || cacheKey.startsWith('user_');

        return `
          <div class="space-y-1.5 py-1">
            <div class="font-semibold text-slate-800 text-[11px] truncate">${escapeBMKGHTML(cleanName)}</div>
            ${isColorBoxOnly ? `
              <div class="flex items-center gap-1.5 px-1 pt-0.5">
                <span data-legend-box="${escapeBMKGHTML(cacheKey)}" class="w-4 h-4 rounded border shadow-sm inline-block shrink-0" style="background-color: ${rgbaColor}; border-color: ${activeColor};"></span>
              </div>
            ` : `<div id="floating_legend_meta_${CSS.escape(cacheKey)}" class="text-[10px] text-slate-500">Memuat simbol...</div>`}
          </div>
        `;
      }).join('<hr class="my-1.5 border-gray-100" />');
    }
  }

  if (window.lucide) lucide.createIcons();

  // Injeksi Legenda Khusus untuk Titik Panas & AirVisual agar Tergabung Sempurna
  activeEntries.forEach((cacheKey) => {
    const metaEl = document.getElementById(`legend_meta_${CSS.escape(cacheKey)}`);
    const floatMetaEl = document.getElementById(`floating_legend_meta_${CSS.escape(cacheKey)}`);

    if (cacheKey === 'hotspot_karhutla') {
      const hotspotLegendHtml = `
        <div class="space-y-1.5 text-xs pt-1">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-600 inline-block"></span> High Confidence</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Medium Confidence</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Low Confidence</span>
          </div>
        </div>
      `;
      if (metaEl) metaEl.innerHTML = hotspotLegendHtml;
      if (floatMetaEl) floatMetaEl.innerHTML = hotspotLegendHtml;
    } else if (cacheKey === 'air_wind_combined' && typeof window.getAirVisualLegendHtml === 'function') {
      const airLegendHtml = window.getAirVisualLegendHtml();
      if (metaEl) metaEl.innerHTML = airLegendHtml;
      if (floatMetaEl) floatMetaEl.innerHTML = airLegendHtml;
    }
  });

  activeEntries.forEach(async (cacheKey) => {
    let targetUrl = '';
    let layerNameParam = '';
    let isGeoportal = cacheKey.includes('::');
    let isMagelang = cacheKey.includes('magelangkab.go.id');
    let specificLayerId = null;

    if (isGeoportal && isMagelang) {
      const parts = cacheKey.split('::');
      targetUrl = parts[0];
      layerNameParam = parts[1];
    } else if (cacheKey.startsWith('sda_')) {
      const sId = cacheKey.replace('sda_', '');
      const found = SDA_LAYERS.find(l => String(l.id) === String(sId));
      if (found) {
        targetUrl = found.url.startsWith('https://simontana') ? normalizeArcGISMapServerUrl(found.url) : 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer';
        specificLayerId = String(sId).startsWith('simontana_') ? null : sId;
      }
    } else if (cacheKey.startsWith('kehutanan_')) {
      const sId = cacheKey.replace('kehutanan_', '');
      const found = KEHUTANAN_LAYERS.find(l => String(l.id) === String(sId));
      if (found) { targetUrl = normalizeArcGISMapServerUrl(found.url); specificLayerId = sId; }
    } else if (cacheKey.startsWith('perizinan_')) {
      const sId = cacheKey.replace('perizinan_', '');
      const found = PERIZINAN_PERTANAHAN_LAYERS.find(l => String(l.id) === String(sId));
      if (found) { targetUrl = normalizeArcGISMapServerUrl(found.url); specificLayerId = sId; }
    } else if (cacheKey.startsWith('batas_')) {
      const bId = cacheKey.replace('batas_', '');
      const found = BATAS_LAYERS.find(l => String(l.id) === String(bId));
      if (found) { targetUrl = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer'; specificLayerId = bId; }
    } else if (cacheKey.startsWith('transmigrasi_')) {
      const tId = cacheKey.replace('transmigrasi_', '');
      const found = TRANSMIGRASI_LAYERS.find(l => String(l.id) === String(tId));
      if (found) { targetUrl = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/KAWASAN_KHUSUS_DAN_TRANSMIGRASI/MapServer'; specificLayerId = tId; }
    } else if (cacheKey.startsWith('sarana_')) {
      const sId = cacheKey.replace('sarana_', '');
      const found = SARANA_PRASARANA_LAYERS.find(l => String(l.id) === String(sId));
      if (found) { targetUrl = normalizeArcGISMapServerUrl(found.url); specificLayerId = sId; }
    } else if (cacheKey.startsWith('bencana_')) {
      const bId = cacheKey.replace('bencana_', '');
      const found = KEBENCANAAN_LAYERS.find(b => b.id === bId);
      if (found) targetUrl = normalizeArcGISMapServerUrl(found.url);
    }

    const metaEl = document.getElementById(`legend_meta_${CSS.escape(cacheKey)}`);
    const floatMetaEl = document.getElementById(`floating_legend_meta_${CSS.escape(cacheKey)}`);

    if (isMagelang && targetUrl) {
      const cleanBase = targetUrl.split('?')[0];
      const legendUrl = `${cleanBase}?service=WMS&version=1.1.1&request=GetLegendGraphic&format=image/png&layer=${encodeURIComponent(layerNameParam)}`;
      const wmsLegendHTML = `<div class="mt-1"><img src="${legendUrl}" alt="Legenda" class="max-w-full h-auto object-contain border border-slate-200 rounded bg-white p-1" onerror="this.parentElement.innerHTML='<span class=\\'text-slate-400 italic\\'>Legenda standar server.</span>';" /></div>`;
      if (metaEl) metaEl.innerHTML = wmsLegendHTML;
      if (floatMetaEl) floatMetaEl.innerHTML = wmsLegendHTML;
      return;
    }

    if (!targetUrl || isGeoportal) return;

    try {
      const legendFetchUrl = `${normalizeArcGISMapServerUrl(targetUrl)}/legend?f=json`;
      const res = await fetch(legendFetchUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error();

      const data = await res.json();
      if (data && data.layers && data.layers.length > 0) {
        const filteredLayers = specificLayerId !== null
          ? data.layers.filter(lyr => String(lyr.layerId) === String(specificLayerId))
          : data.layers;

        let legendHTML = '<div class="space-y-1 mt-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">';
        filteredLayers.forEach(lyr => {
          if (lyr.layerName && specificLayerId === null) {
            legendHTML += `<div class="font-bold text-[10px] text-slate-700 mt-1 pb-0.5 border-b border-gray-100">${escapeBMKGHTML(lyr.layerName)}</div>`;
          }
          if (lyr.legend && lyr.legend.length > 0) {
            lyr.legend.forEach(item => {
              const imgSrc = item.imageData ? `data:${item.contentType};base64,${item.imageData}` : '';
              legendHTML += `
                <div class="flex items-center gap-2 py-0.5">
                  ${imgSrc ? `<img src="${imgSrc}" class="w-4 h-4 object-contain shrink-0 border border-slate-200 rounded bg-white" />` : ''}
                  <span class="text-[10px] text-slate-700 leading-tight">${escapeBMKGHTML(item.label || lyr.layerName)}</span>
                </div>
              `;
            });
          }
        });
        legendHTML += '</div>';

        if (filteredLayers.length > 0 && filteredLayers.some(l => l.legend && l.legend.length > 0)) {
          if (metaEl) metaEl.innerHTML = legendHTML;
          if (floatMetaEl) floatMetaEl.innerHTML = legendHTML;
          return;
        }
      }
      throw new Error();
    } catch (e) {
      const fallbackHTML = `<div class="mt-1 space-y-1"><div class="text-[10px] text-slate-600 bg-amber-50 border border-amber-200 p-1.5 rounded"><span class="font-bold block text-amber-800">Legenda belum tersedia</span></div></div>`;
      if (metaEl) metaEl.innerHTML = fallbackHTML;
      if (floatMetaEl) floatMetaEl.innerHTML = '<span class="text-[10px] text-slate-500 italic">Legenda tidak tersedia</span>';
    }
  });
}

function removeActiveLayerCustom(cacheKey) {
  const layer = geoportalLayers.get(cacheKey) || hubLayersMap.get(cacheKey);
  if (layer) map.removeLayer(layer);
  activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== cacheKey);
  
  if (cacheKey.includes('::')) {
    const [wmsUrl, layerName] = cacheKey.split('::');
    const cb = document.querySelector(`input[data-layer-id="${layerName}"][onchange*="${wmsUrl}"]`);
    if (cb) cb.checked = false;
  } else {
    // 1. Cek berdasarkan data-hub-key
    const cb = document.querySelector(`input[data-hub-key="${cacheKey}"]`);
    if (cb) cb.checked = false;

    // 2. Penanganan khusus untuk layer Cuaca, Satelit, Hotspot, & AirVisual di tab Cuaca & Iklim
    if (cacheKey === 'hotspot_karhutla') {
      const hotspotCb = document.getElementById('toggleHotspotLayer');
      if (hotspotCb) hotspotCb.checked = false;
      if (typeof hideHotspotLayer === 'function') hideHotspotLayer();
    } else if (cacheKey === 'air_wind_combined') {
      const airCb = document.getElementById('toggleAirvisual_pm25');
      if (airCb) airCb.checked = false;
    } else {
      // Uncheck checkbox berdasarkan ID langsung atau atribut terkait
      const directCb = document.getElementById(cacheKey);
      if (directCb) directCb.checked = false;
    }
  }

  // PEMBERSIHAN UNIVERSAL: Hapus SEMUA widget waktu mengambang yang mungkin tertinggal di peta
  ['airvisual-floating-time-widget', 'himawari-floating-time-widget', 'satelit-floating-time-widget'].forEach(widgetId => {
    let w = document.getElementById(widgetId);
    if (w) w.remove();
  });

  // Hapus juga elemen widget lain yang berakhiran '-floating-time-widget'
  document.querySelectorAll('[id$="-floating-time-widget"]').forEach(el => el.remove());

  updateLegendEditor();
}