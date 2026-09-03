# Newspaper 월간 백업을 Windows 작업 스케줄러에 등록/해제하는 스크립트
#
#   등록:   powershell -ExecutionPolicy Bypass -File scripts\register_backup_task.ps1
#   확인:   powershell -ExecutionPolicy Bypass -File scripts\register_backup_task.ps1 -Show
#   해제:   powershell -ExecutionPolicy Bypass -File scripts\register_backup_task.ps1 -Unregister
#
# Docker Desktop이 로그인한 사용자 계정에서 동작하므로, 이 작업도 같은 계정으로 등록한다.
param(
    [string]$TaskName = "NewspaperMonthlyBackup",
    [ValidateRange(1, 28)]
    [int]$DayOfMonth = 1,
    [string]$StartTime = "03:00",
    [int]$KeepCount = 12,
    [switch]$Unregister,
    [switch]$Show
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$MonthlyScript = Join-Path $ScriptDir "backup_monthly.ps1"

if ($Show) {
    schtasks.exe /Query /TN $TaskName /V /FO LIST
    exit $LASTEXITCODE
}

if ($Unregister) {
    schtasks.exe /Delete /TN $TaskName /F
    if ($LASTEXITCODE -eq 0) {
        Write-Host "작업 삭제 완료: $TaskName"
    }
    exit $LASTEXITCODE
}

if (-not (Test-Path $MonthlyScript)) {
    throw "월간 백업 스크립트를 찾을 수 없습니다: $MonthlyScript"
}

# 매월 지정일 지정시각에 실행
$command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -KeepCount {1}' -f $MonthlyScript, $KeepCount

schtasks.exe /Create `
    /TN $TaskName `
    /TR $command `
    /SC MONTHLY `
    /D $DayOfMonth `
    /ST $StartTime `
    /F

if ($LASTEXITCODE -ne 0) {
    throw "작업 등록 실패 (exit=$LASTEXITCODE)"
}

# schtasks로는 지정할 수 없는 옵션 보정:
# - PC가 꺼져 있어 예약 시각을 놓쳤다면 다음 부팅 후 실행
# - 배터리 상태와 무관하게 실행
# - 최대 실행 시간 2시간
# - 우선순위 정상(4). 기본값 7은 I/O 우선순위까지 낮춰서 수 GB 아카이브 작업이 몇 배로 느려진다.
try {
    $task = Get-ScheduledTask -TaskName $TaskName
    $settings = $task.Settings
    $settings.StartWhenAvailable = $true
    $settings.DisallowStartIfOnBatteries = $false
    $settings.StopIfGoingOnBatteries = $false
    $settings.ExecutionTimeLimit = "PT2H"
    $settings.Priority = 4
    Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
    Write-Host "추가 설정 적용 완료 (놓친 일정 실행 / 배터리 무관 / 최대 2시간 / 우선순위 정상)"
} catch {
    Write-Warning "추가 설정 적용 실패(작업 등록 자체는 성공): $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== 등록 완료 ==="
Write-Host "작업 이름 : $TaskName"
Write-Host "실행 주기 : 매월 $DayOfMonth 일 $StartTime"
Write-Host "실행 대상 : $MonthlyScript"
Write-Host "보관 개수 : $KeepCount 개"
Write-Host ""
Write-Host "즉시 테스트: schtasks /Run /TN $TaskName"
