import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const AgentCommands = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>agent Commands</h1>

      <p>
        The <code>agent</code> resource stores agent role definitions.
        <strong>Key is always required</strong> (no auto-inference).
      </p>

      <h2>Load</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent load frontend-reviewer`}
      />

      <h2>Save</h2>
      <CodeBlock
        language="bash"
        code={`# From --value flag
$ npx ctxbin agent save frontend-reviewer --value "# Agent role markdown"

# From file
$ npx ctxbin agent save frontend-reviewer --file agent.md`}
      />

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
        <li>Missing key results in immediate error</li>
        <li>No confirmation prompt</li>
      </ul>

      <h2>Redis Mapping</h2>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): agent
Field           : {agent-name}
Value           : markdown string`}
      />
    </div>
  );
});
