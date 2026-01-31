import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const HomeKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <div class="text-center py-12">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center bg-white/80 shadow-md ring-1 ring-gray-200 dark:bg-white/10 dark:ring-gray-700 md:h-24 md:w-24">
          <img src="/ctxbin/ctxbin.png" alt="ctxbin logo" class="h-14 w-14 md:h-16 md:w-16" />
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          ctxbin
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          AI 에이전트가 브랜치 범위 컨텍스트를 저장하고 복원하도록 하여,
          다음 에이전트가 재설명 없이 작업을 계속할 수 있게 합니다.
        </p>

        <div class="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => navigateTo('/guide/introduction')}
            class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            시작하기
          </button>
          <a
            href="https://github.com/superlucky84/ctxbin"
            target="_blank"
            rel="noopener noreferrer"
            class="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Agent Workflow - Core Usage */}
      <div class="mb-12 p-6 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20">
        <h2 class="text-indigo-700 dark:text-indigo-300">Agent Workflow (핵심)</h2>
        <p>
          <strong>가장 중요한 사용법입니다.</strong> 에이전트 지시 파일에 add-on을 붙여넣어
          에이전트가 일관되게 브랜치 컨텍스트를 저장하고 로드하도록 하세요. 이 워크플로는
          git 기반 프로젝트에서 키 자동 추론을 전제로 합니다.
        </p>
        <ol>
          <li>
            <a href="https://github.com/superlucky84/ctxbin/blob/main/agent-addon.md" target="_blank">agent-addon.md</a>를
            프로젝트의 에이전트 지침 파일에 복사 (예: <code>AGENT.md</code>, <code>CLAUDE.md</code>, 또는 유사한 파일)
          </li>
          <li>그런 다음 AI 에이전트에게 간단히 요청:</li>
        </ol>
        <CodeBlock
          language="text"
          code={`"npx ctxbin으로 현재 컨텍스트를 저장해줘."
"npx ctxbin으로 현재 컨텍스트를 불러와줘."`}
        />
        <p>
          add-on은 에이전트에게 컨텍스트 형식(요약, 다음 단계, 결정사항)과
          <code>npx ctxbin ctx save/load</code> 사용법을 알려줍니다.
        </p>
      </div>
      <p class="text-sm text-indigo-700/80 dark:text-indigo-200/80 mb-12">
        팁: <code>npx ctxbin skill load ctxbin</code> 명령으로 번들된 ctxbin 스킬 텍스트를 볼 수 있습니다.
      </p>

      <div class="mb-12">
        <h2>직접 CLI 사용</h2>
        <p>
          커맨드 라인에서 직접 ctxbin을 사용할 수도 있습니다. git 저장소 안에서는 키가 자동
          추론되며, git 밖에서는 명시적으로 키를 넣어야 합니다. 자세한 내용은{' '}
          <a href="/ko/guide/ctx-commands" class="text-indigo-600 hover:underline">ctx 명령어</a>를 참고하세요.
        </p>
        <CodeBlock
          language="bash"
          code={`$ npx ctxbin ctx save --value "프로젝트 컨텍스트"
$ npx ctxbin ctx load`}
        />
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-12">
        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🤖 에이전트 우선 설계
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            AI 에이전트가 세션 간 컨텍스트를 유지하도록 설계되었습니다.
            비대화형, 프롬프트 없음, 명확한 에러와 함께 빠른 실패.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🔑 키 추론
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            git 저장소 이름과 브랜치로부터 컨텍스트 저장 키를 자동 추론합니다.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            📁 Skillpacks
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            전체 스킬 디렉터리를 tar.gz 아카이브로 번들링하여 쉽게 배포합니다.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🔗 GitHub Skillrefs
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            콘텐츠를 저장하지 않고 GitHub 저장소에서 직접 스킬을 참조합니다.
          </p>
        </div>
      </div>

      <div class="mb-12">
        <h2>ctxbin이 아닌 것</h2>
        <ul>
          <li>AI 메모리가 아님</li>
          <li>RAG 시스템이 아님</li>
          <li>시맨틱 검색이 아님</li>
          <li>지능형 검색이 아님</li>
        </ul>
        <p>
          ctxbin은 <strong>얇은 Redis HASH 클라이언트</strong>입니다 - 명시적이고, 예측 가능하며, 결정론적입니다.
        </p>
      </div>
    </div>
  );
});
