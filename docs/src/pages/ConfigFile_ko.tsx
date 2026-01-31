import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ConfigFileKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>설정 파일</h1>

      <p>
        ctxbin은 로컬 설정 파일에 자격 증명을 저장할 수 있습니다.
        이는 사람 사용자에게 유용하지만 AI 에이전트에는 권장되지 않습니다.
      </p>

      <h2>설정 파일 위치</h2>
      <CodeBlock
        language="text"
        code={`~/.ctxbin/config.json`}
      />

      <h2>설정 파일 형식</h2>
      <CodeBlock
        language="json"
        code={`{
  "store_url": "https://your-redis.upstash.io",
  "store_token": "your-token-here"
}`}
      />

      <h2>대화형 설정</h2>
      <p>
        대화형 설정에는 <code>npx ctxbin init</code> 사용 (사람만 해당):
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin init
CTXBIN_STORE_URL: https://your-redis.upstash.io
CTXBIN_STORE_TOKEN: your-token-here`}
      />
      <p>
        자격 증명을 묻고 <code>~/.ctxbin/config.json</code>에 저장합니다.
      </p>

      <h2>수동 설정</h2>
      <CodeBlock
        language="bash"
        code={`$ mkdir -p ~/.ctxbin
$ cat > ~/.ctxbin/config.json << 'EOF'
{
  "store_url": "https://your-redis.upstash.io",
  "store_token": "your-token-here"
}
EOF`}
      />

      <h2>해석 순서</h2>
      <ol>
        <li><strong>환경 변수</strong> (최우선)</li>
        <li><code>~/.ctxbin/config.json</code> (폴백)</li>
      </ol>

      <p>
        환경 변수는 항상 설정 파일보다 우선합니다.
      </p>

      <h2>보안 참고</h2>
      <p>
        설정 파일에는 민감한 자격 증명이 포함됩니다.
        적절한 파일 권한을 확인하세요 (<code>chmod 600 ~/.ctxbin/config.json</code>).
      </p>
    </div>
  );
});
