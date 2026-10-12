import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

const addonBlock = [
  '<!-- BEGIN CTXBIN AGENT ADDON -->',
  '',
  '## ctxbin',
  '',
  'ctxbin을 사용하기 전에 내장 사용 가이드를 확인하세요:',
  '```bash',
  'npx ctxbin help',
  '```',
  '',
  '로컬에 설치된 스킬과 에이전트 정의를 우선 사용하세요.',
  '사용자가 로컬 설치·동기화를 명시적으로 요청할 때만 `ctxbin sync`를 실행하고 대상을 명시하세요.',
  '',
  '<!-- END CTXBIN AGENT ADDON -->',
].join('\n');

async function copyAddonBlock(event: Event) {
  const button = event.currentTarget as HTMLButtonElement | null;
  const original = button?.textContent || '복사';

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(addonBlock);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = addonBlock;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (button) {
      button.textContent = '복사됨';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  } catch {
    if (button) {
      button.textContent = '복사 실패';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  }
}

export const AgentAddonKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>AI Agent Addon</h1>

      <p>
        아래 블록을 프로젝트의 에이전트 지침 파일(예: <code>AGENT.md</code>, <code>CLAUDE.md</code>)에
        복사/붙여넣기하세요.
      </p>

      <div class="relative mb-8">
        <button
          type="button"
          onClick={copyAddonBlock}
          class="absolute right-3 top-3 z-10 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          복사
        </button>
        <CodeBlock language="text" code={addonBlock} />
      </div>

      <p>이 애드온은 의도적으로 최소화되어 있습니다. 전체 ctxbin 사용 가이드는 아래로 확인하세요:</p>
      <CodeBlock language="bash" code={`$ npx ctxbin help`} />

      <p>가이드에는 컨텍스트 전달과 원격 스킬·에이전트의 Claude Code/Codex 설치가 포함됩니다. 일반 작업에서는 로컬 정의를 사용하고, 사용자가 동기화를 요청하면 --target으로 대상을 선택하세요. 미리보기와 설치 이력에 한정한 삭제는 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인할 수 있습니다.</p>

      <p class="mt-6 text-sm">
        원본: <a href="https://github.com/superlucky84/ctxbin/blob/main/agent-addon.md" target="_blank" rel="noopener noreferrer">GitHub의 agent-addon.md</a>
      </p>
    </div>
  );
});
