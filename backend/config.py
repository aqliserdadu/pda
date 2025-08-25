import mysql.connector
from dotenv import load_dotenv
import os
import pytz
import time
from datetime import datetime


# Load environment variables
env_path = "/opt/pda/config/.env"  # .env file path
if not load_dotenv(dotenv_path=env_path):
    print(f"Error: .env file not found at {env_path}")
    exit(1)


HOST = os.getenv('DB_HOST')
USER = os.getenv('DB_USER')
PASSWORD = os.getenv('DB_PASSWORD')
DATABASE = os.getenv('DB_NAME')
PORT = os.getenv('DB_PORT')
TIMEZONE = os.getenv('TIMEZONE')

# MySQL connection configuration
MYSQL_CONFIG = {
    'host': HOST,
    'user': USER,
    'password': PASSWORD,
    'database': DATABASE,
    'port': PORT
}

# Timezone configuration
tz = pytz.timezone(TIMEZONE)
def ambilDateAll():
    timestamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
    return timestamp

def ambilDate():
    date = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
    return date

def ambilDateTime():
    Interval_Timestamp = datetime.strptime(ambilDateAll(), '%Y-%m-%d %H:%M:%S')
    unix_dt = int(time.mktime(Interval_Timestamp.timetuple()))
    return unix_dt
      
def cekTable():
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        # Buat tabel jika belum ada
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                `date` DATETIME,
                datetime BIGINT DEFAULT 0,
                temp FLOAT DEFAULT 0,
                press FLOAT DEFAULT 0,
                depth FLOAT DEFAULT 0,
                status TEXT,
                keterangan TEXT,
                dateterkirim DATETIME
            )
        ''')
        conn.commit()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tmp (
                id INT AUTO_INCREMENT PRIMARY KEY,
                `date` DATETIME,
                datetime BIGINT DEFAULT 0,
                temp FLOAT DEFAULT 0,
                press FLOAT DEFAULT 0,
                depth FLOAT DEFAULT 0,
                status TEXT,
                keterangan TEXT,
                dateterkirim DATETIME
            )
        ''')
        conn.commit()
        
    except Exception as e:
        print(f"[{datetime.now()}] Error pada koneksi database: {e}")
        return    

def insert_data(date,  datetime, temp, press, depth):
    

    cekTable()        
    query = """
        INSERT INTO tmp (date, datetime, temp, press, depth)
        VALUES (%s, %s, %s, %s, %s);
        """
        
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()

        values = (
                date, datetime,
                temp,press,depth
            )
            #values = tuple("NULL" if v is None else v for v in values) # ganti jika None menjadi 0
        cursor.execute(query, values)
        conn.commit()

        print(f"[INFO] Data berhasil dimasukkan: {values}")
    except Exception as e:
        print(f"[ERROR] Gagal memasukkan data ke database: {e}")
    finally:
        # Tutup koneksi
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
