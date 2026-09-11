# 월간 백업이 잘린 채로 만들어지던 문제

작성일: 2026-09-10
브랜치: `develop`

---

## 1. 증상

매달 1일 03:00에 도는 월간 백업이 2026-09-01에 **13.9MB** 짜리 파일을 만들었다.
8/26에 손으로 돌렸을 때는 3.37GB 로 정상이었다.

```
newspaper_backup_20260826_194257.zip   3,367,584,839 bytes   (정상)
newspaper_backup_20260901_030002.zip      13,967,360 bytes   (비정상)
```

## 2. 조사

### 2-1. 로그 비교

```
[2026-09-01 03:00:02] 백업 시작...
[2026-09-01 03:00:09] 백업 파일 생성: ...zip (13.3 MB)      ← 7초 만에 끝남
[2026-09-01 03:00:09] [ERROR] 아카이브를 읽을 수 없습니다 (tar exit=1)
[2026-09-01 03:00:09] [ERROR] ===== 월간 백업 실패 =====
```

정상 실행은 51초가 걸렸는데 7초 만에 끝났다.

### 2-2. 잘린 아카이브였다

만들어진 파일의 목록을 읽어 보면 `minio/` 항목이 **들어 있다.**
즉 "MinIO를 제외한 것" 이 아니라 **MinIO를 담다가 중간에 끊긴 것**이었다.

```
$ tar -tf newspaper_backup_20260901_030002.zip
mysql_newspaper_20260901_030002.sql
minio/
minio/.minio.sys/
minio/newspaper-bucket/
minio/newspaper-bucket/0007e8cb-...-image.jpg/
tar: exit=-1        ← 뒤가 잘려서 더 못 읽음
```

크기도 딱 맞는다. SQL 13.3MB + MinIO 0.6MB = 13.9MB.

### 2-3. 근본 원인 — bsdtar 크래시

같은 명령을 그대로 재현하니 tar 가 **크래시**했다.

```
exit = -1073741819  =  0xC0000005  (ACCESS_VIOLATION)
```

Windows 기본 `tar` (`C:\Windows\system32\tar.exe`, bsdtar 3.8.8 / libarchive 3.8.8) 가
`data\minio` 트리를 훑다가 프로세스째 죽는다. **100% 재현된다.**

원인 범위를 좁힌 결과:

| 시험 | 결과 |
|------|------|
| `--format zip --options zip:compression=store` | 크래시 (6.4s) |
| `--format zip --options zip:compression=deflate` | 크래시 (6.2s) |
| `--format zip` (옵션 없음) | 크래시 (6.3s) |
| tar 포맷 (zip 아님) | 크래시 (6.1s) |
| `minio/.minio.sys` 만 | 성공 |
| `minio/newspaper-bucket` 만 | **크래시** |
| 버킷에서 **ASCII 이름 객체 5,076개만** | **성공** (12.2s, 3.78GB) |
| 버킷 전체 (한글 이름 객체 45개 포함) | 크래시 |

압축 옵션이나 아카이브 포맷과 무관하고, **디렉터리 순회 중에** 죽는다.
버킷에는 아래처럼 한글·특수문자(`‘ ’`)·공백이 섞인 긴 객체 이름이 있다.

```
2b36e089-...-청년청소년과-성남시는 청년들의 전월세 계약을 돕기 위해 ... ‘주거 안심 매니저’로 ... (1).jpg
```

파일시스템이 깨진 것은 아니다. 같은 트리를 **리눅스 tar 로는 문제없이** 담을 수 있다.

```
docker run --rm -v ...\data:/data:ro -v ...:/out alpine tar -cf /out/x.tar -C /data minio
→ EXIT=0, 3,921 MB, 92초
```

즉 Windows 기본 bsdtar 쪽 버그다. 시스템 바이너리라 우리가 고칠 수 없다.

### 2-4. 왜 "실패" 가 아니라 "작은 백업" 으로 남았나

크래시 자체보다 이쪽이 더 문제였다. 스크립트에 **세 군데 구멍**이 있었다.

**(1) `backup_to_desktop.ps1` 이 tar 실패를 경고로만 처리했다**

```powershell
if ($LASTEXITCODE -ne 0) {
    Write-Warning "tar가 경고와 함께 종료했습니다 ..."   # 경고만
}
...
Move-Item -Path $PartialPath -Destination $ZipPath -Force   # 그래도 최종 이름으로 승격
```

MinIO 가 돌아가는 중이면 "파일이 바뀌었다" 는 경고로 0이 아닌 코드가 날 수 있다는 이유였는데,
그 관용이 **크래시로 잘린 아카이브까지** 정상 백업으로 승격시켰다.

**(2) `backup_monthly.ps1` 이 `.INVALID` 표시를 건너뛰었다**

검증 실패 시 `.INVALID` 로 이름을 바꾸도록 돼 있었지만,
`verify_backup.ps1` 이 **`throw` 로 끝나면** 예외가 바깥 catch 로 곧장 빠져나가면서
이름 변경 코드를 지나쳐 버렸다. 그래서 못 쓰는 파일이 멀쩡한 `.zip` 이름을 그대로 달고 남았다.
사용자 눈에는 "그냥 작은 백업 파일" 로 보인다.

**(3) `verify_backup.ps1` 이 MinIO 항목 수를 검사하지 않았다**

`MinIO 항목 수` 를 출력만 하고 판정에는 쓰지 않았다.
그래서 2026-08-26 20:18 실행분은 **`MinIO 항목 수: 0`** 인데도 "OK (데이터 복원 가능)" 로 통과했다.
DB만 담긴 3.4MB 백업이 정상 판정을 받은 것이다.

---

## 3. 수정

### 3-1. 아카이브 생성을 컨테이너의 GNU tar 로 (`backup_to_desktop.ps1`)

이미 받아둔 `mysql:8.0` 이미지에 GNU tar 1.34 가 들어 있어서, 새 이미지를 받지 않아도 된다.
GNU tar 는 `-C` 를 여러 번 쓸 수 있어 **아카이브 내부 구조가 기존과 완전히 동일**하다.
(busybox tar 는 다중 `-C` 를 제대로 처리하지 못해서 쓸 수 없었다.)

```powershell
docker run --rm -v "<backups>:/sql:ro" -v "<data>:/data:ro" -v "<out>:/out" mysql:8.0 \
  sh -c "tar -cf '/out/<name>.partial' -C /sql '<sql>' -C /data minio"
```

- 확장자가 `.zip` → **`.tar`** 로 바뀐다. GNU tar 는 zip 을 쓰지 못하고,
  tar 파일에 `.zip` 이름을 붙이는 건 오히려 헷갈린다.
  (Windows 11 탐색기는 `.tar` 를 그대로 연다)
- 원래도 MinIO 구간은 무압축(`store`)이었으므로 압축률 차이는 사실상 없다.

### 3-2. tar 가 실패하면 백업도 실패 (`backup_to_desktop.ps1`)

```powershell
if ($tarExit -ne 0) {
    Remove-Item -Force $PartialPath       # 미완성 파일은 지우고
    throw "아카이브 생성 실패 (tar exit=$tarExit, 미완성 $partialMB MB 삭제함)"
}
```

잘린 파일이 최종 이름을 얻는 경로를 없앴다.

MinIO 경로가 없을 때도 조용히 DB만 담지 않고 실패시킨다.
DB만 백업하려면 `-SkipMinio` 를 **명시**해야 한다.

### 3-3. 검증 실패 시 반드시 `.INVALID` 표시 (`backup_monthly.ps1`)

검증 호출을 `try/catch` 로 감싸서, 검증 스크립트가 예외를 던져도
`.INVALID` 이름 변경을 거치도록 했다.

### 3-4. MinIO 누락을 검증에서 잡는다 (`verify_backup.ps1`)

`-SkipMinio` 를 명시하지 않았는데 MinIO 항목이 0개면 **FAIL** 이다.

```
결과: FAIL (MinIO 데이터 누락)
```

### 3-5. 그 외

- 로테이션이 `.tar` 와 예전 `.zip` 을 함께 센다
- 남은 미완성 파일 정리 대상을 `*.zip.partial` → `*.partial` 로

---

## 4. 검증

### 정상 경로 — 월간 백업 전체 실행

```
[INFO] 백업 파일 생성: newspaper_backup_20260910_215316.tar (3936.4 MB)
[INFO] 복원 검증 시작...
[INFO]   MinIO 항목 수: 20032
[INFO]   복원 exit code: 0
[INFO]   테이블 수: 9
[INFO]   원본 article 행 수: 4790
[INFO]   복원 article 행 수: 4790
[INFO]   결과: OK (데이터 복원 가능)
[INFO] ===== 월간 백업 성공 =====
```

종료 코드 0, 소요 2.7분.

### 회귀 방지 — MinIO 빠진 백업이 걸러지는지

```
DB만 담긴 아카이브(-SkipMinio 로 생성, 15.3MB)를
MinIO 기대 상태로 검증  -> "결과: FAIL (MinIO 데이터 누락)", exit=1   ← 예전엔 OK 로 통과하던 것
같은 아카이브를 -SkipMinio 로 검증 -> "결과: OK", exit=0
```

---

## 5. 보관함 정리

| 파일 | 처리 |
|------|------|
| `newspaper_backup_20260826_194257.zip` (3.2GB) | 그대로 (정상 백업) |
| `newspaper_backup_20260901_030002.zip` (13.3MB) | **`.zip.INVALID` 로 이름 변경** — 손상된 파일이 정상 백업처럼 보이지 않도록. 삭제하지 않았으므로 되돌릴 수 있다 |
| `newspaper_backup_20260910_215316.tar` (3.9GB) | 이번 검증 실행에서 만들어진 **정상 백업**. 보관함에 넣어 뒀다 |

## 6. 참고

- 다음 자동 실행: **2026-10-01 03:00** (`NewspaperMonthlyBackup`)
- 작업은 `USER` 계정 / RunLevel Limited / LogonType Interactive 로 등록돼 있다.
  Interactive 라서 **로그온 상태가 아니면 실행되지 않는다.** 서버로 계속 켜두는 환경이면
  "사용자의 로그온 여부에 관계없이 실행" 으로 바꾸는 편이 안전하다.
- 이번 문제는 스케줄러와 무관했다. 손으로 돌려도 똑같이 크래시한다.
  8/26 19:42 실행이 성공했던 건, 그때는 한글 이름 객체가 아직 버킷에 없었거나
  크래시 지점 뒤에 있었기 때문으로 보인다.
