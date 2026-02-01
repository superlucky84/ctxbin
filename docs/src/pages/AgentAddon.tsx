import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

const addonBlock = [
  '<!-- BEGIN CTXBIN AGENT ADDON -->',
  '',
  '## ctxbin',
  '',
  'Before using ctxbin, review the built-in usage guide:',
  '```bash',
  'npx ctxbin skill load ctxbin',
  '```',
  '',
  '<!-- END CTXBIN AGENT ADDON -->',
].join('\n');

async function copyAddonBlock(event: Event) {
  const button = event.currentTarget as HTMLButtonElement | null;
  const original = button?.textContent || 'Copy';

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
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  } catch {
    if (button) {
      button.textContent = 'Copy failed';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  }
}

export const AgentAddon = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>AI Agent Addon</h1>

      <p>
        Copy/paste the block below into your project's agent instruction file
        (for example <code>AGENT.md</code>, <code>CLAUDE.md</code>, or an equivalent).
      </p>

      <div class="relative mb-8">
        <button
          type="button"
          onClick={copyAddonBlock}
          class="absolute right-3 top-3 z-10 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Copy
        </button>
        <CodeBlock language="text" code={addonBlock} />
      </div>

      <p>
        This add-on is intentionally minimal. For the full, canonical ctxbin usage guide, run:
      </p>
      <CodeBlock language="bash" code={`$ npx ctxbin skill load ctxbin`} />
    </div>
  );
});
