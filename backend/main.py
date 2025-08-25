import time
import os
from rt200 import get_rt200_data
from config import insert_data, ambilDate, ambilDateTime
from datetime import datetime
from dotenv import load_dotenv
import pytz

# Load environment variables
env_path = "/opt/pda/config/.env"
if not load_dotenv(dotenv_path=env_path):
    print(f"Error: .env file not found at {env_path}")
    exit(1)

DELAY = int(os.getenv('DELAY'))

def should_run():
    now = datetime.now()
    return now.minute % DELAY == 0 and now.second == 0

def main():
    current_date = ambilDate()
    print(f"[{current_date}] ⏱️ Service dimulai. Menunggu waktu eksekusi sensor setiap {DELAY} menit.")
    last_run = None

    try:
        while True:
            now = datetime.now()
            if should_run():
                # Pastikan tidak menjalankan dua kali di waktu yang sama
                if last_run != now.replace(second=0, microsecond=0):
                    current_date = ambilDate()
                    current_datetime = ambilDateTime()

                    print(f"\n[{current_date}] 📡 Membaca semua sensor...")
                    rt200_data = get_rt200_data()

                    if rt200_data :
                        print(f"[{current_date}] ✅ Semua data sensor berhasil terbaca.")

                        temp, press, depth = rt200_data

                        print("\n============= SENSOR DATA ====================")
                        print(f"Temp: {temp} , Press: {press} , Depth: {depth}")
                        print("================================================")

                        insert_data(current_date, current_datetime,temp,press,depth)
                    else:
                        print(f"[{current_date}] ❌ Tidak semua sensor berhasil terbaca. Data tidak disimpan.")
                        if not rt200_data:
                            print(f"[{current_date}] ⚠️ Gagal membaca data RT200.")

                    last_run = now.replace(second=0, microsecond=0)

            time.sleep(0.5)

    except KeyboardInterrupt:
        print(f"\n[{current_date}] 🛑 Service dihentikan secara manual.")

if __name__ == "__main__":
    main()
