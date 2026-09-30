FROM jbarlow83/ocrmypdf-alpine:v17.12.1
COPY --chown=app:app apps/ocr/servidor_ocr.py /app/servidor_ocr.py
USER app
EXPOSE 8081
ENTRYPOINT ["python3", "/app/servidor_ocr.py"]
