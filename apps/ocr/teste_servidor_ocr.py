import json
import signal
import subprocess
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from servidor_ocr import OcrHandler, executar_ocr_isolado


def pdf_escaneado():
    return (Path(__file__).parent / "fixtures" / "curriculo-digitalizado.pdf").read_bytes()


class TesteServidorOcr(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.servidor = ThreadingHTTPServer(("127.0.0.1", 0), OcrHandler)
        cls.thread = threading.Thread(target=cls.servidor.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.servidor.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.thread.join(timeout=2)
        cls.servidor.server_close()

    def test_ocr_local_en_pdf_escaneado(self):
        request = Request(self.url + "/extrair", data=pdf_escaneado(), headers={"Content-Type": "application/pdf"}, method="POST")
        with urlopen(request, timeout=45) as response:
            body = json.loads(response.read())
        self.assertIn("Ana Silva", body["texto"])
        self.assertIn("ana@example.com", body["texto"])

    def test_rejeita_conteudo_que_nao_e_pdf(self):
        request = Request(self.url + "/extrair", data=b"texto", headers={"Content-Type": "application/pdf"}, method="POST")
        with self.assertRaises(HTTPError) as erro:
            urlopen(request, timeout=5)
        self.assertEqual(erro.exception.code, 422)

    def test_disponibiliza_healthcheck(self):
        with urlopen(self.url + "/health", timeout=2) as response:
            self.assertEqual(json.loads(response.read()), {"status": "ok"})

    @patch("servidor_ocr.os.killpg")
    @patch("servidor_ocr.subprocess.Popen")
    def test_timeout_encerra_o_grupo_e_aguarda_o_processo(self, popen, killpg):
        processo = popen.return_value
        processo.pid = 4321
        processo.returncode = -signal.SIGKILL
        processo.communicate.side_effect = [subprocess.TimeoutExpired(["ocrmypdf"], 40), None]

        with self.assertRaises(subprocess.TimeoutExpired):
            executar_ocr_isolado(["ocrmypdf"], "/tmp", {})

        self.assertEqual(popen.call_args.kwargs["start_new_session"], True)
        killpg.assert_called_once_with(4321, signal.SIGKILL)
        self.assertEqual(processo.communicate.call_count, 2)


if __name__ == "__main__":
    unittest.main()
