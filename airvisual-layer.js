/* ==========================================================================
   GeoNusa — AirVisual PM2.5 & Safe Wind Animation Module (airvisual-layer.js)
   ==========================================================================*/

(function () {
  'use strict';

  var pm25Layer = L.tileLayer('https://osm.airvisual.net/cog/pm25/tiles/{z}/{x}/{y}.png', {
    maxZoom: 12,
    minZoom: 0,
    opacity: 0.75,
    attribution: 'AirVisual'
  });

  var API_URL = 'https://api.open-meteo.com/v1/forecast';
  var GRID_COLUMNS = 8;
  var GRID_ROWS = 6;
  var PARTICLE_COUNT = 400;
  var PARTICLE_LIFETIME = 80;
  var REFRESH_DELAY = 600;
  
  var windLayerInstance = null;
  var canvas = null;
  var context = null;
  var particles = [];
  var windSamples = [];
  var animationId = null;
  var refreshTimer = null;
  var windActive = false;
  var requestId = 0;
  var lastFrame = 0;
  var currentWindTime = 'Live (Real-Time)';

  function resizeCanvas() {
    if (!canvas || typeof map === 'undefined') return;
    var size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
  }

  function createParticle() {
    if (typeof map === 'undefined') return { x: 0, y: 0, previousX: 0, previousY: 0, age: 0, maxAge: PARTICLE_LIFETIME };
    var size = map.getSize();
    return { 
      x: Math.random() * size.x, 
      y: Math.random() * size.y, 
      previousX: 0, 
      previousY: 0,
      age: Math.floor(Math.random() * PARTICLE_LIFETIME), 
      maxAge: PARTICLE_LIFETIME 
    };
  }

  function resetParticles() { 
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle); 
  }

  function buildGridCoordinates() {
    if (typeof map === 'undefined') return [];
    var bounds = map.getBounds();
    var south = Math.max(-85, bounds.getSouth());
    var north = Math.min(85, bounds.getNorth());
    var west = bounds.getWest();
    var east = bounds.getEast();
    var coordinates = [];
    
    for (var row = 0; row < GRID_ROWS; row++) {
      var lat = south + ((north - south) * row / (GRID_ROWS - 1));
      for (var column = 0; column < GRID_COLUMNS; column++) {
        coordinates.push({ lat: lat, lng: west + ((east - west) * column / (GRID_COLUMNS - 1)) });
      }
    }
    return coordinates;
  }

  async function loadWindData() {
    var coordinates = buildGridCoordinates();
    if (!coordinates.length) return;
    var thisRequest = ++requestId;
    
    var lats = coordinates.map(function(p) { return p.lat.toFixed(2); }).join(',');
    var lngs = coordinates.map(function(p) { return p.lng.toFixed(2); }).join(',');
    var requestUrl = API_URL + '?latitude=' + lats + '&longitude=' + lngs + '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms';

    try {
      var response = await fetch(requestUrl);
      if (!response.ok) throw new Error('Open-Meteo HTTP ' + response.status);
      var payload = await response.json();
      var rows = Array.isArray(payload) ? payload : [payload];
      
      if (!windActive || thisRequest !== requestId) return;
      
      windSamples = rows.map(function(item, index) {
        var current = item.current || {};
        var direction = Number(current.wind_direction_10m);
        var speed = Number(current.wind_speed_10m);
        var radians = (direction + 180) * Math.PI / 180;
        return { 
          lat: coordinates[index].lat, 
          lng: coordinates[index].lng,
          u: Number.isFinite(speed) ? speed * Math.sin(radians) : 0,
          v: Number.isFinite(speed) ? speed * Math.cos(radians) : 0 
        };
      }).filter(function(sample) { return Number.isFinite(sample.u) && Number.isFinite(sample.v); });
      
      var sampleTime = rows[0] && rows[0].current && rows[0].current.time;
      if (sampleTime) {
        currentWindTime = formatAirVisualTimestamp(sampleTime);
        updateAirVisualTimeLabel(currentWindTime);
      }
      resetParticles();
    } catch (error) {
      console.error('Open-Meteo wind layer error:', error);
    }
  }

  function formatAirVisualTimestamp(tsStr) {
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

  function updateAirVisualTimeLabel(timeStr) {
    let label = document.getElementById('airvisual-time-label');
    if (label) label.textContent = timeStr;
  }

function showAirVisualFloatingWidget(layerTitle) {
    // [PERBAIKAN 1] Panggil pembersih agar widget lain tertutup otomatis
    if (typeof hideAllFloatingWidgets === 'function') {
      hideAllFloatingWidgets();
    } else {
      let existingAll = document.getElementById('daily-floating-time-widget');
      if (existingAll) existingAll.remove();
      let existingBmkg = document.getElementById('bmkg-floating-time-widget');
      if (existingBmkg) existingBmkg.remove();
    }

    let existing = document.getElementById('airvisual-floating-time-widget');
    if (existing) existing.remove();

    var widget = document.createElement('div');
    widget.id = 'airvisual-floating-time-widget';
    // [PERBAIKAN 2] Disamakan persis kelas CSS, fixed, z-[950], dan ukurannya dengan BMKG
    widget.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[950] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/80 flex flex-col items-center gap-1.5 w-[260px] sm:w-80 select-none';
    widget.innerHTML = `
      <div class="text-[11px] font-bold text-slate-700 tracking-wide text-center truncate w-full">${layerTitle}</div>
      <div class="flex items-center justify-between w-full gap-2">
        <button id="airvisual-prev-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Status Live">
          <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
        </button>
        <input type="range" id="airvisual-time-slider" min="0" max="1" value="1" step="1" class="w-full accent-primary cursor-pointer" />
        <button id="airvisual-next-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-700 font-bold shadow-sm transition-all cursor-pointer shrink-0" title="Status Live">
          <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div id="airvisual-time-label" class="text-xs font-mono font-extrabold text-primary">${currentWindTime}</div>
    `;

    document.body.appendChild(widget);
    if (window.lucide) lucide.createIcons();
}
// Tambahkan fungsi pembersih ini di bawahnya:
function hideAirVisualFloatingWidget() {
    let existing = document.getElementById('airvisual-floating-time-widget');
    if (existing) existing.remove();
}
  function velocityAt(latlng) {
    if (!windSamples.length) return null;
    var u = 0, v = 0, totalWeight = 0;
    for (var i = 0; i < windSamples.length; i++) {
      var sample = windSamples[i];
      var distanceSquared = Math.pow(sample.lat - latlng.lat, 2) + Math.pow(sample.lng - latlng.lng, 2);
      var weight = 1 / Math.max(distanceSquared, 0.0001);
      u += sample.u * weight; 
      v += sample.v * weight; 
      totalWeight += weight;
    }
    return { u: u / totalWeight, v: v / totalWeight };
  }

  function drawFrame(now) {
    if (!windActive || !context || !canvas || typeof map === 'undefined') return;
    animationId = requestAnimationFrame(drawFrame);
    var elapsed = Math.min(2, Math.max(0.4, (now - lastFrame) / 16.67 || 1));
    lastFrame = now;
    var size = map.getSize();
    
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0, 0, 0, 0.08)';
    context.fillRect(0, 0, size.x, size.y);
    context.globalCompositeOperation = 'source-over';
    
    for (var i = 0; i < particles.length; i++) {
      var particle = particles[i];
      var latlng = map.containerPointToLatLng([particle.x, particle.y]);
      var velocity = velocityAt(latlng);
      particle.previousX = particle.x; 
      particle.previousY = particle.y; 
      particle.age -= elapsed;
      
      if (!velocity || particle.age <= 0) { 
        Object.assign(particle, createParticle()); 
        continue; 
      }
      
      var speed = Math.hypot(velocity.u, velocity.v);
      var scale = 0.5 * elapsed;
      particle.x += velocity.u * scale; 
      particle.y -= velocity.v * scale;
      
      if (particle.x < -10 || particle.x > size.x + 10 || particle.y < -10 || particle.y > size.y + 10) {
        Object.assign(particle, createParticle()); 
        continue;
      }
      
      context.beginPath();
      context.lineWidth = Math.min(2.5, 1.2 + speed / 12);
      context.strokeStyle = 'rgba(0, 242, 255, ' + Math.min(0.95, 0.4 + speed / 12) + ')';
      context.moveTo(particle.previousX, particle.previousY); 
      context.lineTo(particle.x, particle.y); 
      context.stroke();
    }
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function() { loadWindData(); }, REFRESH_DELAY);
  }

  var WindParticleLayer = L.Layer.extend({
    onAdd: function() {
      canvas = document.createElement('canvas');
      canvas.className = 'leaflet-wind-particles';
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:700;';
      map.getContainer().appendChild(canvas); 
      context = canvas.getContext('2d'); 
      resizeCanvas();
      
      this.onResize = resizeCanvas; 
      this.onMoveEnd = scheduleRefresh;
      map.on('resize', this.onResize); 
      map.on('moveend zoomend', this.onMoveEnd);
      windActive = true;
      
      loadWindData();
      lastFrame = performance.now(); 
      animationId = requestAnimationFrame(drawFrame);
    },
    onRemove: function() {
      windActive = false; 
      requestId++; 
      clearTimeout(refreshTimer); 
      cancelAnimationFrame(animationId);
      map.off('resize', this.onResize); 
      map.off('moveend zoomend', this.onMoveEnd);
      if (canvas) canvas.remove(); 
      canvas = null; 
      context = null; 
      particles = []; 
      windSamples = [];
    }
  });

  var airWindGroup = L.layerGroup();

  window.toggleAirVisualPM25 = function (show) {
    if (typeof map === 'undefined') return;
    const layerKey = 'air_wind_combined';
    const layerTitle = 'Particulate Matter (PM 2.5) + Angin';
    
    if (!hubLayerNames.has(layerKey)) {
      hubLayerNames.set(layerKey, layerTitle);
    }
    if (!layerOpacities.has(layerKey)) layerOpacities.set(layerKey, 0.75);

    let compositeLayer = hubLayersMap.get(layerKey);
    if (!compositeLayer) {
      if (!airWindGroup.hasLayer(pm25Layer)) airWindGroup.addLayer(pm25Layer);
      if (!windLayerInstance) windLayerInstance = new WindParticleLayer();
      if (!airWindGroup.hasLayer(windLayerInstance)) airWindGroup.addLayer(windLayerInstance);
      hubLayersMap.set(layerKey, airWindGroup);
      compositeLayer = airWindGroup;
    }

    if (show) {
      if (!map.hasLayer(compositeLayer)) compositeLayer.addTo(map);
      if (!activeLayerKeysOrder.includes(layerKey)) activeLayerKeysOrder.unshift(layerKey);
      if (typeof reorderMapLayers === 'function') reorderMapLayers();
      
      showAirVisualFloatingWidget(layerTitle);
      if (typeof showToast === 'function') showToast('Layer PM2.5 & Arah Angin diaktifkan.');
    } else {
      if (map.hasLayer(compositeLayer)) map.removeLayer(compositeLayer);
      activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== layerKey);
      
      hideAirVisualFloatingWidget();
      if (typeof showToast === 'function') showToast('Layer PM2.5 & Arah Angin dinonaktifkan.');
    }
    if (typeof updateLegendEditor === 'function') updateLegendEditor();
  };

  window.getAirVisualLegendHtml = function() {
    return `
      <div class="space-y-1.5 text-xs pt-1">
        <div class="font-bold text-slate-800 border-b pb-1">PM2.5 (µg/m³)</div>
        <div class="space-y-1 text-[11px]">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#00e400] inline-block shrink-0"></span><span>0 - 12 (Baik)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ffff00] inline-block shrink-0"></span><span>12.1 - 35.4 (Sedang)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ff7e00] inline-block shrink-0"></span><span>35.5 - 55.4 (Sensitif)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#ff0000] inline-block shrink-0"></span><span>55.5 - 150.4 (Tidak Sehat)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#8f3f97] inline-block shrink-0"></span><span>> 150.5 (Sangat Tidak Sehat)</span></div>
        </div>
        <div class="border-t pt-1 mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
          <span class="flex items-center gap-1 font-medium"><span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Partikel Animasi Angin</span>
        </div>
      </div>
    `;
  };

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function() {
      var possibleIds = ['toggleAirWind', 'toggleWindAnim', 'toggleAirvisual_pm25'];
      var checkbox = null;
      for (var i = 0; i < possibleIds.length; i++) {
        checkbox = document.getElementById(possibleIds[i]);
        if (checkbox) break;
      }
      if (checkbox && checkbox.checked) {
        window.toggleAirVisualPM25(true);
      }
    }, 400);
  });
})();