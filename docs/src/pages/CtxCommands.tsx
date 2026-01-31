import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const CtxCommands = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>ctx Commands</h1>

      <p>
        The <code>ctx</code> resource stores branch-scoped project context.
        Keys can be automatically inferred from git repository name and branch.
      </p>

      <h2>Key Inference</h2>
      <p>When no key is provided, ctxbin automatically infers the key:</p>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD`}
      />
      <p>This requires running inside a git repository.</p>

      <h2>Load</h2>
      <p>Load context from Redis:</p>
      <CodeBlock
        language="bash"
        code={`# Auto-key (inferred from git)
$ npx ctxbin ctx load

# Explicit key
$ npx ctxbin ctx load my-project/main`}
      />

      <h2>Save (Replace)</h2>
      <p>Save new context, replacing any existing value:</p>
      <p>
        Explicit keys are useful outside git repos, but are not recommended for normal use.
      </p>
      <CodeBlock
        language="bash"
        code={`# From --value flag
$ npx ctxbin ctx save --value "markdown string"

# From file
$ npx ctxbin ctx save --file context.md

# From stdin
$ cat context.md | npx ctxbin ctx save

# With explicit key
$ npx ctxbin ctx save my-project/main --file context.md`}
      />

      <h2>Save (Append)</h2>
      <p>Append to existing context (separator: <code>\n\n</code>):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --file note.md
$ npx ctxbin ctx save my-project/main --append --value "additional notes"`}
      />
      <p>If the key does not exist, behaves the same as normal save.</p>

      <h2>List</h2>
      <p>List all stored contexts:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h2>Delete</h2>
      <p>Delete a context:</p>
      <CodeBlock
        language="bash"
        code={`# Auto-key
$ npx ctxbin ctx delete

# Explicit key
$ npx ctxbin ctx delete my-project/main`}
      />
      <ul>
        <li>No confirmation prompt (agent-safe)</li>
        <li>Fails fast if key cannot be inferred</li>
      </ul>

      <h2>Redis Mapping</h2>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): ctx
Field           : {project}/{branch}
Value           : markdown string (UTF-8)`}
      />
    </div>
  );
});
