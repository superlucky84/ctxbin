# Implementation Notes (ctxbin)

목적: 구현 컨텍스트 유지용 문서. 다른 모델/에이전트가 이어서 작업할 수 있도록 핵심 결정, 진행 상황, 체크리스트를 기록한다.

## 현재 상태
- 초기 스캐폴딩 완료(`package.json`, `tsconfig.json`, `tsup.config.ts`)
- 핵심 모듈 초안 구현(CLI, store, skillpack, skillref, config)
- 최소 테스트 일부 작성(검증 유틸 중심)
- 빌드/테스트 재확인 필요(최근 빌드 오류 수정됨)
- `list` 명령은 문서에만 추가됨(구현 필요)
- `list` 명령 구현 완료(스토어 list + 출력 규칙 포함)
- Windows 호환성(권한 처리 best-effort) 구현 완료, 테스트는 미작성
- 계획 문서: `DESIGN.md`
- 패키지 매니저: **pnpm**
- 기본 구조: `src/`, `tests/`
- 테스트 전략: **최소 테스트부터**, 이후 확대

## 최근 작업 요약 (2026-01-30)
- `src/`에 핵심 모듈 추가: `cli.ts`, `store.ts`, `skillpack.ts`, `skillref.ts`, `config.ts` 등
- `tests/validation.test.js` 추가(입력/헤더 기본 검증)
- `package.json`/`tsconfig.json`/`tsup.config.ts` 스캐폴딩 완료

다음 우선 작업: `pnpm build`와 `pnpm test` 재실행으로 현재 상태 확인 후, 미작성 테스트(입력 소스 단일화/skillpack/skillref 헤더/타입 불일치)부터 추가.

## 핵심 결정 사항 요약
- CLI 이름: **ctxbin** (ctxkit 아님)
- 스토리지: Upstash Redis, hash 기반 (`ctx`, `agent`, `skill`)
- `skill` 값 타입:
  - 문자열(Markdown)
  - **skillpack**: tar.gz + Base64
  - **skillref**: GitHub directory reference
- skillpack 규칙:
  - tar.gz 내부 경로는 `--dir` 기준 상대경로
  - 엔트리 정렬, gzip mtime=0, uid/gid=0
  - 기본 제외: `.git/`, `node_modules/`, `.DS_Store`
  - `.ctxbinignore` 미지원
  - **symlink 발견 시 에러**
  - 추출 시 권한 정규화(디렉터리 0755, 파일 0644, 실행파일 0755)
  - 메타데이터(소유자/타임스탬프) 보존하지 않음
  - 크기 제한: **tar.gz 7MB 초과 시 실패**
- skillref 규칙:
  - GitHub **public**만 지원, 다른 호스트/프라이빗 미지원
  - `--url`, `--ref`, `--path` 모두 필수
  - `--url`은 `https://github.com/<owner>/<repo>` (+ `.git` 허용, 정규화 시 제거)
  - `--ref`는 **40자리 커밋 SHA**만 허용
  - `--path`는 **디렉터리 경로만 허용**
  - fetch: `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>`
  - load 시 덮어쓰기 정책: 동일 경로는 **덮어쓰기**, 다른 파일은 유지
  - gzip/tar 실체 검증(콘텐츠 타입 신뢰 X)
  - 타임아웃: connect 5s, total 30s
  - 크기 제한: 압축 20MB, 추출 총 100MB
  - 파일 개수 제한: 5,000
  - 리다이렉트: 1회 허용, `github.com`/`codeload.github.com` 내에서만
  - symlink/특수파일은 에러
  - 재시도 없음, 임시 디렉터리 → 성공 시 원자적 이동
- 에러 포맷:
  - `CTXBIN_ERR <CODE>: <message>` (stderr, exit 1)
  - 코드 예: INVALID_INPUT, INVALID_URL, INVALID_REF, INVALID_PATH, NOT_FOUND, TYPE_MISMATCH, SIZE_LIMIT, NETWORK, IO
- 출력 규칙:
  - load: 문자열이면 stdout, skillpack/skillref는 `--dir` 필수
  - save/delete: stdout 없음
- 빌드/배포:
  - npm tarball 기반, `npx ctxbin` 실행
  - 기본 **CJS** 번들, Node **18.x** 최소 지원
  - TypeScript면 `tsup` 권장
  - tsup 기본: format cjs, platform node, target es2022, bundle true, splitting false, sourcemap true, minify false, banner shebang

## 구현 계획 (요약)
1) 프로젝트 스캐폴딩
2) CLI 구조
3) 스토리지 계층
4) 리소스 핸들러
5) skillpack
6) skillref
7) 에러 처리 & 출력 규칙
8) 최소 테스트

## 진행 체크리스트 (세분화)

스캐폴딩
- [x] `package.json` (pnpm) + 기본 스크립트
- [x] `src/`, `tests/` 디렉터리
- [x] `tsconfig.json` + `tsup.config.ts`

CLI 파서/입력 규칙
- [x] 명령 구조 + `ctx` key 추론 규칙
- [x] 입력 소스 단일화( `--file`/`--value`/stdin/`--dir`/`--url+--ref+--path` )
- [x] skill 전용 플래그 검증(`--dir`, `--url/--ref/--path`)
- [x] `list` 명령 파싱(키/플래그 금지)

스토리지(Upstash REST)
- [x] env/설정 로딩 순서(ENV → ~/.ctxbin/config.json)
- [x] hash get/set/delete + 네트워크 에러 처리
- [x] hash list(HGETALL) 구현

ctx/agent
- [x] load/save/delete + 출력 규칙
- [x] list 출력(키 + 타입)

skill (문자열)
- [x] load/save/delete + `--append`
- [x] list 출력(키 + 타입)

skillpack
- [x] tar.gz 생성 규칙(정렬/mtime=0/uid/gid=0/기본 제외, symlink 금지)
- [x] 7MB 제한 + Base64/헤더
- [x] 추출 규칙(권한 정규화/특수파일 거부/덮어쓰기)
- [x] Windows에서 chmod 실패는 best-effort로 무시

skillref
- [x] URL/REF/PATH 검증 + `.git` 정규화
- [x] codeload URL 생성 + 다운로드 제한(redirect/timeout/size)
- [x] gzip/tar 검증 + 파일 수 제한
- [x] 임시 디렉터리 추출 + 덮어쓰기 정책
- [x] Windows에서 chmod 실패는 best-effort로 무시

에러/출력
- [x] 에러 포맷/exit code/stdout·stderr 규칙

최소 테스트
- [ ] 입력 소스 단일화 규칙
- [x] `--url/--ref/--path` 검증
- [ ] skillpack 헤더/사이즈 제한
- [ ] skillref 헤더 파싱
- [ ] 타입 불일치 에러

테스트 확장(완성도 향상)
- [ ] ctx 키 자동 추론(깃 레포 유무 케이스)
- [ ] `--append` with 기존 값 유무
- [ ] skillpack 추출 권한 정규화 검증
- [ ] skillref 다운로드 제한(리다이렉트/타임아웃/사이즈)
- [ ] 오류 메시지 포맷(CTXBIN_ERR) 스냅샷 검증
- [ ] list 출력 형식/정렬/type 매핑 테스트
- [ ] Windows 호환성 테스트(권한 처리 best-effort)
- [ ] Upstash 통합 테스트 추가(CTXBIN_STORE_URL/CTXBIN_STORE_TOKEN 없으면 skip)

## 구현 메모
- `AGENTS.md`, `CLAUDE.md`, `.claude`는 `.gitignore`에 등록됨(커밋 제외)
- 설계는 `DESIGN.md`가 기준
