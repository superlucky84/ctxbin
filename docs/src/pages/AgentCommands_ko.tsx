import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

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
        code={`$ npx ctxbin agent load frontend-reviewer`}
      />

      <h2>Save</h2>
      <CodeBlock
        language="bash"
        code={`# --value 플래그에서
$ npx ctxbin agent save frontend-reviewer --value "# 에이전트 역할 마크다운"

# 파일에서
$ npx ctxbin agent save frontend-reviewer --file agent.md`}
      />

      <h2>공통 에이전트 규칙 설치</h2>
      <p>도구에 공통으로 사용할 Markdown을 저장한 뒤 원격 에이전트·스킬 전체를 Claude Code와 Codex에 설치합니다. 에이전트 메타데이터는 name·description만 지원하며 name은 원격 키와 같아야 합니다.</p>
      <CodeBlock language="markdown" code={`---
name: reviewer
description: 코드 변경의 정확성과 누락된 테스트를 검토합니다.
---

변경된 코드를 확인하고 수정 가능한 문제를 보고합니다.`} />
      <CodeBlock language="bash" code={`npx ctxbin agent save reviewer --file reviewer.md
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all`} />
      <p>Claude에는 ~/.claude/agents/&lt;name&gt;.md, Codex에는 ~/.codex/agents/&lt;name&gt;.toml을 생성합니다. 기존 일반 Markdown에는 키로 이름을 채우고 “Agent rules for &lt;name&gt;.”을 기본 설명으로 넣습니다. 모델·도구 등 지원하지 않는 메타데이터는 오류를 반환합니다. 변경 업로드에는 기존 agent save --file을 사용하며 sync는 원격을 읽기만 합니다. 덮어쓰기·설치 이력 기반 삭제·경로 지정은 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요.</p>

      <h2>Append</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent save frontend-reviewer --append --file addition.md`}
      />

      <h2>List</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent list
frontend-reviewer --value
backend-reviewer  --value`}
      />

      <h2>Delete</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent delete frontend-reviewer`}
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
