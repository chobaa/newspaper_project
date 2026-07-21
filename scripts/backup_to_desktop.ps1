# Newspaper 프로젝트 백업 (Desktop .zip 생성) - Windows PowerShell

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups" }
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ZipPath = Join-Path $DesktopPath "newspaper_backup_$Timestamp.zip"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "=== Newspaper 백업 시작 ($Timestamp) ==="

# 1) MySQL 덤프 (PowerShell Out-File/리다이렉트는 인코딩이 깨질 수 있어 컨테이너 내부에서 생성 후 docker cp)
$SqlPath = Join-Path $BackupDir "mysql_newspaper_$Timestamp.sql"
$SqlInContainer = "/tmp/mysql_newspaper_$Timestamp.sql"
Write-Host "MySQL 덤프 중..."
docker exec $MysqlContainer sh -c "mysqldump -uroot -proot --default-character-set=utf8mb4 --single-transaction --routines --triggers newspaper > $SqlInContainer"
docker cp "${MysqlContainer}:${SqlInContainer}" $SqlPath
docker exec $MysqlContainer rm -f $SqlInContainer
Write-Host "  -> $SqlPath"

# 2) MinIO 데이터 압축(로컬 data/minio가 있을 때만)
$TarPath = Join-Path $BackupDir "minio_$Timestamp.tar.gz"
$MinioPath = Join-Path $ProjectRoot "data\minio"
if (Test-Path $MinioPath) {
    Write-Host "MinIO 데이터 압축 중..."
    $DataDir = Join-Path $ProjectRoot "data"
    Push-Location $DataDir
    try {
        tar -czf $TarPath minio
    } finally {
        Pop-Location
    }
    Write-Host "  -> $TarPath"
} else {
    Write-Host "MinIO 데이터 경로 없음: $MinioPath (minio tar는 생략)"
    $TarPath = $null
}

# 3) Desktop zip 생성
$ZipInputs = @($SqlPath)
if ($TarPath -and (Test-Path $TarPath)) { $ZipInputs += $TarPath }

Compress-Archive -Path $ZipInputs -DestinationPath $ZipPath -Force

Write-Host "=== Desktop ZIP 완료 ==="
Write-Host "  -> $ZipPath"
