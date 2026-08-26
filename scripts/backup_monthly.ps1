# Newspaper 월간 백업 (Windows 스케줄러용)
#
# 흐름: 사전점검 -> 백업(zip 생성) -> 복원 검증 -> 로테이션(오래된 백업 삭제) -> 로그 기록
#
# 검증에 실패하면 로테이션을 하지 않는다.
# (검증되지 않은 새 백업 때문에 멀쩡한 과거 백업이 지워지는 것을 막기 위함)
param(
    [string]$ArchiveDir,
    [int]$KeepCount = 12,
    [switch]$SkipMinio
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir

if (-not $ArchiveDir) {
    $ArchiveDir = if ($env:BACKUP_ARCHIVE_DIR) { $env:BACKUP_ARCHIVE_DIR } else { Join-Path $ProjectRoot "backups\archive" }
}
$LogDir = Join-Path $ProjectRoot "backups\logs"
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "newspaper-db" }

New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$RunStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "backup_$RunStamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Write-Host $line
    Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

$exitCode = 0

try {
    Write-Log "===== 월간 백업 시작 ====="
    Write-Log "보관 위치: $ArchiveDir (최대 $KeepCount 개 유지)"

    # --- 1) 사전 점검: docker 및 DB 컨테이너가 살아있는지 ---
    $dockerVersion = (docker version --format "{{.Server.Version}}" 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Docker에 연결할 수 없습니다. Docker Desktop이 실행 중인지 확인하세요. ($dockerVersion)"
    }
    Write-Log "Docker 서버 버전: $dockerVersion"

    $running = (docker ps --filter "name=$MysqlContainer" --filter "status=running" --format "{{.Names}}" 2>&1)
    if ($running -notcontains $MysqlContainer) {
        throw "MySQL 컨테이너가 실행 중이 아닙니다: $MysqlContainer"
    }
    Write-Log "MySQL 컨테이너 확인: $MysqlContainer"

    # 이전 실행이 강제 종료되어 남은 미완성 아카이브 정리
    $stale = Get-ChildItem -Path $ArchiveDir -Filter "*.zip.partial" -File -ErrorAction SilentlyContinue
    foreach ($s in $stale) {
        Remove-Item -Path $s.FullName -Force
        Write-Log "미완성 아카이브 정리: $($s.Name)" "WARN"
    }

    # --- 2) 백업 실행 (기존 backup_to_desktop.ps1 재사용) ---
    $backupScript = Join-Path $ScriptDir "backup_to_desktop.ps1"
    if (-not (Test-Path $backupScript)) { throw "백업 스크립트를 찾을 수 없습니다: $backupScript" }

    Write-Log "백업 시작..."
    $zipPath = & $backupScript -OutputDir $ArchiveDir -CleanIntermediate -SkipMinio:$SkipMinio |
        Select-Object -Last 1

    if (-not $zipPath -or -not (Test-Path $zipPath)) {
        throw "백업 zip이 생성되지 않았습니다."
    }

    $zipInfo = Get-Item $zipPath
    if ($zipInfo.Length -le 0) { throw "백업 zip이 비어 있습니다: $zipPath" }
    Write-Log ("백업 파일 생성: {0} ({1} MB)" -f $zipInfo.Name, [math]::Round($zipInfo.Length / 1MB, 1))

    # --- 3) 복원 검증 (기존 verify_backup.ps1 재사용) ---
    $verifyScript = Join-Path $ScriptDir "verify_backup.ps1"
    if (-not (Test-Path $verifyScript)) { throw "검증 스크립트를 찾을 수 없습니다: $verifyScript" }

    Write-Log "복원 검증 시작..."
    # mysql 클라이언트가 경고를 stderr로 내보내므로, 2>&1 결과가 종료 오류로 승격되지 않게 잠시 완화
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    # 6>&1 : 검증 스크립트가 Write-Host로 찍는 상세 결과까지 로그 파일에 남기기 위함
    $verifyOutput = & $verifyScript -ZipPath $zipPath 2>&1 6>&1
    $verifyExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    foreach ($line in $verifyOutput) { Write-Log "  $line" }

    if ($verifyExit -ne 0) {
        # 검증 실패한 백업은 보관 대상에서 제외하기 위해 .INVALID 로 표시만 하고 남겨둔다.
        $invalidPath = "$zipPath.INVALID"
        Rename-Item -Path $zipPath -NewName (Split-Path -Leaf $invalidPath) -Force
        throw "백업 검증 실패 (exit=$verifyExit). 파일을 $invalidPath 로 표시했습니다. 로테이션은 건너뜁니다."
    }
    Write-Log "복원 검증 통과"

    # --- 4) 로테이션: 최신 N개만 남기고 오래된 백업 삭제 ---
    $backups = Get-ChildItem -Path $ArchiveDir -Filter "newspaper_backup_*.zip" -File |
        Sort-Object LastWriteTime -Descending

    Write-Log "현재 보관 중인 백업: $($backups.Count) 개"

    if ($backups.Count -gt $KeepCount) {
        $toDelete = $backups | Select-Object -Skip $KeepCount
        foreach ($old in $toDelete) {
            Remove-Item -Path $old.FullName -Force
            Write-Log ("오래된 백업 삭제: {0} ({1} MB)" -f $old.Name, [math]::Round($old.Length / 1MB, 1))
        }
    } else {
        Write-Log "삭제 대상 없음 (한도 $KeepCount 개 이내)"
    }

    # 로그 파일도 무한정 쌓이지 않도록 정리 (백업 보관 개수의 2배)
    $logs = Get-ChildItem -Path $LogDir -Filter "backup_*.log" -File | Sort-Object LastWriteTime -Descending
    if ($logs.Count -gt ($KeepCount * 2)) {
        $logs | Select-Object -Skip ($KeepCount * 2) | Remove-Item -Force
    }

    $remaining = Get-ChildItem -Path $ArchiveDir -Filter "newspaper_backup_*.zip" -File
    $totalGB = [math]::Round((($remaining | Measure-Object -Property Length -Sum).Sum) / 1GB, 2)
    Write-Log "===== 월간 백업 성공 ===== (보관 $($remaining.Count) 개 / 합계 $totalGB GB)"
}
catch {
    Write-Log $_.Exception.Message "ERROR"
    Write-Log "===== 월간 백업 실패 =====" "ERROR"
    $exitCode = 1
}

exit $exitCode
