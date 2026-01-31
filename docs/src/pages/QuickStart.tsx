import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const QuickStart = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Quick Start</h1>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 18+</li>
        <li>Upstash Redis account (for storage)</li>
      </ul>

      <h2>1. Set Up Credentials</h2>
      <p>Set environment variables:</p>
      <CodeBlock
        language="bash"
        code={`$ export CTXBIN_STORE_URL="https://your-upstash-url"
$ export CTXBIN_STORE_TOKEN="your-upstash-token"`}
      />

      <p>Or use interactive setup (human-only):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin init
CTXBIN_STORE_URL: https://...
CTXBIN_STORE_TOKEN: ...`}
      />

      <h2>2. Save Context</h2>
      <p>Inside a git repository, save context (key is auto-inferred):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --value "# Project Context

## Summary
- Implemented user authentication
- Added login/logout endpoints

## Next Steps
- Add password reset
- Implement session management"`}
      />

      <h2>3. Load Context</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx load`}
      />

      <h2>4. Append to Context</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --value "## Update
- Fixed bug in login flow"`}
      />

      <h2>5. List All Contexts</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h2>6. Delete Context</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx delete`}
      />

      <h2>Key Inference</h2>
      <p>For <code>ctx</code> commands, when no key is provided, it is automatically inferred:</p>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD`}
      />

      <h2>Using with AI Agents</h2>
      <p>
        ctxbin is designed for AI agents. For best results, include the bundled skill:
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load ctxbin`}
      />
      <p>This prints the full ctxbin skill documentation for agents to reference.</p>
    </div>
  );
});
