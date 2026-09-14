/* ==========================================================================
   GeoNusa — MODIS & VIIRS ArcGIS ImageServer Overlay + Time Control (modis-viirs.js)
   ========================================================================== */
(function () {
  'use strict';

  var MODIS_URL = 'https://modis.arcgis.com/arcgis/rest/services/MODIS/ImageServer';
  var VIIRS_URL = 'https://modis.arcgis.com/arcgis/rest/services/VIIRS/ImageServer';

  var modisLayer = null;
  var viirsLayer = null;
  var latestDateStr = '2024-01-01';

  function getSelectedDateRange() {
    var dateInput = document.getElementById('gibsDateRange');
    var dateStr = (dateInput && dateInput.value) ? dateInput.value : latestDateStr;
    var from = new Date(dateStr + 'T00:00:00');
    var to = new Date(dateStr + 'T23:59:59.999');
    return { from: from, to: to };
  }

  function updateTimeRange() {
    var range = getSelectedDateRange();
    if (modisLayer && typeof modisLayer.setTimeRange === 'function') {
      modisLayer.setTimeRange(range.from, range.to);
    }
    if (viirsLayer && typeof viirsLayer.setTimeRange === 'function') {
      viirsLayer.setTimeRange(range.from, range.to);
    }
  }

  window.applyDateChange = function() {
    updateTimeRange();
    if (modisLayer && typeof map !== 'undefined' && map.hasLayer(modisLayer)) {
      modisLayer.redraw();
    }
    if (viirsLayer && typeof map !== 'undefined' && map.hasLayer(viirsLayer)) {
      viirsLayer.redraw();
    }
  };

  function fetchLatestDate() {
    var xhr = new XMLHttpRequest();
    var queryUrl = MODIS_URL + '/query';
    var body = 'where=' + encodeURIComponent('1=1') +
      '&outFields=' + encodeURIComponent('AcquisitionDate') +
      '&orderByFields=' + encodeURIComponent('AcquisitionDate DESC') +
      '&resultRecordCount=1&f=json';
    
    xhr.open('POST', queryUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data && data.features && data.features.length && data.features[0].attributes) {
            var ts = data.features[0].attributes.AcquisitionDate;
            if (ts) {
              var d = new Date(ts);
              latestDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
              
              var dateInput = document.getElementById('gibsDateRange');
              if (dateInput && !dateInput.value) {
                dateInput.value = latestDateStr;
              }
              updateTimeRange();
            }
          }
        } catch (e) { /* abaikan error parse */ }
      }
    };
    xhr.send(body);
  }

  function toggleModis(on) {
    if (typeof showLoading === 'function') showLoading();
    try {
      if (on) {
        if (modisLayer) {
          if (typeof map !== 'undefined' && !map.hasLayer(modisLayer)) modisLayer.addTo(map);
          updateTimeRange();
          return;
        }
        var range = getSelectedDateRange();
        if (typeof L !== 'undefined' && L.esri && L.esri.imageMapLayer) {
          modisLayer = L.esri.imageMapLayer({
            url: MODIS_URL,
            from: range.from,
            to: range.to,
            format: 'jpgpng',
            transparent: true
          });
          if (typeof map !== 'undefined') modisLayer.addTo(map);
        }
      } else {
        if (modisLayer && typeof map !== 'undefined' && map.hasLayer(modisLayer)) {
          map.removeLayer(modisLayer);
        }
        modisLayer = null;
      }
    } catch (err) {
    } finally {
      if (typeof hideLoading === 'function') hideLoading();
    }
  }

  function toggleViirs(on) {
    if (typeof showLoading === 'function') showLoading();
    try {
      if (on) {
        if (viirsLayer) {
          if (typeof map !== 'undefined' && !map.hasLayer(viirsLayer)) viirsLayer.addTo(map);
          updateTimeRange();
          return;
        }
        var range = getSelectedDateRange();
        if (typeof L !== 'undefined' && L.esri && L.esri.imageMapLayer) {
          viirsLayer = L.esri.imageMapLayer({
            url: VIIRS_URL,
            from: range.from,
            to: range.to,
            format: 'jpgpng',
            transparent: true
          });
          if (typeof map !== 'undefined') viirsLayer.addTo(map);
        }
      } else {
        if (viirsLayer && typeof map !== 'undefined' && map.hasLayer(viirsLayer)) {
          map.removeLayer(viirsLayer);
        }
        viirsLayer = null;
      }
    } catch (err) {
    } finally {
      if (typeof hideLoading === 'function') hideLoading();
    }
  }

  function cleanup() {
    if (modisLayer && typeof map !== 'undefined' && map.hasLayer(modisLayer)) map.removeLayer(modisLayer);
    modisLayer = null;
    if (viirsLayer && typeof map !== 'undefined' && map.hasLayer(viirsLayer)) map.removeLayer(viirsLayer);
    viirsLayer = null;
    
    var chkM = document.getElementById('toggleModisOverlay');
    var chkV = document.getElementById('toggleViirsOverlay');
    if (chkM) chkM.checked = false;
    if (chkV) chkV.checked = false;
  }

  function initModisViirs() {
    fetchLatestDate();

    var chkModis = document.getElementById('toggleModisOverlay');
    if (chkModis) {
      chkModis.addEventListener('change', function () {
        toggleModis(this.checked);
      });
    }

    var chkViirs = document.getElementById('toggleViirsOverlay');
    if (chkViirs) {
      chkViirs.addEventListener('change', function () {
        toggleViirs(this.checked);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModisViirs);
  } else {
    initModisViirs();
  }

  window.modisViirsOverlayCleanup = cleanup;
})();