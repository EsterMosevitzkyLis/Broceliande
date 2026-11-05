"""Local server for the game, on this computer only.

Like `python -m http.server`, but it tells browsers not to keep old copies of the files, so a
reload always shows the latest code. Python 3, standard library only.

Run from anywhere:  python tools/serve.py [port]   (default 8000; or double-click tools/serve.bat)
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows it would let two servers share a port without an error


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
try:
    server = Server(('127.0.0.1', port), partial(NoCacheHandler, directory=str(ROOT)))
except OSError:
    sys.exit(f'Port {port} is already in use: another server is probably running. Stop it first.')
print(f'Serving the game at http://localhost:{port} (Ctrl+C to stop)', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
