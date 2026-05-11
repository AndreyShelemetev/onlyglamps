# Server deploy cheat sheet

Production project path:

```bash
/opt/onlyglamps
```

Do not edit MinIO Docker volume paths as project source code:

```bash
/var/lib/docker/volumes/onlyglamps_minio-data/_data/onlyglamps
/var/lib/docker/volumes/onlyglamps_minio-data/_data/.minio.sys/buckets/onlyglamps
```

Update from Git and rebuild:

```bash
cd /opt/onlyglamps
git pull origin main
docker compose up -d --build
docker compose ps
```

Rebuild without Docker cache:

```bash
cd /opt/onlyglamps
git pull origin main
docker compose build --no-cache backend frontend
docker compose up -d
docker compose ps
```

Quick checks:

```bash
curl -I http://localhost/
curl http://localhost/api/health
docker compose logs backend --tail=80
docker compose logs frontend --tail=80
```

Find the project path again if needed:

```bash
find / -type d -name "onlyglamps" 2>/dev/null
docker inspect onlyglamps-nginx-1 | grep -i com.docker.compose.project.working_dir
```
