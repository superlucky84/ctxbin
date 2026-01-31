import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const AgentAddonKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>AI Agent Addon</h1>

      <p>
        아래 블록을 <code>AGENT.md</code> 또는 <code>CLAUDE.md</code>에 복사/붙여넣기하여
        AI 에이전트의 ctxbin 컨텍스트 지속성을 활성화하세요.
      </p>

      <h2>ctxbin (컨텍스트 지속성)</h2>

      <p>
        <code>ctxbin ctx save</code>를 사용하여 <strong>브랜치 범위 컨텍스트</strong>를 저장하면
        다음 에이전트가 재설명 없이 작업을 계속할 수 있습니다.
      </p>

      <blockquote>
        팁: <code>npx ctxbin skill load ctxbin</code>은 번들된 ctxbin 스킬 텍스트를 출력하여
        에이전트가 전체 ctxbin 가이드를 참조할 수 있게 합니다.
      </blockquote>

      <h3>ctx 키 추론 방식 (키 생략 시)</h3>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git 저장소 루트 디렉터리 이름
branch  = git rev-parse --abbrev-ref HEAD`}
      />

      <h3>컨텍스트 저장 (권장)</h3>
      <CodeBlock
        language="bash"
        code={`$ ctxbin ctx save --value "<요약 + 다음 단계 + 결정사항>"`}
      />

      <h3>stdin으로 저장</h3>
      <CodeBlock
        language="bash"
        code={`$ echo "<context>" | ctxbin ctx save`}
      />

      <h3>컨텍스트 로드</h3>
      <CodeBlock
        language="bash"
        code={`$ ctxbin ctx load`}
      />

      <h2>ctx에 포함할 내용</h2>
      <ul>
        <li>변경된 내용 (요약)</li>
        <li>남은 작업 (다음 단계)</li>
        <li>완료된 항목 vs 남은 체크리스트 항목</li>
        <li>중요한 결정/제약사항</li>
        <li>수정한 파일과 이유</li>
        <li>실패한 테스트 또는 경고</li>
      </ul>

      <h2>하지 말아야 할 것</h2>
      <ul>
        <li>비밀 정보 저장 금지</li>
        <li>사소한 메시지로 덮어쓰기 금지</li>
      </ul>
    </div>
  );
});
