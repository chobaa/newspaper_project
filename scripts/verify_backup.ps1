# 백업 zip 복원 검증 스크립트 (Windows PowerShell)
#
# 아카이브에서 mysql_*.sql만 꺼내 임시 DB에 실제로 복원해 보고,
# 원본 DB의 article 행 수와 비교해 "복원 가능한 백업"인지 확인한다.
#
# 아카이브가 수 GB일 수 있으므로 Expand-Archive(전체 메모리 적재) 대신
# bsdtar로 필요한 항목 하나만 꺼낸다.
param(
    [string]$ZipPath,
    # DB만 백업한 경우(-SkipMinio)에는 MinIO 항목이 없는 게 정상이다.
    [switch]$SkipMinio
)

$ErrorActionPreference = "Stop"
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }

if (-not $ZipPath) {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $latest = Get-ChildItem -Path $DesktopPath -File |
        Where-Object { $_.Name -like "newspaper_backup_*.tar" -or $_.Name -like "newspaper_backup_*.zip" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) { throw "Desktop에 newspaper_backup_* 아카이브가 없습니다." }
    $ZipPath = $latest.FullName
}

if (-not (Test-Path $ZipPath)) { throw "백업 파일이 없습니다: $ZipPath" }

$db = "backup_verify_test"
$sqlInContainer = "/tmp/verify_restore.sql"
$extractDir = Join-Path $env:TEMP "newspaper_backup_verify"

try {
    # 1) 아카이브 목록 읽기 (중앙 디렉터리만 읽으므로 크기와 무관하게 빠르다)
    $ErrorActionPreference = "Continue"
    $entries = tar -tf $ZipPath 2>&1
    $listExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($listExit -ne 0) { throw "아카이브를 읽을 수 없습니다 (tar exit=$listExit): $ZipPath" }

    $sqlEntry = $entries | Where-Object { $_ -match '(^|/)mysql_.*\.sql$' } | Select-Object -First 1
    if (-not $sqlEntry) { throw "아카이브 안에 mysql_*.sql 파일이 없습니다." }

    $minioEntryCount = ($entries | Where-Object { $_ -match '^minio/' } | Measure-Object).Count

    # 2) sql만 꺼내기
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
    tar -xf $ZipPath -C $extractDir $sqlEntry
    if ($LASTEXITCODE -ne 0) { throw "sql 추출 실패 (tar exit=$LASTEXITCODE)" }

    $sqlFile = Get-ChildItem -Path $extractDir -Filter "mysql_*.sql" -Recurse | Select-Object -First 1
    if (-not $sqlFile) { throw "추출된 sql 파일을 찾을 수 없습니다." }
    if ($sqlFile.Length -le 0) { throw "추출된 sql 파일이 비어 있습니다: $($sqlFile.Name)" }

    # 3) 임시 DB에 실제로 복원
    docker exec -e MYSQL_PWD=root $MysqlContainer mysql -uroot -e "DROP DATABASE IF EXISTS $db; CREATE DATABASE $db;" | Out-Null
    docker cp $sqlFile.FullName "${MysqlContainer}:${sqlInContainer}"
    docker exec -e MYSQL_PWD=root $MysqlContainer sh -c "mysql -uroot $db < $sqlInContainer"
    $restoreExit = $LASTEXITCODE
    docker exec $MysqlContainer rm -f $sqlInContainer

    # 4) 원본과 비교
    $origArticle = (docker exec -e MYSQL_PWD=root $MysqlContainer mysql -uroot -D newspaper -N -B -e "SELECT COUNT(*) FROM article;")
    $restArticle = (docker exec -e MYSQL_PWD=root $MysqlContainer mysql -uroot -D $db -N -B -e "SELECT COUNT(*) FROM article;")
    $tableCount = (docker exec -e MYSQL_PWD=root $MysqlContainer mysql -uroot -D $db -N -B -e "SHOW TABLES;" | Measure-Object).Count

    Write-Host "=== 백업 검증 결과 ==="
    Write-Host "ZIP: $ZipPath"
    Write-Host ("아카이브 크기: {0} GB" -f [math]::Round((Get-Item $ZipPath).Length / 1GB, 2))
    Write-Host "SQL: $($sqlFile.Name) ($([math]::Round($sqlFile.Length / 1MB, 2)) MB)"
    Write-Host "MinIO 항목 수: $minioEntryCount"
    Write-Host "복원 exit code: $restoreExit"
    Write-Host "테이블 수: $tableCount"
    Write-Host "원본 article 행 수: $origArticle"
    Write-Host "복원 article 행 수: $restArticle"

    $dbOk = ($restoreExit -eq 0) -and ([int]$origArticle -eq [int]$restArticle) -and ([int]$restArticle -gt 0)

    # 예전에는 MinIO 항목 수를 출력만 하고 판정에 쓰지 않았다.
    # 그래서 이미지가 하나도 안 담긴 백업(2026-08-26 20:18 실행분)이 "OK"로 통과했다.
    $minioOk = $true
    if (-not $SkipMinio) {
        $minioOk = ($minioEntryCount -gt 0)
        if (-not $minioOk) {
            Write-Host "MinIO 항목이 하나도 없습니다. 이미지가 빠진 백업입니다."
        }
    }

    if ($dbOk -and $minioOk) {
        Write-Host "결과: OK (데이터 복원 가능)"
        exit 0
    }

    if (-not $dbOk) { Write-Host "결과: FAIL (데이터 복원 불완전)" }
    else { Write-Host "결과: FAIL (MinIO 데이터 누락)" }
    exit 1
}
finally {
    # 검증용 임시 DB / 추출 폴더 정리
    $ErrorActionPreference = "Continue"
    docker exec -e MYSQL_PWD=root $MysqlContainer mysql -uroot -e "DROP DATABASE IF EXISTS $db;" 2>&1 | Out-Null
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue }
}
