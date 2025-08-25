#!/bin/bash

# ============================================
#  PDA (Pantau Duga Air) - Installer
# ============================================
# Nama Aplikasi : Pantau Duga Air (PDA)
# Deskripsi     : Sistem pemantauan Pantau Duga Air .
# Fungsi        : Merekam data temp press depth.
# Dibuat oleh   : Abu Bakar <abubakar.it.dev@gmail.com>
# Versi         : 1.0
# Lisensi       : Private/Internal Project
# ============================================

set -e  # Stop jika terjadi error

# === Header ===
echo "============================================"
echo " Pantau Duga Air (PDA) - Installer"
echo "============================================"
echo "📌 Dibuat oleh        : Abu Bakar <abubakar.it.dev@gmail.com>"
echo "📌 Deskripsi          : Sistem pemantauan Pantau Duga Air  berbasis Python & API"
echo "📌 Lokasi Instalasi   : /opt/pda"
echo "📌 Service            : pda-sensor, pda-web, pda-web-log, pda-backup"
echo "📌 Web Port           : 0.0.0.0:5010"
echo "📌 Web Log Port       : 0.0.0.0:3000"
echo "📌 PhpMyAdmin         : 0.0.0.0:8080"
echo "============================================"
echo ""

# === Validasi lingkungan ===
command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 tidak ditemukan. Silakan install terlebih dahulu."; exit 1; }
command -v pip >/dev/null 2>&1 || { echo "❌ pip tidak ditemukan. Silakan install terlebih dahulu."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker tidak ditemukan. Silakan install terlebih dahulu."; exit 1; }

# === Pemeriksaan Service ===
CHECK_SERVICES=("pda-sensor.service" "pda-web.service" "pda-web-log.service" "pda-backup.service")
echo "🔍 Mengecek apakah service sudah ada..."
found_existing=false
for service in "${CHECK_SERVICES[@]}"; do
    if [[ -f "/etc/systemd/system/$service" ]]; then
        echo "⚠️  Ditemukan service: $service"
        found_existing=true
    fi
done

if [ "$found_existing" = true ]; then
    echo ""
    echo "🚫 Instalasi dibatalkan. Service sudah ada."
    echo "💡 Hapus service lama dengan:"
    echo "    sudo systemctl stop <service>"
    echo "    sudo rm /etc/systemd/system/<service>"
    echo "    sudo systemctl daemon-reload"
    echo ""
    exit 1
fi

echo "✅ Tidak ada konflik service. Lanjut instalasi..."

# === Setup Directories ===
APP_BASE="/opt/pda"
LOG_DIR="$APP_BASE/logs"
SERVICES=("pda-sensor.service" "pda-web.service" "pda-web-log.service" "pda-backup.service")

echo "📁 Membuat direktori instalasi di $APP_BASE..."
mkdir -p "$APP_BASE"
cp -r . "$APP_BASE"

# === Python Virtual Environment ===
echo "🧪 Membuat virtual environment..."
python3 -m venv "$APP_BASE/venv"
source "$APP_BASE/venv/bin/activate"

# === Install Python Dependencies ===
REQ_FILE="$APP_BASE/requirements.txt"
if [[ -f "$REQ_FILE" ]]; then
    echo "📦 Menginstal dependensi dari requirements.txt..."
    pip install -r "$REQ_FILE"
else
    echo "⚠️  requirements.txt tidak ditemukan. Melewati instalasi dependensi."
fi

# === CLI Link ===
echo "🔗 Menautkan CLI 'pda' ke /usr/bin/pda..."
if [[ -f "$APP_BASE/pda" ]]; then
    install -m 755 "$APP_BASE/pda" /usr/bin/pda
else
    echo "❌ File CLI pda tidak ditemukan."
fi

# === Setup Logs ===
echo "📁 Menyiapkan direktori log di $LOG_DIR..."
mkdir -p "$LOG_DIR"
chown root:root "$LOG_DIR"

# === Docker Database ===
if ! docker ps -a --format '{{.Names}}' | grep -q "^db_pda$"; then
    echo "🐳 Menjalankan container database..."
    docker run -d --restart=always --name db_pda --network host -v /opt:/opt -it aqliserdadu/db:pda
    echo "Insatall mysql client"
    sudo apt install mariadb-client -y

else
    echo "ℹ️  Container db_pda sudah ada. Melewati pembuatan."
fi

# === Buat Systemd Service Files ===
echo "🔧 Membuat service systemd..."

declare -A SERVICE_MAP
SERVICE_MAP[pda-sensor]="backend/main.py sensor.log"
SERVICE_MAP[pda-web]="backend/app.py web.log"
SERVICE_MAP[pda-web-log]="backend/log.py log.log"
SERVICE_MAP[pda-backup]="backend/backup.py backup.log"

for service in "${!SERVICE_MAP[@]}"; do
    IFS=" " read -r script log <<< "${SERVICE_MAP[$service]}"
    echo "  • $service.service"
    cat <<EOF | tee "/etc/systemd/system/$service.service" > /dev/null
[Unit]
Description=pda $service Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_BASE/$(dirname "$script")
ExecStart=$APP_BASE/venv/bin/python -u $(basename "$script")
StandardOutput=append:$LOG_DIR/$log
StandardError=append:$LOG_DIR/$log
Restart=always
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF
done

# === Aktifkan Semua Service ===
echo ""
echo "🔄 Reload & aktifkan semua service..."
systemctl daemon-reexec
systemctl daemon-reload

for service in "${!SERVICE_MAP[@]}"; do
    systemctl enable "$service"
    systemctl restart "$service"
    echo "✅ $service.service aktif."
done

echo ""
echo "🎉 Instalasi pda selesai!"
echo "👉 Gunakan perintah 'pda' di terminal."
echo "📖 Untuk bantuan, jalankan 'pda help'."