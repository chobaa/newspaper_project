# Newspaper 프로젝트 백업 (아카이브 생성) - Windows PowerShell
#
# 기본 동작은 기존과 동일하게 바탕화면에 아카이브를 만든다.
#   -OutputDir          저장 위치 변경 (월간 백업 보관함 등)
#   -CleanIntermediate  아카이브에 담긴 뒤 남는 sql 중간 파일 삭제
#   -SkipMinio          MinIO 데이터를 제외하고 DB만 백업
#
# 아카이브는 컨테이너 안의 GNU tar 로 만든다. 이유는 아래 두 가지다.
#
#  1) Compress-Archive 는 내용을 메모리에 올려서 수 GB 파일에서 사실상 멈춘다.
#  2) Windows 기본 tar(bsdtar 3.8.8)는 data\minio 트리를 훑다가
#     ACCESS_VIOLATION(0xC0000005)으로 프로세스가 죽는다. 재현 100%.
#     그런데도 종료 코드만 보고 넘어가면 "잘린 아카이브"가 정상 백업으로 둔갑한다.
#     (2026-09-01 월간 백업이 13.9MB 짜리 잘린 파일로 만들어진 원인)
#
# GNU tar 는 이미 받아둔 mysql 이미지에 들어 있어서 별도 이미지를 받지 않아도 된다.
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
# 아카이브 생성에 쓸 이미지. 이미 로컬에 있는 것을 재사용해 네트워크 의존을 없앤다.
$TarImage = if ($env:BACKUP_TAR_IMAGE) { $env:BACKUP_TAR_IMAGE } else { "mysql:8.0" }

if (-not $OutputDir) { $OutputDir = [Environment]::GetFolderPath("Desktop") }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveName = "newspaper_backup_$Timestamp.tar"
$ArchivePath = Join-Path $OutputDir $ArchiveName

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

# 2) 아카이브 생성
$MinioPath = Join-Path $ProjectRoot "data\minio"
$DataDir = Join-Path $ProjectRoot "data"
$includeMinio = (-not $SkipMinio) -and (Test-Path $MinioPath)

if ($SkipMinio) {
    Write-Host "MinIO 제외 (-SkipMinio)"
} elseif (-not $includeMinio) {
    # 조용히 DB만 백업되면 "작지만 정상처럼 보이는" 백업이 만들어진다. 그래서 실패로 처리한다.
    throw "MinIO 데이터 경로가 없습니다: $MinioPath (DB만 백업하려면 -SkipMinio 를 명시하세요)"
}

# 작업이 중간에 죽으면 잘린 파일이 정상 백업으로 오인될 수 있다.
# 그래서 .partial 이름으로 만들고, 다 끝난 뒤에만 최종 이름으로 바꾼다.
$PartialName = "$ArchiveName.partial"
$PartialPath = Join-Path $OutputDir $PartialName
if (Test-Path $PartialPath) { Remove-Item -Force $PartialPath }

# 컨테이너 안에서 만든다. 아카이브 내부 구조는 기존과 동일하다.
#   mysql_newspaper_*.sql   (최상위)
#   minio/...
$dockerArgs = @(
    "run", "--rm",
    "-v", "${BackupDir}:/sql:ro",
    "-v", "${OutputDir}:/out"
)
if ($includeMinio) {
    $dockerArgs += @("-v", "${DataDir}:/data:ro")
    $tarCommand = "tar -cf '/out/$PartialName' -C /sql '$SqlName' -C /data minio"
    Write-Host "아카이브 생성 중 (DB + MinIO)..."
} else {
    $tarCommand = "tar -cf '/out/$PartialName' -C /sql '$SqlName'"
    Write-Host "아카이브 생성 중 (DB만)..."
}
$dockerArgs += @($TarImage, "sh", "-c", $tarCommand)

& docker @dockerArgs
$tarExit = $LASTEXITCODE

# tar 가 0이 아닌 코드로 끝났으면 아카이브를 신뢰할 수 없다.
# 예전에는 경고만 남기고 최종 이름으로 바꿨기 때문에, 잘린 파일이 정상 백업으로 보관됐다.
if ($tarExit -ne 0) {
    if (Test-Path $PartialPath) {
        $partialMB = [math]::Round((Get-Item $PartialPath).Length / 1MB, 1)
        Remove-Item -Force $PartialPath
        throw "아카이브 생성 실패 (tar exit=$tarExit, 미완성 $partialMB MB 삭제함)"
    }
    throw "아카이브 생성 실패 (tar exit=$tarExit)"
}

if (-not (Test-Path $PartialPath)) { throw "아카이브가 생성되지 않았습니다: $PartialPath" }
if ((Get-Item $PartialPath).Length -le 0) {
    Remove-Item -Force $PartialPath
    throw "아카이브가 비어 있습니다: $PartialPath"
}

Move-Item -Path $PartialPath -Destination $ArchivePath -Force

# 3) 중간 파일 정리 (아카이브 안에 이미 들어있음)
if ($CleanIntermediate -and (Test-Path $SqlPath)) {
    Remove-Item -Force $SqlPath
    Write-Host "중간 sql 파일 정리 완료"
}

Write-Host "=== 아카이브 완료 ==="
Write-Host ("  -> {0} ({1} GB)" -f $ArchivePath, [math]::Round((Get-Item $ArchivePath).Length / 1GB, 2))

# 호출한 스크립트가 경로를 받을 수 있도록 파이프라인으로 반환
Write-Output $ArchivePath
