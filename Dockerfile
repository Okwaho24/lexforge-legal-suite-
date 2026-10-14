# LexForge™ + AcerbE™ (co-located). Build context MUST contain ./acerbe with
# acerbe_engine.py, server.py (hardened) and requirements.txt — keep that repo PRIVATE.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY acerbe/requirements.txt acerbe/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r acerbe/requirements.txt
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV PATH=/opt/venv/bin:$PATH NODE_ENV=production PYTHON=/opt/venv/bin/python3
RUN mkdir -p /data && chown -R node:node /app /data
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5200)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["bash", "deploy/start.sh"]
