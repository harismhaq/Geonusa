/* ==========================================================================
   GeoNusa — WebGIS Geografi Nusantara
   App Boot (Entry Point / Inisialisasi Utama)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Inisialisasi Peta Utama Leaflet
    if (typeof initMap === 'function') initMap();

    // 2. Memuat Katalog Geoportal & Menu Sidebar
    if (typeof fetchAllGeoportalCollections === 'function') fetchAllGeoportalCollections();
    if (typeof renderSdaHubList === 'function') renderSdaHubList();       
    if (typeof renderKehutananHubList === 'function') renderKehutananHubList();
    if (typeof renderPerizinanHubList === 'function') renderPerizinanHubList();
    if (typeof renderBatasHubList === 'function') renderBatasHubList();       
    if (typeof renderTransmigrasiHubList === 'function') renderTransmigrasiHubList();
    if (typeof renderKebencanaanHubList === 'function') renderKebencanaanHubList(); 
    if (typeof renderSaranaHubList === 'function') renderSaranaHubList();

    // 3. Merender Ikon UI (Lucide Icons)
    if (window.lucide) lucide.createIcons();

    // 4. Inisialisasi Modal Sambutan (Welcome Modal)
    if (!window.__geonusa_initialized) {
      window.__geonusa_initialized = true;
      const modals = document.querySelectorAll('#welcome-modal');
      if (modals.length > 0) {
        modals.forEach((m, idx) => {
          if (idx === 0) {
            m.classList.remove('hidden');
            m.classList.add('flex');
          } else {
            m.remove();
          }
        });
      }
      if (window.lucide) lucide.createIcons();
    }

  } catch (err) {
    console.error("Initialization Error:", err);
  }
});

// Fungsi Global untuk Mengatur Perpindahan Tab Sidebar (Termasuk Tab Satelit)
function switchSidebarTab(tabName) {
  const tabs = ['geoportal', 'sda', 'kehutanan', 'satelit', 'cuaca', 'perizinan', 'batas', 'transmigrasi', 'kebencanaan', 'sarana', 'tools'];
  
  tabs.forEach(t => {
    let btn = document.getElementById(`tab-${t}`);
    let panel = document.getElementById(`sidebar-${t}`);
    
    if (btn && panel) {
      if (t === tabName) {
        btn.className = "px-2 py-2 font-bold rounded-xl text-primary bg-white/85 shadow-xs border border-white/80 transition-all flex items-center justify-center gap-1 cursor-pointer";
        panel.classList.remove('hidden');
        panel.classList.add('flex');
      } else {
        btn.className = "px-2 py-2 font-semibold rounded-xl text-slate-700 hover:bg-white/40 transition-all flex items-center justify-center gap-1 cursor-pointer";
        panel.classList.remove('flex');
        panel.classList.add('hidden');
      }
    }
  });

  if (window.lucide) lucide.createIcons();
}