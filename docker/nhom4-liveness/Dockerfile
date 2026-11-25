# Server liveness Nhom 4 (FastAPI) de Nhom 5 chay thu tren may Windows.
# Chay trong Linux nen khong bi Windows (Smart App Control) chan DLL cua ai-edge-litert.
# Nguon: Long965/IrisSample-IriAegis-26T, nhanh task1.2_API_Liveness_detection, thu muc liveness_backend.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# requirements.txt cua Nhom 4 chua co dinh phien ban; OpenCV 5 lam loi cat mat.
RUN pip install "fastapi==0.115.6" "uvicorn[standard]==0.32.1" "jinja2==3.1.4" "python-multipart==0.0.20" \
    "opencv-python-headless==4.10.0.84" "numpy==2.1.3" "pillow==11.0.0" "ai-edge-litert==2.4.0"
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
