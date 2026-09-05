/* ==========================================================================
   GeoNusa — WebGIS Geografi Nusantara
   Application Logic (Full Features: Color & Opacity Editor for All Layers)
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

// Koordinat Fallback Pusat Wilayah
const REGION_CENTER_FALLBACKS = {
  'magelangkab': [-7.4917, 110.2137, 11],
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

// Daftar 74 Layer Kebencanaan BNPB / InaRisk dari Excel
const KEBENCANAAN_LAYERS = [
  { id: 'bencana_01', name: 'Arah Jalur Evakuasi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Arah_jalur_evakuasi/MapServer' },
  { id: 'bencana_02', name: 'Batas Administrasi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/batas_administrasi/MapServer' },
  { id: 'bencana_03', name: 'DIBI Hidrometeorologi 2015-2024', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/DIBI_Hidromet_2015_2024/MapServer' },
  { id: 'bencana_04', name: 'DIBI Provinsi Hidrometeorologi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/DIBI_Provinsi_2015_2024_Hidromet/MapServer' },
  { id: 'bencana_05', name: 'Faults New (Sesar/Patahan)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults_new/MapServer' },
  { id: 'bencana_06', name: 'Faults (Sesar/Patahan)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer' },
  { id: 'bencana_07', name: 'Global Tsunami Modelling', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/global_tsunami_modelling/MapServer' },
  { id: 'bencana_08', name: 'Indeks Bahaya Banjir JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR_JBTBPJ/MapServer' },
  { id: 'bencana_09', name: 'Indeks Bahaya Banjir Proyeksi JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_10', name: 'Indeks Bahaya Banjir Bandang JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIRBANDANG_JBTBPJ/MapServer' },
  { id: 'bencana_11', name: 'Indeks Bahaya Banjir Bandang Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIRBANDANG_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_12', name: 'Indeks Bahaya Tanah Longsor JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_TANAHLONGSOR_JBTBPJ/MapServer' },
  { id: 'bencana_13', name: 'Indeks Bahaya Tanah Longsor Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_TANAHLONGSOR_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_14', name: 'Indeks Risiko Banjir JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_BANJIR_JBTBPJ/MapServer' },
  { id: 'bencana_15', name: 'Indeks Risiko Banjir Proyeksi JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_BANJIR_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_16', name: 'Indeks Risiko Banjir Bandang JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_BANJIRBANDANG_JBTBPJ/MapServer' },
  { id: 'bencana_17', name: 'Indeks Risiko Banjir Bandang Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_BANJIRBANDANG_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_18', name: 'Indeks Risiko Tanah Longsor JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_TANAHLONGSOR_JBTBPJ/MapServer' },
  { id: 'bencana_19', name: 'Indeks Risiko Tanah Longsor Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_RISIKO_TANAHLONGSOR_PROYEKSI_JBTBPJ/MapServer' },
  { id: 'bencana_20', name: 'Jalur Evakuasi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Jalur_evakuasi/MapServer' },
  { id: 'bencana_21', name: 'Klasifikasi DAS KLHK', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer' },
  { id: 'bencana_22', name: 'Labuan Bajo', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Labuhanbajo/MapServer' },
  { id: 'bencana_23', name: 'Layer Bahaya B3', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_B3/MapServer' },
  { id: 'bencana_24', name: 'Layer Bahaya Banjir 30 Sumatera', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_30_sumatera/MapServer' },
  { id: 'bencana_25', name: 'Layer Bahaya Banjir 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_30/MapServer' },
  { id: 'bencana_26', name: 'Layer Bahaya Banjir Bandang 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_bandang_30/MapServer' },
  { id: 'bencana_27', name: 'Layer Bahaya Banjir JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_JBTBPJ/MapServer' },
  { id: 'bencana_28', name: 'Layer Bahaya Banjir Proyeksi JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_29', name: 'Layer Bahaya Banjir Bandang JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjirbandang_JBTBPJ/MapServer' },
  { id: 'bencana_30', name: 'Layer Bahaya Banjir Bandang Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjirbandang_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_31', name: 'Layer Bahaya Cuaca Ekstrim 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_cuaca_ekstrim_30/MapServer' },
  { id: 'bencana_32', name: 'Layer Bahaya EWP', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_ewp/MapServer' },
  { id: 'bencana_33', name: 'Layer Bahaya Gelombang Ekstrim & Abrasi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gelombang_ekstrim_dan_abrasi_30/MapServer' },
  { id: 'bencana_34', name: 'Layer Bahaya Gempa Mikro Jakarta', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempa_mikro_jkt/MapServer' },
  { id: 'bencana_35', name: 'Layer Bahaya Gempabumi 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi_30/MapServer' },
  { id: 'bencana_36', name: 'Layer Bahaya Gempabumi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi/MapServer' },
  { id: 'bencana_37', name: 'Layer Bahaya Kebakaran Hutan & Lahan', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_kebakaran_hutan_dan_lahan_30/MapServer' },
  { id: 'bencana_38', name: 'Layer Bahaya Kekeringan 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_kekeringan_30/MapServer' },
  { id: 'bencana_39', name: 'Layer Bahaya Letusan Gunungapi 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_letusan_gunungapi_30/MapServer' },
  { id: 'bencana_40', name: 'Layer Bahaya Letusan Gunungapi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_letusan_gunungapi/MapServer' },
  { id: 'bencana_41', name: 'Layer Bahaya Likuefaksi 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_likuefaksi_30/MapServer' },
  { id: 'bencana_42', name: 'Layer Bahaya Multi (2 Bahaya 53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_multi_2_bahaya_53kab/MapServer' },
  { id: 'bencana_43', name: 'Layer Bahaya Multi (3 Bahaya 53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_multi_3_bahaya_53kab/MapServer' },
  { id: 'bencana_44', name: 'Layer Bahaya Multi (8 Bahaya 53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_multi_8_bahaya_53kab/MapServer' },
  { id: 'bencana_45', name: 'Layer Bahaya Tanah Longsor 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanah_longsor_30/MapServer' },
  { id: 'bencana_46', name: 'Layer Bahaya Tanah Longsor JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanahlongsor_JBTBPJ/MapServer' },
  { id: 'bencana_47', name: 'Layer Bahaya Tanah Longsor Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanahlongsor_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_48', name: 'Layer Bahaya Tsunami 30', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tsunami_30/MapServer' },
  { id: 'bencana_49', name: 'Layer Kapasitas EWP', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_kapasitas_ewp/MapServer' },
  { id: 'bencana_50', name: 'Layer Kelas Bahaya Multi 2 (53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_kelas_bahaya_multi_2_bahaya_53kab/MapServer' },
  { id: 'bencana_51', name: 'Layer Kelas Bahaya Multi 3 (53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_kelas_bahaya_multi_3_bahaya_53kab/MapServer' },
  { id: 'bencana_52', name: 'Layer Kelas Bahaya Multi 8 (53 Kab)', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_kelas_bahaya_multi_8_bahaya_53kab/MapServer' },
  { id: 'bencana_53', name: 'Layer Kelas H SDK', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/LAYER_KELAS_H_SDK/MapServer' },
  { id: 'bencana_54', name: 'Layer Kelas R SDK', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/LAYER_KELAS_R_SDK/MapServer' },
  { id: 'bencana_55', name: 'Layer Kelas SDK', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/LAYER_KELAS_SDK/MapServer' },
  { id: 'bencana_56', name: 'Layer Kerentanan EWP', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_kerentanan_ewp/MapServer' },
  { id: 'bencana_57', name: 'Layer KRB Gempabumi Mikro Jakarta', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_krb_gempabumi_mikro_jkt/MapServer' },
  { id: 'bencana_58', name: 'Layer PGA MCEG 100', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_PGA_MCEG_100/MapServer' },
  { id: 'bencana_59', name: 'Layer PGA MCER S1 100', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_PGA_MCER_S1_100/MapServer' },
  { id: 'bencana_60', name: 'Layer PGA MCER Ss 100', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_PGA_MCER_Ss_100/MapServer' },
  { id: 'bencana_61', name: 'Layer Risiko Banjir JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjir_JBTBPJ/MapServer' },
  { id: 'bencana_62', name: 'Layer Risiko Banjir Proyeksi JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjir_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_63', name: 'Layer Risiko Banjir Bandang JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjirbandang_JBTBPJ/MapServer' },
  { id: 'bencana_64', name: 'Layer Risiko Banjir Bandang Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjirbandang_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_65', name: 'Layer Risiko EWP', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_ewp/MapServer' },
  { id: 'bencana_66', name: 'Layer Risiko Tanah Longsor JBTBPJ', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_tanahlongsor_JBTBPJ/MapServer' },
  { id: 'bencana_67', name: 'Layer Risiko Tanah Longsor Proyeksi', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_tanahlongsor_proyeksi_JBTBPJ/MapServer' },
  { id: 'bencana_68', name: 'Peta Bahaya Tsunami Badung', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Peta_Bahaya_Tsunami_badung/MapServer' },
  { id: 'bencana_69', name: 'Peta Bahaya Tsunami', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Peta_bahaya_tsunami/MapServer' },
  { id: 'bencana_70', name: 'Peta Rencana Evakuasi Cilacap', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Peta_Rencana_Evakuasi_Cilacap1/MapServer' },
  { id: 'bencana_71', name: 'PGA 2017 10 50', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/PGA_2017_10_50/MapServer' },
  { id: 'bencana_72', name: 'Renevak Tsunami', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/RENEVAK_tsunami/MapServer' },
  { id: 'bencana_73', name: 'Simulated Landslide Tsunami', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Slimulated_landslide_tsunami/MapServer' },
  { id: 'bencana_74', name: 'ZRB Multibahaya', url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/ZRB_Multibahaya/MapServer' }
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
    renderPertanahanHubList();   
    renderKebencanaanHubList(); 
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

// Fungsi Navigasi Tab Sidebar
function switchSidebarTab(tab) {
  const geoDiv = document.getElementById('sidebar-geoportal');
  const pertanahanDiv = document.getElementById('sidebar-pertanahan');
  const bencanaDiv = document.getElementById('sidebar-kebencanaan');
  const toolDiv = document.getElementById('sidebar-tools');
  
  const tabGeo = document.getElementById('tab-geoportal');
  const tabPertanahan = document.getElementById('tab-pertanahan');
  const tabBencana = document.getElementById('tab-kebencanaan');
  const tabTool = document.getElementById('tab-tools');

  if (geoDiv) geoDiv.classList.add('hidden');
  if (pertanahanDiv) pertanahanDiv.classList.add('hidden');
  if (bencanaDiv) bencanaDiv.classList.add('hidden');
  if (toolDiv) toolDiv.classList.add('hidden');

  const inactiveClass = "flex-1 py-2 font-semibold rounded-md text-gray-500 hover:text-gray-700 transition-all flex flex-col items-center justify-center gap-0.5";
  const activeClass = "flex-1 py-2 font-semibold rounded-md text-primary bg-white shadow-sm transition-all flex flex-col items-center justify-center gap-0.5";

  if (tabGeo) tabGeo.className = inactiveClass;
  if (tabPertanahan) tabPertanahan.className = inactiveClass;
  if (tabBencana) tabBencana.className = inactiveClass;
  if (tabTool) tabTool.className = inactiveClass;

  if (tab === 'geoportal') {
    if (geoDiv) geoDiv.classList.remove('hidden');
    if (tabGeo) tabGeo.className = activeClass;
  } else if (tab === 'pertanahan') {
    if (pertanahanDiv) pertanahanDiv.classList.remove('hidden');
    if (tabPertanahan) tabPertanahan.className = activeClass;
  } else if (tab === 'kebencanaan') {
    if (bencanaDiv) bencanaDiv.classList.remove('hidden');
    if (tabBencana) tabBencana.className = activeClass;
  } else if (tab === 'tools') {
    if (toolDiv) toolDiv.classList.remove('hidden');
    if (tabTool) tabTool.className = activeClass;
  }
}

// Render Daftar Pertanahan Hub
function renderPertanahanHubList() {
  const container = document.getElementById('pertanahan-hub-tree');
  if (!container) return;

  const layers = [
    { id: 'geologi', name: 'Peta Geologi', type: 'geologi' },
    { id: 'gambut', name: 'Peta Lahan Gambut', type: 'gambut' },
    { id: 'kawasan_hutan', name: 'Kawasan Hutan (ESDM)', type: 'kawasan_hutan' },
    { id: 'pippib', name: 'Peta PIPPIB', type: 'pippib' },
    { id: 'sawah_dilindungi', name: 'Peta Sawah Dilindungi', type: 'sawah_dilindungi' }
  ];

  container.innerHTML = layers.map(l => `
    <label class="layer-item flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
      <input type="checkbox" data-hub-key="pertanahan_${l.type}" onchange="toggleHubLayer('pertanahan', '${l.type}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer" />
      <i data-lucide="map" class="w-3.5 h-3.5 text-primary shrink-0"></i>
      <span class="text-xs font-medium text-slate-700">${escapeBMKGHTML(l.name)}</span>
    </label>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// Render Daftar Kebencanaan Hub (74 Layer BNPB)
function renderKebencanaanHubList() {
  const container = document.getElementById('kebencanaan-hub-tree');
  if (!container) return;

  container.innerHTML = KEBENCANAAN_LAYERS.map(l => `
    <label class="layer-item flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
      <input type="checkbox" data-hub-key="bencana_${l.id}" onchange="toggleHubLayer('bencana', '${l.id}', this.checked)" class="w-4 h-4 accent-primary rounded cursor-pointer" />
      <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-rose-500 shrink-0"></i>
      <span class="text-xs font-medium text-slate-700">${escapeBMKGHTML(l.name)}</span>
    </label>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// Penyimpanan cache layer dinamis
const hubLayersMap = new Map();
const hubLayerNames = new Map();

function toggleHubLayer(category, typeOrId, visible) {
  showLoading();
  try {
    let mapServerUrl = "";
    let subLayerIndex = "show:0";
    let layerDisplayName = "";

    if (category === 'pertanahan') {
      if (typeOrId === 'geologi') {
        mapServerUrl = "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer";
        subLayerIndex = "show:8";
        layerDisplayName = "Peta Geologi";
      } else if (typeOrId === 'gambut') {
        mapServerUrl = "https://simontana.kehutanan.go.id/arcgis/rest/services/simontana/gambut/MapServer";
        layerDisplayName = "Peta Lahan Gambut";
      } else if (typeOrId === 'kawasan_hutan') {
        mapServerUrl = "https://geoportal.esdm.go.id/gis1/rest/services/Kawasan_Hutan/MapServer";
        layerDisplayName = "Kawasan Hutan (ESDM)";
      } else if (typeOrId === 'pippib') {
        mapServerUrl = "https://simontana.kehutanan.go.id/arcgis/rest/services/PIPPIB/PIPPIB_Tahun_2023_Periode_I/MapServer";
        layerDisplayName = "Peta PIPPIB";
      } else if (typeOrId === 'sawah_dilindungi') {
        mapServerUrl = "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer";
        subLayerIndex = "show:59";
        layerDisplayName = "Peta Sawah Dilindungi";
      }
    } else if (category === 'bencana') {
      const found = KEBENCANAAN_LAYERS.find(b => b.id === typeOrId);
      if (found) {
        mapServerUrl = found.url;
        layerDisplayName = found.name;
      }
    }

    if (!mapServerUrl) return;

    let layerKey = `${category}_${typeOrId}`;
    hubLayerNames.set(layerKey, layerDisplayName);
    
    // Default warna & opasitas
    if (!layerColors.has(layerKey)) layerColors.set(layerKey, '#008bb0');
    if (!layerOpacities.has(layerKey)) layerOpacities.set(layerKey, 0.8);

    let targetLayer = hubLayersMap.get(layerKey);

    if (!targetLayer) {
      targetLayer = L.tileLayer(`${mapServerUrl}/tile/{z}/{y}/{x}`, {
        attribution: '&copy; InaRisk BNPB / BIG / KLHK',
        maxZoom: 18,
        transparent: true,
        opacity: layerOpacities.get(layerKey)
      });
      targetLayer.getTileUrl = function (coords) {
        const zoom = coords.z;
        const tileSize = 256;
        const min = map.unproject(coords.multiplyBy(tileSize), zoom);
        const max = map.unproject(coords.multiplyBy(tileSize).add([tileSize, tileSize]), zoom);
        const bbox = `${min.lng},${min.lat},${max.lng},${max.lat}`;
        return `${mapServerUrl}/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=256,256&f=image&format=png32&transparent=true&layers=${subLayerIndex}`;
      };
      hubLayersMap.set(layerKey, targetLayer);
    }

    if (visible) {
      targetLayer.addTo(map);
      if (!activeLayerKeysOrder.includes(layerKey)) {
        activeLayerKeysOrder.unshift(layerKey);
      }
      showToast("Layer berhasil diaktifkan!");
    } else {
      if (map.hasLayer(targetLayer)) map.removeLayer(targetLayer);
      activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== layerKey);
      showToast("Layer dinonaktifkan.");
    }

    updateLegendEditor();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat layer.");
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
  const total = activeLayerKeysOrder.length;
  
  // Urutkan dari elemen paling bawah ke paling atas agar lapisan teratas memiliki z-index tertinggi
  [...activeLayerKeysOrder].reverse().forEach((cacheKey, index) => {
    const layer = geoportalLayers.get(cacheKey) || hubLayersMap.get(cacheKey);
    if (layer && map.hasLayer(layer)) {
      // Berikan nilai z-index berjenjang secara otomatis
      const zIndexVal = 500 + index * 10;
      
      if (typeof layer.setZIndex === 'function') {
        layer.setZIndex(zIndexVal);
      }
      
      if (typeof layer.bringToFront === 'function') {
        try {
          layer.bringToFront();
        } catch (e) {}
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
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;
  const rgbaColor = hexToRgba(color, opacity);

  const floatingBox = document.querySelector(`[data-legend-box="${CSS.escape(cacheKey)}"]`);
  if (floatingBox) {
    floatingBox.style.backgroundColor = rgbaColor;
    floatingBox.style.borderColor = color;
  }
}

function applyLayerStyle(cacheKey) {
  const layer = geoportalLayers.get(cacheKey);
  const hubLayer = hubLayersMap.get(cacheKey);
  const opacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;

  if (layer) {
    const color = layerColors.get(cacheKey) || '#008bb0';
    if (typeof layer.setStyle === 'function') layer.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(sub => {
        if (typeof sub.setStyle === 'function') sub.setStyle({ color: color, fillColor: color, fillOpacity: opacity });
      });
    }
    if (typeof layer.setOpacity === 'function') layer.setOpacity(opacity);
  }

  if (hubLayer) {
    if (typeof hubLayer.setOpacity === 'function') {
      hubLayer.setOpacity(opacity);
    }
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
    const l = geoportalLayers.get(key) || hubLayersMap.get(key);
    return l && map.hasLayer(l);
  });

  if (container) {
    if (activeEntries.length === 0) {
      container.innerHTML = '<p class="text-[11px] text-slate-400 italic">Belum ada layer aktif.</p>';
    } else {
      container.innerHTML = activeEntries.map((cacheKey, idx) => {
        let cleanName = "";
        if (cacheKey.includes('::')) {
          const [, layerName] = cacheKey.split('::');
          cleanName = resolveGeoportalLayerName(layerName);
        } else {
          cleanName = hubLayerNames.get(cacheKey) || cacheKey;
        }

        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;

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
        let cleanName = "";
        if (cacheKey.includes('::')) {
          const [, layerName] = cacheKey.split('::');
          cleanName = resolveGeoportalLayerName(layerName);
        } else {
          cleanName = hubLayerNames.get(cacheKey) || cacheKey;
        }

        const activeColor = layerColors.get(cacheKey) || '#008bb0';
        const activeOpacity = layerOpacities.has(cacheKey) ? layerOpacities.get(cacheKey) : 0.8;
        const rgbaColor = hexToRgba(activeColor, activeOpacity);

        return `
          <div class="space-y-1.5 py-1">
            <div class="font-semibold text-slate-800 text-[11px] truncate">${escapeBMKGHTML(cleanName)}</div>
            <div class="flex items-center justify-between gap-2 px-1">
              <div class="flex items-center gap-2">
                <span data-legend-box="${escapeBMKGHTML(cacheKey)}" class="w-4 h-4 rounded border shadow-sm inline-block" style="background-color: ${rgbaColor}; border-color: ${activeColor};"></span>
                <span class="text-[10px]">Aktif</span>
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
  const layer = geoportalLayers.get(cacheKey) || hubLayersMap.get(cacheKey);
  if (layer) {
    map.removeLayer(layer);
  }
  activeLayerKeysOrder = activeLayerKeysOrder.filter(k => k !== cacheKey);
  
  if (cacheKey.includes('::')) {
    const [wmsUrl, layerName] = cacheKey.split('::');
    const cb = document.querySelector(`input[data-layer-id="${layerName}"][onchange*="${wmsUrl}"]`);
    if (cb) cb.checked = false;
  } else {
    const cb = document.querySelector(`input[data-hub-key="${cacheKey}"]`);
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