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

      <h2>2. 컨텍스트 저장</h2>
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

      <h2>3. 컨텍스트 로드</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx load`}
      />

      <h2>4. 컨텍스트에 추가</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --value "## 업데이트
- 로그인 플로우 버그 수정"`}
      />

      <h2>5. 모든 컨텍스트 목록</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h2>6. 컨텍스트 삭제</h2>
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

      <h2>AI 에이전트와 함께 사용</h2>
      <p>
        ctxbin은 AI 에이전트용으로 설계되었습니다. 최상의 결과를 위해 번들 스킬을 포함하세요:
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load ctxbin`}
      />
      <p>이 명령어는 에이전트가 참조할 전체 ctxbin 스킬 문서를 출력합니다.</p>
    </div>
  );
});
