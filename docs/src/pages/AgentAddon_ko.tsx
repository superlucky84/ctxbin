import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

const addonBlock = [
  '<!-- BEGIN CTXBIN AGENT ADDON -->',
  '',
  '## ctxbin',
  '',
  'ctxbin을 사용하기 전에 내장 사용 가이드를 확인하세요:',
  '```bash',
  'npx ctxbin skill load ctxbin',
  '```',
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
      <CodeBlock language="bash" code={`$ npx ctxbin skill load ctxbin`} />
    </div>
  );
});
