# Newspaper 프로젝트 백업 스크립트 (Windows PowerShell)
# MySQL 덤프 + MinIO 데이터 복사

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups" }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "=== Newspaper 백업 시작 ($Timestamp) ==="

# 1. MySQL 덤프
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }
try {
    Write-Host "MySQL 덤프 중..."
    $SqlPath = Join-Path $BackupDir "mysql_newspaper_$Timestamp.sql"
    docker exec $MysqlContainer mysqldump -uroot -proot newspaper | Out-File -FilePath $SqlPath -Encoding utf8
    Write-Host "  -> $SqlPath"
} catch {
    Write-Host "MySQL 덤프 실패 (컨테이너 실행 중인지 확인): $_"
}

# 2. MinIO 데이터 복사
$MinioPath = Join-Path $ProjectRoot "data\minio"
if (Test-Path $MinioPath) {
    Write-Host "MinIO 데이터 압축 중..."
    $TarPath = Join-Path $BackupDir "minio_$Timestamp.tar.gz"
    Set-Location (Join-Path $ProjectRoot "data")
    tar -czf $TarPath minio
    Set-Location $ProjectRoot
    Write-Host "  -> $TarPath"
}

Write-Host "=== 백업 완료 ==="
