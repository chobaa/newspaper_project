# Newspaper 프로젝트 백업 (.zip 생성) - Windows PowerShell
#
# 기본 동작은 기존과 동일하게 바탕화면에 zip을 만든다.
#   -OutputDir          저장 위치 변경 (월간 백업 보관함 등)
#   -CleanIntermediate  zip에 담긴 뒤 남는 sql 중간 파일 삭제
#   -SkipMinio          MinIO 데이터를 제외하고 DB만 백업
#
# 아카이브는 Compress-Archive가 아니라 bsdtar(Windows 기본 tar)로 만든다.
# Compress-Archive는 내용을 메모리에 올려서 수 GB 파일에서 사실상 멈춰버린다.
param(
    [string]$OutputDir,
    [switch]$CleanIntermediate,
    [switch]$SkipMinio
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups" }
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }

if (-not $OutputDir) { $OutputDir = [Environment]::GetFolderPath("Desktop") }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ZipPath = Join-Path $OutputDir "newspaper_backup_$Timestamp.zip"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "=== Newspaper 백업 시작 ($Timestamp) ==="

# 1) MySQL 덤프
# PowerShell의 Out-File/리다이렉트는 인코딩이 깨지므로 컨테이너 안에서 파일을 만든 뒤 docker cp로 꺼낸다.
$SqlName = "mysql_newspaper_$Timestamp.sql"
$SqlPath = Join-Path $BackupDir $SqlName
$SqlInContainer = "/tmp/$SqlName"
Write-Host "MySQL 덤프 중..."
docker exec -e MYSQL_PWD=root $MysqlContainer sh -c "mysqldump -uroot --default-character-set=utf8mb4 --single-transaction --routines --triggers newspaper > $SqlInContainer"
if ($LASTEXITCODE -ne 0) { throw "mysqldump 실패 (exit=$LASTEXITCODE)" }
docker cp "${MysqlContainer}:${SqlInContainer}" $SqlPath
if ($LASTEXITCODE -ne 0) { throw "docker cp 실패 (exit=$LASTEXITCODE)" }
docker exec $MysqlContainer rm -f $SqlInContainer
Write-Host ("  -> {0} ({1} MB)" -f $SqlPath, [math]::Round((Get-Item $SqlPath).Length / 1MB, 1))

# 2) zip 생성
$MinioPath = Join-Path $ProjectRoot "data\minio"
$DataDir = Join-Path $ProjectRoot "data"
$includeMinio = (-not $SkipMinio) -and (Test-Path $MinioPath)

if ($SkipMinio) {
    Write-Host "MinIO 제외 (-SkipMinio)"
} elseif (-not $includeMinio) {
    Write-Host "MinIO 데이터 경로 없음: $MinioPath (제외)"
}

# 작업이 중간에 죽으면 잘린 파일이 정상 백업으로 오인될 수 있다.
# 그래서 .partial 이름으로 만들고, 다 끝난 뒤에만 최종 이름으로 바꾼다.
$PartialPath = "$ZipPath.partial"
if (Test-Path $PartialPath) { Remove-Item -Force $PartialPath }

if ($includeMinio) {
    # MinIO에는 이미 압축된 이미지가 대부분이라 재압축 이득이 1% 미만이다.
    # store로 저장해서 시간을 아낀다.
    Write-Host "아카이브 생성 중 (DB + MinIO, 무압축 저장)..."
    tar -cf $PartialPath --format zip --options zip:compression=store -C $BackupDir $SqlName -C $DataDir minio
} else {
    Write-Host "아카이브 생성 중 (DB만)..."
    tar -cf $PartialPath --format zip --options zip:compression=deflate -C $BackupDir $SqlName
}

# MinIO가 돌아가는 중이면 파일이 바뀌었다는 경고로 0이 아닌 코드가 날 수 있다.
# 실제 사용 가능 여부는 뒤이은 검증 단계에서 판정하므로 여기서는 경고만 남긴다.
if ($LASTEXITCODE -ne 0) {
    Write-Warning "tar가 경고와 함께 종료했습니다 (exit=$LASTEXITCODE). 검증 단계에서 사용 가능 여부를 확인하세요."
}

if (-not (Test-Path $PartialPath)) { throw "아카이브가 생성되지 않았습니다: $PartialPath" }
Move-Item -Path $PartialPath -Destination $ZipPath -Force

# 3) 중간 파일 정리 (zip 안에 이미 들어있음)
if ($CleanIntermediate -and (Test-Path $SqlPath)) {
    Remove-Item -Force $SqlPath
    Write-Host "중간 sql 파일 정리 완료"
}

Write-Host "=== ZIP 완료 ==="
Write-Host ("  -> {0} ({1} GB)" -f $ZipPath, [math]::Round((Get-Item $ZipPath).Length / 1GB, 2))

# 호출한 스크립트가 경로를 받을 수 있도록 파이프라인으로 반환
Write-Output $ZipPath
