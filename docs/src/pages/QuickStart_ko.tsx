import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

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
          <span onClick={() => navigateTo('/ko/guide/agent-addon')} class="text-indigo-600 hover:underline cursor-pointer">agent-addon.md</span>를
          프로젝트의 에이전트 지침 파일에 복사 (예: <code>AGENT.md</code>, <code>CLAUDE.md</code>)
        </li>
        <li>그런 다음 AI 에이전트에게 간단히 요청:</li>
      </ol>
      <CodeBlock
        language="text"
        code={`"npx ctxbin으로 현재 컨텍스트를 저장해줘."
"npx ctxbin으로 현재 컨텍스트를 불러와줘."`}
      />

      <h3>에이전트로 스킬 관리</h3>
      <p>에이전트에게 스킬 저장도 요청할 수 있습니다:</p>
      <CodeBlock
        language="text"
        code={`"이 스킬을 ctxbin에 저장해줘: https://github.com/user/repo/tree/main/skills/my-skill (--ref는 생략)"

또는:

"./claude/skills/my-skill에 있는 스킬을 ctxbin에 --dir로 저장해줘."`}
      />
      <p>
        에이전트가 GitHub URL을 파싱해서 적절한 <code>--url</code>과 <code>--path</code> 옵션으로 변환합니다.
      </p>

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

      <h2>4. 원격 스킬·에이전트 설치</h2>
      <p>1단계 자격 증명으로 기본은 전체를 설치하며 --skill·--agent로 필요한 이름만 고를 수 있습니다. 미리보기는 원격 자료를 내려받고 검증하며 설치 폴더를 변경하지 않습니다:</p>
      <CodeBlock language="bash" code={`# 기존 명령으로 정의 저장
npx ctxbin skill save my-skill --dir ./skills/my-skill
npx ctxbin agent save reviewer --file reviewer.md

# 두 도구에 미리보기 후 설치
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all

# 한 도구에 설치하고 이력에 있는 오래된 항목 정리
npx ctxbin sync --target codex --prune`} />
      <p>스킬 번들에는 루트 SKILL.md가 필요합니다. 공통 에이전트 Markdown은 name·description 메타데이터를 지원하며 기존 일반 Markdown도 사용할 수 있습니다. 같은 이름 스킬은 폴더 전체를 교체하고 로컬에만 있는 항목은 유지합니다. 에이전트 예제·설치 위치·경로 지정·복구 설명은 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요.</p>
      <p>로컬 변경 업로드에는 기존 skill save --dir 또는 agent save --file을 사용합니다. Sync는 원격 저장소를 읽기만 하며 Git이나 키가 필요하지 않습니다.</p>

      <h2>키 추론</h2>
      <p>
        <code>ctx</code> 명령어에서 키를 제공하지 않으면, ctxbin이 git 저장소에서
        자동으로 키를 추론합니다 (<code>{'{project}/{branch}'}</code>).
      </p>
      <p>
        프로젝트 이름이 어떻게 결정되는지, 명시적 키를 언제 사용해야 하는지는
        <span onClick={() => navigateTo('/guide/key-inference')} class="text-indigo-600 hover:underline cursor-pointer">키 추론</span> 페이지를 참고하세요.
      </p>
      <p>같은 이름 미관리 항목의 교체에는 --force가 필요합니다. 미리보기에서 replace-unmanaged로 표시하며, 관리 항목의 내용·권한이 같으면 unchanged로 표시해 다시 쓰지 않습니다.</p>
      <p>클라이언트 설치와 별개로 원본 저장값을 백업하고 복구를 미리 보려면 <span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">백업·복구 안내</span>.</p>
      <CodeBlock language="bash" code={'npx ctxbin backup --file ./backups/ctxbin.json\nnpx ctxbin restore --file ./backups/ctxbin.json --dry-run'} />
    </div>
  );
});
