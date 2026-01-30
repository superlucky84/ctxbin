# Testing Guide

Upstash Redis에 실제 연결해서 `ctxbin`을 테스트하는 방법을 정리합니다.

## 사전 준비
- Node.js 18+
- pnpm
- Upstash Redis REST URL/TOKEN

환경 변수로 설정하거나 로컬 설정 파일을 사용하세요.

### 환경 변수 방식(권장)
```bash
export CTXBIN_STORE_URL="https://..."
export CTXBIN_STORE_TOKEN="..."
```

### 설정 파일 방식
```json
// ~/.ctxbin/config.json
{
  "store_url": "https://...",
  "store_token": "..."
}
```

> `ctxbin init`는 인터랙티브 설정용입니다.

## 로컬 빌드
```bash
pnpm install
pnpm build
```

## 기본 동작 확인
빌드 후에는 아래처럼 실행하세요.

```bash
node dist/cli.js ctx save --value "hello"
node dist/cli.js ctx load
node dist/cli.js ctx delete
```

> `ctx`는 git repo 안에서만 키 추론이 가능합니다.

## agent/skill 확인
```bash
node dist/cli.js agent save reviewer --value "# Agent role"
node dist/cli.js agent load reviewer
node dist/cli.js agent delete reviewer
```

### skillpack (디렉터리 저장)
```bash
node dist/cli.js skill save fp-pack --dir ./path/to/skill
node dist/cli.js skill load fp-pack --dir ./tmp/skill
```

### skillref (GitHub 참조 저장)
```bash
node dist/cli.js skill save fp-pack \
  --url https://github.com/OWNER/REPO \
  --ref <40-hex-commit-sha> \
  --path skills/fp-pack

node dist/cli.js skill load fp-pack --dir ./tmp/skill
```

## 테스트 스크립트
```bash
pnpm test
```

## 주의 사항
- skillpack은 tar.gz 기준 7MB 제한이 있습니다.
- skillref는 GitHub public repo만 지원합니다.
- 오류는 `CTXBIN_ERR <CODE>: <message>` 형식으로 출력됩니다.
