# 백업 zip 복원 검증 스크립트 (Windows PowerShell)
param(
    [string]$ZipPath
)

$ErrorActionPreference = "Stop"
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }

if (-not $ZipPath) {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $latest = Get-ChildItem -Path $DesktopPath -Filter "newspaper_backup_*.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) { throw "Desktop에 newspaper_backup_*.zip 파일이 없습니다." }
    $ZipPath = $latest.FullName
}

$extractDir = Join-Path $env:TEMP "newspaper_backup_verify"
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $extractDir -Force

$sqlFile = Get-ChildItem -Path $extractDir -Filter "mysql_*.sql" -Recurse | Select-Object -First 1
if (-not $sqlFile) { throw "zip 안에 mysql_*.sql 파일이 없습니다." }

$db = "backup_verify_test"
$sqlInContainer = "/tmp/verify_restore.sql"

docker exec $MysqlContainer mysql -uroot -proot -e "DROP DATABASE IF EXISTS $db; CREATE DATABASE $db;" | Out-Null
docker cp $sqlFile.FullName "${MysqlContainer}:${sqlInContainer}"
docker exec $MysqlContainer sh -c "mysql -uroot -proot $db < $sqlInContainer"
docker exec $MysqlContainer rm -f $sqlInContainer

$origArticle = (docker exec $MysqlContainer mysql -uroot -proot -D newspaper -N -B -e "SELECT COUNT(*) FROM article;")
$restArticle = (docker exec $MysqlContainer mysql -uroot -proot -D $db -N -B -e "SELECT COUNT(*) FROM article;")
$tableCount = (docker exec $MysqlContainer mysql -uroot -proot -D $db -N -B -e "SHOW TABLES;" | Measure-Object).Count

Write-Host "=== 백업 검증 결과 ==="
Write-Host "ZIP: $ZipPath"
Write-Host "테이블 수: $tableCount"
Write-Host "원본 article 행 수: $origArticle"
Write-Host "복원 article 행 수: $restArticle"

if ([int]$origArticle -eq [int]$restArticle -and [int]$restArticle -gt 0) {
    Write-Host "결과: OK (데이터 복원 가능)"
    exit 0
}

Write-Host "결과: FAIL (데이터 복원 불완전)"
exit 1
