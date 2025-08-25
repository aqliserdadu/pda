from flask import Flask, send_from_directory, jsonify, request
import os


LOG_FILES = {
    'web': '/opt/pda/logs/web.log',
    'sensor': '/opt/pda/logs/sensor.log',
    'send': '/opt/pda/logs/send.log',
    'retry': '/opt/pda/logs/retry.log',
    'backup': '/opt/pda/logs/backup.log'
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")

app = Flask(__name__, static_folder=None)

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "log.html")


@app.route("/<path:filename>")
def serve_frontend_assets(filename):
    return send_from_directory(FRONTEND_DIR, filename)

@app.route('/tail')
def tail_log():
    log_name = request.args.get('log')
    filepath = LOG_FILES.get(log_name)

    if not filepath or not os.path.exists(filepath):
        return jsonify(["Invalid or missing log file."])

    with open(filepath, 'r') as f:
        lines = f.readlines()[-500:]  # ambil 500 baris terakhir
    return jsonify(lines)

@app.route('/loglist')
def get_log_list():
    return jsonify(list(LOG_FILES.keys()))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True, threaded=True)
