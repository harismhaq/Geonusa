/* ==========================================================================
   GeoNusa — Drawing, Measurement & Export Tools (alat-draw-measure.js)
   ==========================================================================*/

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