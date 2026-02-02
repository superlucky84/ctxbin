import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const QuickStartKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>빠른 시작</h1>

      <h2>사전 요구사항</h2>
      <ul>
        <li>Node.js 18+</li>
        <li>Upstash Redis 계정 (저장소용)</li>
      </ul>

      <h2>1. 자격 증명 설정</h2>
      <p>환경 변수 설정:</p>
      <CodeBlock
        language="bash"
        code={`$ export CTXBIN_STORE_URL="https://your-upstash-url"
$ export CTXBIN_STORE_TOKEN="your-upstash-token"`}
      />

      <p>또는 대화형 설정 사용 (사람만 해당):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin init
CTXBIN_STORE_URL: https://...
CTXBIN_STORE_TOKEN: ...`}
      />

      <h2>2. AI 에이전트와 함께 사용 (핵심 사용법)</h2>
      <p>
        <strong>이것이 ctxbin의 주된 사용 방법입니다.</strong> AI 에이전트가 컨텍스트를 저장하고 로드하도록 하세요.
      </p>

      <h3>방법 1: 제로 셋업 (가장 간단)</h3>
      <p>AI 에이전트에게 바로 요청하세요:</p>
      <CodeBlock
        language="text"
        code={`"npx ctxbin help 실행해서 사용법 확인하고, 현재 컨텍스트 저장해줘."`}
      />
      <p>에이전트가 사용법 가이드를 스스로 확인하고 따릅니다.</p>

      <h3>방법 2: Add-on 파일</h3>
      <p>세션 간 일관된 동작을 위해 에이전트 지시 파일에 add-on을 복사하세요:</p>
      <ol>
        <li>
          <a href="https://superlucky84.github.io/ctxbin/#/guide/agent-addon" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">agent-addon.md</a>를
          프로젝트의 에이전트 지침 파일에 복사 (예: <code>AGENT.md</code>, <code>CLAUDE.md</code>)
        </li>
        <li>그런 다음 AI 에이전트에게 간단히 요청:</li>
      </ol>
      <CodeBlock
        language="text"
        code={`"npx ctxbin으로 현재 컨텍스트를 저장해줘."
"npx ctxbin으로 현재 컨텍스트를 불러와줘."`}
      />

      <h2>3. 직접 CLI 사용</h2>
      <p>커맨드 라인에서 직접 ctxbin을 사용할 수도 있습니다.</p>

      <h3>컨텍스트 저장</h3>
      <p>git 저장소 안에서 컨텍스트 저장 (키는 자동 추론):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --value "# 프로젝트 컨텍스트

## 요약
- 사용자 인증 구현
- 로그인/로그아웃 엔드포인트 추가

## 다음 단계
- 비밀번호 재설정 추가
- 세션 관리 구현"`}
      />

      <h3>컨텍스트 로드</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx load`}
      />

      <h3>컨텍스트에 추가</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --value "## 업데이트
- 로그인 플로우 버그 수정"`}
      />

      <h3>모든 컨텍스트 목록</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h3>컨텍스트 삭제</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx delete`}
      />

      <h2>키 추론</h2>
      <p><code>ctx</code> 명령어에서 키를 제공하지 않으면 자동으로 추론됩니다:</p>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git 저장소 루트 디렉터리 이름
branch  = git rev-parse --abbrev-ref HEAD`}
      />
    </div>
  );
});
