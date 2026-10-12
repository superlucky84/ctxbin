import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const IntroductionKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>소개</h1>

      <p>
        <code>ctxbin</code>은 <code>npx</code>로 실행되는 <strong>최소한의 결정론적 Node.js CLI 도구</strong>로,
        <strong>AI 코딩 에이전트</strong>가 <strong>Upstash Redis</strong>를 백엔드로 사용하여
        <strong>마크다운 기반 컨텍스트, 에이전트 역할, 스킬</strong>을 저장, 로드, 추가, 삭제할 수 있도록 설계되었습니다.
      </p>

      <h2>ctxbin의 특징</h2>
      <ul>
        <li>얇은 Redis HASH 클라이언트</li>
        <li>비대화형 (<code>init</code> 제외)</li>
        <li>명시적이고 예측 가능</li>
        <li>에이전트 안전 설계</li>
      </ul>

      <h2>ctxbin이 아닌 것</h2>
      <ul>
        <li>AI 메모리가 아님</li>
        <li>RAG 시스템이 아님</li>
        <li>시맨틱 검색이 아님</li>
        <li>지능형 검색이 아님</li>
      </ul>

      <h2>실행 모델</h2>
      <ul>
        <li><strong>런타임:</strong> Node.js</li>
        <li><strong>배포:</strong> npm</li>
        <li><strong>실행:</strong> <code>npx ctxbin ...</code></li>
        <li><strong>플랫폼:</strong> macOS / Linux / Windows</li>
        <li><strong>셸 가정:</strong> 없음</li>
      </ul>

      <p><code>init</code>을 제외한 모든 명령어는 <strong>비대화형</strong>입니다.</p>

      <h2>저장소 백엔드</h2>
      <ul>
        <li><strong>백엔드:</strong> Upstash Redis</li>
        <li><strong>접근:</strong> HTTP REST API</li>
        <li><strong>Redis 데이터 타입:</strong> HASH만 사용</li>
      </ul>

      <h2>세 가지 리소스 타입</h2>

      <h3>1. Context (ctx)</h3>
      <p>브랜치 범위의 프로젝트 컨텍스트. git에서 <span onClick={() => navigateTo('/guide/key-inference')} class="text-indigo-600 hover:underline cursor-pointer">키를 자동 추론</span>할 수 있습니다.</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --value "프로젝트 컨텍스트"
$ npx ctxbin ctx load`}
      />

      <h3>2. Agent</h3>
      <p>에이전트 역할 정의. 키는 항상 필수입니다.</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent save reviewer --value "# 에이전트 역할"
$ npx ctxbin agent load reviewer`}
      />

      <h3>3. Skill</h3>
      <p>문자열, skillpack (디렉터리), 또는 skillref (GitHub 참조)로 스킬 정의.</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --value "# 스킬 마크다운"
$ npx ctxbin skill save my-skill --dir ./skills/my-skill
$ npx ctxbin skill save my-skill --url https://github.com/owner/repo --path skills/my-skill`}
      />

      <h2>원격 스킬·에이전트 설치</h2>
      <p><code>sync</code>는 agent·skill 리소스를 읽어 로컬 Claude Code와 Codex에 설치합니다. --target claude, codex, all 중 하나를 선택하며 키나 Git 저장소는 필요하지 않습니다.</p>
      <CodeBlock language="bash" code={`npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all`} />
      <p>같은 이름 항목은 전체를 교체하고 로컬에만 있는 항목은 유지합니다. --prune은 같은 저장소에서 설치한 항목 중 원격에서 사라진 항목만 삭제합니다. 업로드에는 기존 save 명령을 사용합니다. 전체 동작은 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요. 컨텍스트 동기화는 별도 도구 ctxloc에서 담당합니다.</p>

      <h2>비대화형 보장</h2>
      <p><code>init</code>을 제외한 모든 명령어는:</p>
      <ul>
        <li>절대 프롬프트하지 않음</li>
        <li>절대 블로킹하지 않음</li>
        <li>명확한 에러와 함께 빠른 실패</li>
      </ul>
    </div>
  );
});
