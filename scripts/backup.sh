#!/bin/bash
# Newspaper 프로젝트 백업 스크립트
# MySQL 덤프 + MinIO 버킷 백업

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== Newspaper 백업 시작 ($TIMESTAMP) ==="

# 1. MySQL 덤프
if [ -n "$MYSQL_CONTAINER" ]; then
  echo "MySQL 덤프 중..."
  docker exec "$MYSQL_CONTAINER" mysqldump -uroot -proot newspaper > "$BACKUP_DIR/mysql_newspaper_$TIMESTAMP.sql"
  echo "  -> $BACKUP_DIR/mysql_newspaper_$TIMESTAMP.sql"
else
  echo "MYSQL_CONTAINER 미설정. docker exec로 덤프하려면:"
  echo "  export MYSQL_CONTAINER=newspaper-db"
  echo "  docker exec newspaper-db mysqldump -uroot -proot newspaper > backup.sql"
fi

# 2. MinIO 데이터 복사
if [ -d "$PROJECT_ROOT/data/minio" ]; then
  echo "MinIO 데이터 복사 중..."
  tar -czf "$BACKUP_DIR/minio_$TIMESTAMP.tar.gz" -C "$PROJECT_ROOT/data" minio
  echo "  -> $BACKUP_DIR/minio_$TIMESTAMP.tar.gz"
fi

echo "=== 백업 완료 ==="
