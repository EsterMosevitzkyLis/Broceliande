"""Local server for the game, on this computer only.

Like `python -m http.server`, but it tells browsers not to keep old copies of the files, so a
reload always shows the latest code. Python 3, standard library only.

It listens on this computer's loopback addresses only, IPv4 (127.0.0.1) and IPv6 (::1), so
http://localhost works whichever one the browser picks; nothing on the network can reach it.

For the map editor (editor.html, M4a §4) it also has:
  POST /api/save-map?level=<id>   writes the request body (the map JSON) to data/maps/<id>.json
  GET  /api/backgrounds           lists the images in data/maps/backgrounds/
Both answer requests from this computer only.

Run from anywhere:  python tools/serve.py [port]   (default 8000; or double-click tools/serve.bat)
"""

import json
import os
import re
import socket
import sys
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
MAPS = ROOT / 'data' / 'maps'
BACKGROUNDS = MAPS / 'backgrounds'
MAP_VERSION = 1                     # js/mapFile.js MAP_VERSION
LEVEL_ID = re.compile(r'^[A-Za-z0-9]+$')
MAX_MAP_BYTES = 8 * 1024 * 1024     # far above any map file
IMAGE_TYPES = {'.png', '.jpg', '.jpeg', '.webp'}
LOCAL_ADDRESSES = {'127.0.0.1', '::1'}


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_json(self, status, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # From this computer only: the connection itself, and (since any web page open in the browser
    # could send a request to localhost) the page that sent it, when the browser names one.
    def is_local(self):
        if self.client_address[0] not in LOCAL_ADDRESSES:
            return False
        origin = self.headers.get('Origin')
        if origin is None:
            return True
        host = urlparse(origin).hostname
        return host in ('localhost', '127.0.0.1', '[::1]', '::1')

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/backgrounds':
            if not self.is_local():
                return self.send_json(403, {'error': 'only from this computer'})
            names = sorted(p.name for p in BACKGROUNDS.glob('*') if p.is_file() and p.suffix.lower() in IMAGE_TYPES) if BACKGROUNDS.is_dir() else []
            return self.send_json(200, {'backgrounds': names})
        return super().do_GET()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != '/api/save-map':
            return self.send_json(404, {'error': 'no such endpoint'})
        if not self.is_local():
            return self.send_json(403, {'error': 'only from this computer'})
        level = parse_qs(url.query).get('level', [''])[0]
        if not LEVEL_ID.match(level):
            return self.send_json(400, {'error': 'the level id may only have letters and digits'})
        target = (MAPS / f'{level}.json').resolve()
        if target.parent != MAPS.resolve():
            return self.send_json(400, {'error': 'may only write inside data/maps/'})
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_MAP_BYTES:
            return self.send_json(400, {'error': 'the body should be a map file'})
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            return self.send_json(400, {'error': f'the body is not JSON ({e})'})
        if not isinstance(data, dict) or data.get('version') != MAP_VERSION or data.get('level') != level:
            return self.send_json(400, {'error': f'the map needs "version": {MAP_VERSION} and "level": "{level}"'})
        # Atomic: a temporary file beside the target, then renamed over it.
        MAPS.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(prefix=f'.{level}.', suffix='.tmp', dir=MAPS)
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(body)
            os.replace(tmp, target)
        except OSError as e:
            if os.path.exists(tmp):
                os.remove(tmp)
            return self.send_json(500, {'error': f'could not write {target.name} ({e})'})
        print(f'Saved data/maps/{target.name}', flush=True)
        return self.send_json(200, {'saved': f'data/maps/{target.name}'})


class Server(ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows it would let two servers share a port without an error


class Server6(Server):
    address_family = socket.AF_INET6


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = partial(NoCacheHandler, directory=str(ROOT))
try:
    servers = [Server(('127.0.0.1', port), handler)]
except OSError:
    sys.exit(f'Port {port} is already in use: another server is probably running. Stop it first.')
try:
    servers.append(Server6(('::1', port), handler))
except OSError as e:
    # No IPv6 on this computer, or the port is taken there: carry on with IPv4 (127.0.0.1) only.
    print(f'Note: not listening on IPv6 [::1]:{port} ({e}); use http://127.0.0.1:{port}', flush=True)
print(f'Serving the game at http://localhost:{port} (Ctrl+C to stop)', flush=True)
print(f'Map editor: http://localhost:{port}/editor.html', flush=True)
for extra in servers[1:]:
    threading.Thread(target=extra.serve_forever, daemon=True).start()
try:
    servers[0].serve_forever()
except KeyboardInterrupt:
    pass
