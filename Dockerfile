# ASTRA-SN API (Pole 2) — container for Railway (or any Docker host).
#
# The 80 m LOLA terrain file (not in Git) is downloaded from NASA PGDA during the build:
#   https://pgda.gsfc.nasa.gov/products/90  (Barker et al. 2023, Planet. Sci. J. 4, 183)
# Build and run locally:
#   docker build -t astra-sn-api .
#   docker run -p 8080:8080 astra-sn-api        -> http://localhost:8080/docs
# Allowed browser origins (CORS) for the deployed frontend: set ASTRA_CORS_ORIGINS at deploy time.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    ASTRA_LDEM_PATH=/app/data/terrain/LDEM_80S_80MPP_ADJ.tiff

WORKDIR /app
COPY backend/requirements-api.txt backend/requirements-api.txt
RUN pip install --no-cache-dir -r backend/requirements-api.txt

# Terrain file from NASA; the size check stops the build if the download is incomplete or changed.
ARG LDEM_URL=https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
ARG LDEM_BYTES=189158392
RUN mkdir -p data/terrain && python -c "import os, sys, urllib.request; \
p = os.environ['ASTRA_LDEM_PATH']; urllib.request.urlretrieve('${LDEM_URL}', p); \
n = os.path.getsize(p); print('LOLA file:', n, 'bytes'); sys.exit(n != ${LDEM_BYTES})"

# System library needed by the rasterio wheel (missing from the slim image)
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 && rm -rf /var/lib/apt/lists/*

COPY backend/astra_engine backend/astra_engine
COPY backend/api backend/api
COPY data/sites data/sites

RUN useradd --create-home astra
USER astra
WORKDIR /app/backend
# The host gives the port in $PORT (8080 by default)
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
