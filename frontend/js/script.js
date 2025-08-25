let map, marker, config;

// Fungsi utama untuk inisialisasi
async function initializeDashboard() {
    try {
        const res = await fetch('/api/config');
        config = await res.json();

        setupUIFromConfig();
        initializeMap();

        await updateAllData(); // Lakukan fetch data pertama kali

        // Set interval untuk refresh data
        setInterval(updateAllData, 60000); // Refresh setiap 60 detik

    } catch (e) {
        console.error("Gagal inisialisasi dashboard:", e);
    }
}


initializeDashboard();

// Mengatur UI berdasarkan file config.json
function setupUIFromConfig() {
    // Tampilkan/sembunyikan kartu berdasarkan config.parameters
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        const id = card.id.replace('-card', '');
        card.style.display = config.parameters.includes(id) ? 'flex' : 'none';
    });

    // Isi dropdown parameter
    const paramSelect = document.getElementById('param-select');
    paramSelect.innerHTML = '';
    config.parameters.forEach(param => {
        const opt = document.createElement('option');
        opt.value = param;

        // Capitalize dan ganti 'press' menjadi 'pressure'
        let displayText = param.charAt(0).toUpperCase() + param.slice(1);
        if (displayText.toLowerCase() === 'press') {
            displayText = 'Pressure';
        }

        opt.textContent = displayText;
        paramSelect.appendChild(opt);
    });

    // Tampilkan info di header dan footer
    document.getElementById("map-location").textContent = config.location || 'N/A';
    document.getElementById('footer-device').textContent = `${config.device || 'N/A'}`;
    document.getElementById('footer-version').textContent = `V:${config.software || 'N/A'}`;
}


// Inisialisasi peta Leaflet
function initializeMap() {
    const { latitude, longitude } = config.geo;
    map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([latitude, longitude]).addTo(map).bindPopup("Lokasi Sensor").openPopup();
}

// Fungsi untuk mengambil data terbaru dan memperbarui kartu
async function updateLatestData() {
    try {
        const res = await fetch('/api/latest');
        const data = await res.json();

        if (data.error) {
            console.error("Error dari API /latest:", data.error);
            return;
        }

        // Update semua kartu
        Object.keys(data).forEach(key => {
            const valueEl = document.getElementById(`${key}-value`);
            if (valueEl && typeof data[key] === 'number') {
                valueEl.textContent = data[key].toFixed(2);
            }
        });

        // Update timestamp di semua kartu
        if (data.datetime_str) {
            const formatted = data.datetime_str.replace(' ', ' | ');
            document.querySelectorAll('.timestamp').forEach(el => el.textContent = formatted);
        }

    } catch (e) {
        console.error("Gagal fetch data terbaru:", e);
    }
}


// Fungsi untuk merender grafik histori
async function renderHistoryChart() {
    const param = document.getElementById('param-select').value;
    const range = document.getElementById('time-range').value;
    
    try {
        const res = await fetch(`/api/history?param=${param}&range=${range}`);
        const data = await res.json();

        const trace = {
            x: data.timestamps,
            y: data.values,
            type: 'scatter',
            mode: 'lines+markers',
            name: param.toUpperCase(),
            line: { shape: 'spline', color: '#0074D9', width: 2 },
            marker: { size: 4 }
        };

        const layout = {
            margin: { t: 40, b: 70, l: 50, r: 20 },
            title: `History of ${param.toUpperCase()}`,
            xaxis: { title: 'Waktu', tickangle: -45, tickformat: "%Y-%m-%d<br>%H:%M" },
            yaxis: { title: 'Nilai' },
            plot_bgcolor: '#fafafa',
            paper_bgcolor: '#fff'
        };
      // === PERBAIKAN: Menggunakan Plotly.react untuk update yang lebih andal ===
      Plotly.react("dataChart", [trace], layout, {responsive: true});

    } catch (err) {
        console.error("Gagal render grafik:", err);
    }
}


// Fungsi gabungan untuk refresh semua data
async function updateAllData() {
    await updateLatestData();
    await renderHistoryChart();
}

// --- Event Listeners ---

// Kontrol dropdown
document.getElementById('export-btn').addEventListener('click', async () => {
    const start = document.getElementById('start-datetime').value;
    const end = document.getElementById('end-datetime').value;
    const destination = document.getElementById('export-destination').value;
    const status = document.getElementById('export-status');
    
    status.style.display = 'block';

    if (!start || !end) {
        status.textContent = "❌ Start dan end date harus diisi.";
        return;
    }

    status.textContent = "⏳ Memproses export...";

    try {
        const res = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end, destination })
        });

        if (destination === 'download') {
            if (!res.ok) {
                const result = await res.json();
                status.textContent = `❌ Gagal: ${result.error || 'Unknown error'}`;
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${start}_${end}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            status.textContent = "✅ Berhasil diunduh.";
        } else {
            const result = await res.json();
            if (res.ok) {
                status.textContent = `✅ Tersimpan di USB: ${result.path}`;
            } else {
                status.textContent = `❌ Gagal: ${result.error}`;
            }
        }
    } catch (err) {
        status.textContent = "❌ Terjadi error saat export.";
        console.error(err);
    }
});


// Event listener
document.getElementById('param-select').addEventListener('change', () => {
    const param = document.getElementById('param-select').value;
    const range = document.getElementById('time-range').value;
    renderHistoryChart(param, range);
});

document.getElementById('time-range').addEventListener('change', () => {
    const param = document.getElementById('param-select').value;
    const range = document.getElementById('time-range').value;
    renderHistoryChart(param, range);
    renderWindRose(range);
});



async function loadUsbOptions() {
    try {
        const res = await fetch('/api/usb-list');
        const devices = await res.json();
        const status = document.getElementById('export-status');
    
        status.style.display = 'none';

        const select = document.getElementById('export-destination');
        const currentOptions = Array.from(select.options).map(opt => opt.value);

        // Cek apakah array devices dan currentOptions sama persis
        const isSame = devices.length === currentOptions.length &&
            devices.every((d, i) => d === currentOptions[i]);

        if (!isSame) {
            // Kalau ada perbedaan, update <select>
            select.innerHTML = ''; // kosongkan dulu

            devices.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d === 'download' ? 'Download' : `USB: ${d}`;
                select.appendChild(opt);
            });
        } else {
            console.log('USB list tidak berubah, tidak perlu update.');
        }
    } catch (e) {
        console.warn("Gagal memuat USB list:", e);
    }
}


loadUsbOptions(); // Panggil saat halaman dimuat


setInterval(() => {
   loadUsbOptions();
}, 10000);

// Auto refresh tiap 1 menit
setInterval(() => {
    const param = document.getElementById('param-select').value;
    const range = document.getElementById('time-range').value;
    //fetchHistory(param, range);
    renderHistoryChart(param, range);
    renderWindRose(range);
}, 60000);


//wifi deteksi

function updateWifiStatusUI() {
  fetch('/api/wifi-status')
    .then(res => res.json())
    .then(data => {
      const dot = document.getElementById("wifi-status-dot");
      const statusText = document.getElementById("wifi-current-status");

      if (data.connected) {
        dot.style.backgroundColor = "green";
        statusText.innerText = `Terhubung ke WiFi: ${data.ssid}`;
      } else {
        dot.style.backgroundColor = "red";
        statusText.innerText = `Tidak terhubung ke jaringan manapun.`;
      }
    })
    .catch(err => {
      document.getElementById("wifi-status-dot").style.backgroundColor = "red";
      document.getElementById("wifi-current-status").innerText = "Gagal mendapatkan status koneksi.";
    });
}

// Jalankan saat halaman dimuat dan setiap 30 detik
updateWifiStatusUI();
setInterval(updateWifiStatusUI, 30000);


// Fungsi untuk load SSID saat modal dibuka
const ssidSelect = document.getElementById("ssid");

document.getElementById("wifiModal").addEventListener("show.bs.modal", () => {
  ssidSelect.innerHTML = '<option value="">Memuat jaringan...</option>';

  fetch('/api/wifi-scan')
    .then(res => res.json())
    .then(data => {
      ssidSelect.innerHTML = ''; // Kosongkan isi
      if (data.ssids && data.ssids.length > 0) {
        data.ssids.forEach(ssid => {
          const opt = document.createElement("option");
          opt.value = ssid;
          opt.textContent = ssid;
          ssidSelect.appendChild(opt);
        });
      } else {
        ssidSelect.innerHTML = '<option value="">Tidak ada jaringan ditemukan</option>';
      }
    })
    .catch(err => {
      ssidSelect.innerHTML = '<option value="">Gagal memuat SSID</option>';
    });
});



document.getElementById("wifi-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const ssid = document.getElementById("ssid").value;
  const password = document.getElementById("wifi-password").value;
  document.getElementById("wifi-status").innerText = `Menghubungkan ke ${ssid}...`;

  // Kirim ke server (ganti dengan AJAX fetch ke backend Python atau Flask)
  fetch('/api/connect-wifi', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ssid, password})
  }).then(res => res.json()).then(data => {
    document.getElementById("wifi-status").innerText = data.message || "Terhubung!";
  }).catch(err => {
    document.getElementById("wifi-status").innerText = "Gagal terhubung.";
  });
});

// Restart & Shutdown (pastikan backend endpoint tersedia)
document.getElementById("restart-btn").addEventListener("click", () => {
  if (confirm("Yakin ingin merestart Raspberry Pi?")) {
    fetch('/api/system/restart', { method: 'POST' });
  }
});
document.getElementById("shutdown-btn").addEventListener("click", () => {
  if (confirm("Yakin ingin mematikan Raspberry Pi?")) {
    fetch('/api/system/shutdown', { method: 'POST' });
  }
});


 function formatToLocalDatetimeString(date) {
    const pad = n => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const now = new Date();
  const formatted = formatToLocalDatetimeString(now);
  document.getElementById('start-datetime').value = formatted;
  document.getElementById('end-datetime').value = formatted;