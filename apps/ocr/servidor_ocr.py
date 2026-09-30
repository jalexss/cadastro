import json
import os
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT_BYTES = 100_000
MAX_PAGES = 15
OCR_TIMEOUT_SECONDS = 40
SLOTS = threading.BoundedSemaphore(2)


class OcrHandler(BaseHTTPRequestHandler):
    server_version = "OCRLocal"

    def log_message(self, _format, *_args):
        return

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"status": "ok"})
        else:
            self.send_json(404, {"message": "Não encontrado."})

    def do_POST(self):
        if self.path != "/extrair":
            self.send_json(404, {"message": "Não encontrado."})
            return
        tamanho = self.headers.get("Content-Length")
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/pdf":
            self.send_json(415, {"message": "Envie um PDF."})
            return
        if not tamanho or not tamanho.isdigit() or int(tamanho) < 5 or int(tamanho) > MAX_BYTES:
            self.send_json(413, {"message": "PDF fora do limite permitido."})
            return
        if not SLOTS.acquire(blocking=False):
            self.send_json(503, {"message": "OCR ocupado."})
            return

        inicio = time.monotonic()
        try:
            pdf = self.rfile.read(int(tamanho))
            if len(pdf) != int(tamanho) or not pdf.startswith(b"%PDF-"):
                self.send_json(422, {"message": "PDF inválido."})
                return
            with tempfile.TemporaryDirectory(prefix="curriculo-", dir="/tmp") as temporario:
                diretorio = Path(temporario)
                arquivo_entrada = diretorio / "entrada.pdf"
                arquivo_saida = diretorio / "saida.pdf"
                texto_saida = diretorio / "texto.txt"
                arquivo_entrada.write_bytes(pdf)
                os.chmod(arquivo_entrada, 0o600)
                comando = [
                    "ocrmypdf", "--skip-text", "--pages", f"1-{MAX_PAGES}",
                    "--language", "por+eng", "--sidecar", str(texto_saida),
                    str(arquivo_entrada), str(arquivo_saida)
                ]
                subprocess.run(
                    comando,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=OCR_TIMEOUT_SECONDS,
                    check=True,
                    cwd=temporario,
                    env={**os.environ, "TMPDIR": temporario, "HOME": temporario}
                )
                texto = texto_saida.read_bytes()[:MAX_TEXT_BYTES].decode("utf-8", errors="replace") if texto_saida.exists() else ""
            self.send_json(200, {"texto": texto, "duracaoMs": round((time.monotonic() - inicio) * 1000)})
        except subprocess.TimeoutExpired:
            self.send_json(408, {"message": "OCR excedeu o tempo limite."})
        except Exception:
            self.send_json(422, {"message": "O PDF não pôde ser processado."})
        finally:
            SLOTS.release()

    def send_json(self, status, value):
        conteudo = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(conteudo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(conteudo)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8081), OcrHandler).serve_forever()
