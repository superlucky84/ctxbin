import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const AgentCommandsKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>agent 명령어</h1>

      <p>
        <code>agent</code> 리소스는 에이전트 역할 정의를 저장합니다.
        <strong>키는 항상 필수</strong>입니다 (자동 추론 없음).
      </p>

      <h2>Load</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin agent load frontend-reviewer`}
      />

      <h2>Save</h2>
      <CodeBlock
        language="bash"
        code={`# --value 플래그에서
$ ctxbin agent save frontend-reviewer --value "# 에이전트 역할 마크다운"

# 파일에서
$ ctxbin agent save frontend-reviewer --file agent.md`}
      />

      <h2>Append</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin agent save frontend-reviewer --append --file addition.md`}
      />

      <h2>List</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin agent list
frontend-reviewer --value
backend-reviewer  --value`}
      />

      <h2>Delete</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin agent delete frontend-reviewer`}
      />
      <ul>
        <li>키가 없으면 즉시 에러</li>
        <li>확인 프롬프트 없음</li>
      </ul>

      <h2>Redis 매핑</h2>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): agent
Field           : {agent-name}
Value           : 마크다운 문자열`}
      />
    </div>
  );
});
