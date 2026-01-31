import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ConfigEnvKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>환경 변수</h1>

      <p>
        ctxbin은 Upstash Redis에 연결하기 위해 두 개의 자격 증명이 필요합니다.
        환경 변수는 AI 에이전트에 권장되는 방법입니다.
      </p>

      <h2>필수 변수</h2>
      <CodeBlock
        language="bash"
        code={`CTXBIN_STORE_URL   # Upstash Redis REST URL
CTXBIN_STORE_TOKEN # Upstash Redis REST 토큰`}
      />

      <h2>환경 변수 설정</h2>

      <h3>Bash / Zsh</h3>
      <CodeBlock
        language="bash"
        code={`export CTXBIN_STORE_URL="https://your-redis.upstash.io"
export CTXBIN_STORE_TOKEN="your-token-here"`}
      />

      <h3>스크립트에서</h3>
      <CodeBlock
        language="bash"
        code={`CTXBIN_STORE_URL="https://..." CTXBIN_STORE_TOKEN="..." npx ctxbin ctx load`}
      />

      <h3>.env 파일 (dotenv 사용)</h3>
      <CodeBlock
        language="text"
        code={`# .env
CTXBIN_STORE_URL=https://your-redis.upstash.io
CTXBIN_STORE_TOKEN=your-token-here`}
      />

      <h2>해석 순서</h2>
      <ol>
        <li><strong>환경 변수</strong> (최우선)</li>
        <li><code>~/.ctxbin/config.json</code> (폴백)</li>
      </ol>

      <p>
        환경 변수가 설정되면 <code>ctxbin init</code>이 필요하지 않습니다.
      </p>

      <h2>Upstash 자격 증명 얻기</h2>
      <ol>
        <li><a href="https://upstash.com" target="_blank">upstash.com</a>에서 계정 생성</li>
        <li>새 Redis 데이터베이스 생성</li>
        <li>데이터베이스 상세 페이지로 이동</li>
        <li>REST URL과 REST Token 복사</li>
      </ol>
    </div>
  );
});
