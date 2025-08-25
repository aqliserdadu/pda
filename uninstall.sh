#!/bin/bash

# ============================================
#  pda (Smart Portable Analyzer System) - Uninstaller
# ============================================
# Nama Aplikasi : Smart Portable Analyzer System (pda)
# Fungsi        : Menghapus semua komponen pda dari sistem
# Dibuat oleh   : Abu Bakar <abubakar.it.dev@gmail.com>
# Versi         : 1.1
# ============================================

echo "============================================"
echo " Smart Portable Analyzer System (pda) - Uninstaller"
echo "============================================"
echo "📌 Dibuat oleh : Abu Bakar <abubakar.it.dev@gmail.com>"
echo ""

set -e  # Hentikan jika terjadi error

APP_BASE="/opt/pda"
SERVICES=("pda-sensor.service" "pda-web.service" "pda-web-log.service" "pda-backup.service")

# === Hentikan dan nonaktifkan semua service ===
echo "🛑 Menghentikan dan menonaktifkan systemd services..."
for service in "${SERVICES[@]}"; do
    if systemctl is-enabled --quiet "$service"; then
        echo "🔻 Menonaktifkan & menghentikan $service..."
        systemctl stop "$service"
        systemctl disable "$service"
        rm -f "/etc/systemd/system/$service"
        echo "✅ $service dihapus."
    else
        echo "ℹ️  $service tidak ditemukan atau sudah nonaktif."
    fi
done

# Reload systemd
echo "🔄 Reload systemd daemon..."
systemctl daemon-reload
systemctl reset-failed

# === Hapus direktori instalasi ===
if [[ -d "$APP_BASE" ]]; then
    echo "🧹 Menghapus direktori instalasi di $APP_BASE..."
    rm -rf "$APP_BASE"
else
    echo "⚠️  Direktori $APP_BASE tidak ditemukan, melewati."
fi

# === Hapus symlink CLI ===
if [[ -f "/usr/bin/pda" ]]; then
    echo "🗑️  Menghapus CLI /usr/bin/pda..."
    rm -f /usr/bin/pda
else
    echo "ℹ️  CLI /usr/bin/pda tidak ditemukan."
fi

# === Konfirmasi penghapusan database Docker ===
if docker ps -a --format '{{.Names}}' | grep -q "^db_pda$"; then
    echo ""
    echo "⚠️  Container Docker 'db_pda' ditemukan."
    read -p "❓ Apakah Anda ingin menghapus database ini? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "🐳 Menghentikan dan menghapus container 'db_pda'..."
        docker stop db_pda
        docker rm db_pda
        echo "✅ Container 'db_pda' telah dihapus."
    else
        echo "ℹ️  Container 'db_pda' dibiarkan tetap ada."
    fi
else
    echo "ℹ️  Container 'db_pda' tidak ditemukan."
fi

echo ""
echo "✅ Uninstall selesai! Semua komponen utama pda telah dihapus dari sistem."
echo "Terima kasih telah menggunakan pda Project!"