/**
 * ============================================================================
 * METEO.JS - Modul Integrasi Cuaca & Iklim Real-Time (Open-Meteo API)
 * GeoNusa WebGIS
 * ============================================================================
 */

(function () {
  // Koordinat Default (Pontianak, Kalimantan Barat)
  const DEFAULT_LAT = -0.0263;
  const DEFAULT_LON = 109.3425;

  /**
   * Fungsi untuk mengambil data cuaca terkini dari Open-Meteo API
   * @param {number} lat - Latitude (Garis Lintang)
   * @param {number} lon - Longitude (Garis Bujur)
   */
  async function fetchMeteoData(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      renderMeteoWidget(data);
    } catch (error) {
      console.error("Gagal mengambil data cuaca dari Open-Meteo:", error);
      showMeteoErrorState();
    }
  }

  /**
   * Menerjemahkan kode cuaca WMO dari Open-Meteo menjadi deskripsi teks & ikon Lucide
   * @param {number} code - Weather code
   */
  function getWeatherDescription(code) {
    const weatherMap = {
      0: { text: "Cerah (Clear sky)", icon: "sun" },
      1: { text: "Sebagian Berawan", icon: "cloud-sun" },
      2: { text: "Berawan", icon: "cloud" },
      3: { text: "Mendung", icon: "cloud-fog" },
      45: { text: "Berkabut", icon: "cloud-fog" },
      51: { text: "Gerimis Ringan", icon: "cloud-drizzle" },
      61: { text: "Hujan Ringan", icon: "cloud-rain" },
      63: { text: "Hujan Sedang", icon: "cloud-rain" },
      65: { text: "Hujan Lebat", icon: "cloud-lightning" },
      95: { text: "Badai Petir", icon: "cloud-lightning" }
    };
    return weatherMap[code] || { text: "Kondisi Normal", icon: "cloud-sun" };
  }

  /**
   * Merender data cuaca ke dalam container di tab Cuaca & Iklim sidebar
   * @param {Object} data - Data JSON dari API
   */
  function renderMeteoWidget(data) {
    const container = document.getElementById("sidebar-cuaca");
    if (!container) return;

    // Cari atau buat wadah kartu widget meteo di dalam tab cuaca
    let widgetEl = document.getElementById("meteo-live-widget");
    if (!widgetEl) {
      widgetEl = document.createElement("div");
      widgetEl.id = "meteo-live-widget";
      
      // Sisipkan di bawah elemen judul pertama dalam tab cuaca
      const headerDiv = container.querySelector("div");
      if (headerDiv && headerDiv.nextSibling) {
        container.insertBefore(widgetEl, headerDiv.nextSibling);
      } else {
        container.prepend(widgetEl);
      }
    }

    const current = data.current;
    const units = data.current_units;
    const weatherInfo = getWeatherDescription(current.weather_code);

    widgetEl.innerHTML = `
      <div class="bg-white/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/60 shadow-sm space-y-3 mb-3">
        <div class="flex items-center justify-between border-b border-gray-200/50 pb-2">
          <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="cloud-sun" class="w-4 h-4 text-primary"></i> Cuaca Real-Time
          </span>
          <span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Open-Meteo</span>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="p-2.5 bg-white/60 rounded-xl shadow-xs text-primary">
              <i data-lucide="${weatherInfo.icon}" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-lg font-black text-slate-800">${current.temperature_2m}${units.temperature_2m}</div>
              <div class="text-[11px] font-semibold text-slate-600">${weatherInfo.text}</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-1">
          <div class="bg-white/30 p-2 rounded-xl border border-white/40 text-center">
            <div class="text-[9px] text-slate-500 font-medium">Curah Hujan</div>
            <div class="text-xs font-bold text-slate-800">${current.rain} ${units.rain}</div>
          </div>
          <div class="bg-white/30 p-2 rounded-xl border border-white/40 text-center">
            <div class="text-[9px] text-slate-500 font-medium">Kelembapan</div>
            <div class="text-xs font-bold text-slate-800">${current.relative_humidity_2m}${units.relative_humidity_2m}</div>
          </div>
          <div class="bg-white/30 p-2 rounded-xl border border-white/40 text-center">
            <div class="text-[9px] text-slate-500 font-medium">Angin</div>
            <div class="text-xs font-bold text-slate-800">${current.wind_speed_10m} ${units.wind_speed_10m}</div>
          </div>
        </div>
      </div>
    `;

    // Refresh ikon Lucide jika dimuat
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function showMeteoErrorState() {
    const container = document.getElementById("sidebar-cuaca");
    if (!container) return;
    
    let widgetEl = document.getElementById("meteo-live-widget");
    if (!widgetEl) {
      widgetEl = document.createElement("div");
      widgetEl.id = "meteo-live-widget";
      container.prepend(widgetEl);
    }

    widgetEl.innerHTML = `
      <div class="bg-rose-50/50 p-3 rounded-xl border border-rose-200 text-xs text-rose-600 text-center mb-3">
        Gagal memuat data cuaca real-time. Memeriksa koneksi...
      </div>
    `;
  }

  // Inisialisasi saat halaman selesai dimuat
  document.addEventListener("DOMContentLoaded", () => {
    fetchMeteoData();

    // Memperbarui data cuaca otomatis setiap 30 menit atau mengikuti pergerakan peta
    setInterval(() => {
      if (typeof map !== 'undefined' && map) {
        const center = map.getCenter();
        fetchMeteoData(center.lat, center.lng);
      } else {
        fetchMeteoData();
      }
    }, 1800000);
  });
})();