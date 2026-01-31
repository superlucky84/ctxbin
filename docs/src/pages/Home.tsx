import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const Home = mount(() => {
  return () => (
    <div class="page-sheet">
      <div class="text-center py-12">
        <span class="text-6xl mb-6 block">📦</span>
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          ctxbin
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Let AI agents persist and restore branch-scoped context,
          so the next agent can continue without re-explanation.
        </p>

        <div class="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => navigateTo('/guide/introduction')}
            class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Get Started
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
        <h2 class="text-indigo-700 dark:text-indigo-300">Agent Workflow (Core)</h2>
        <p>
          <strong>This is the most important usage.</strong> Paste the add-on into your agent instruction file
          so agents consistently save and load branch context. This workflow assumes a git-based project
          for automatic key inference.
        </p>
        <ol>
          <li>
            Copy <a href="https://github.com/superlucky84/ctxbin/blob/main/agent-addon.md" target="_blank">agent-addon.md</a> into
            your project's agent instruction file (e.g. <code>AGENT.md</code>, <code>CLAUDE.md</code>, or any equivalent)
          </li>
          <li>Then simply ask your AI agent:</li>
        </ol>
        <CodeBlock
          language="text"
          code={`"Use ctxbin to save the current context."
"Use ctxbin to load the current context."`}
        />
        <p>
          The add-on tells agents how to format context (summary, next steps, decisions)
          and how to use <code>ctxbin ctx save/load</code> correctly.
        </p>
      </div>

      <div class="mb-12">
        <h2>Direct CLI Usage</h2>
        <p>
          You can also use ctxbin directly from the command line. Inside a git repo, ctx keys are
          inferred automatically. Outside git, you must pass an explicit key. See{' '}
          <a href="/guide/ctx-commands" class="text-indigo-600 hover:underline">ctx commands</a> for details.
        </p>
        <CodeBlock
          language="bash"
          code={`$ npx ctxbin ctx save --value "project context here"
$ npx ctxbin ctx load`}
        />
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-12">
        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🤖 Agent-First Design
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Built for AI agents to persist context across sessions.
            Non-interactive, no prompts, fail-fast with clear errors.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🔑 Key Inference
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Automatic key inference from git repository name and branch for context storage.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            📁 Skillpacks
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Bundle entire skill directories as tar.gz archives for easy distribution.
          </p>
        </div>

        <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            🔗 GitHub Skillrefs
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Reference skills directly from GitHub repositories without storing content.
          </p>
        </div>
      </div>

      <div class="mb-12">
        <h2>What ctxbin is NOT</h2>
        <ul>
          <li>Not AI memory</li>
          <li>Not RAG system</li>
          <li>Not semantic search</li>
          <li>Not intelligent retrieval</li>
        </ul>
        <p>
          ctxbin is a <strong>thin Redis HASH client</strong> - explicit, predictable, and deterministic.
        </p>
      </div>
    </div>
  );
});
