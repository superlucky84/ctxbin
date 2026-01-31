import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const Skillref = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Skillref (GitHub Reference)</h1>

      <p>
        Skillrefs store a GitHub directory pointer as a single Redis value.
        Content is fetched from GitHub on load, not stored in Redis.
      </p>

      <h2>On-Wire Format</h2>
      <CodeBlock
        language="json"
        code={`ctxbin-skillref@1
{"url":"https://github.com/OWNER/REPO","path":"skills/example","ref":"<40-hex-sha>"}

// or for tracking default branch:
ctxbin-skillref@1
{"url":"https://github.com/OWNER/REPO","path":"skills/example","track":"default"}`}
      />

      <h2>Save a Skillref (Pinned)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --ref a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \\
  --path skills/my-skill`}
      />

      <h2>Save a Skillref (Track Default Branch)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --path skills/my-skill`}
      />
      <p>Omitting <code>--ref</code> tracks the repository's default branch.</p>

      <h2>Load a Skillref</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load my-skill --dir ./output/my-skill`}
      />
      <p><code>--dir</code> is required for skillref load.</p>

      <h2>URL Requirements</h2>
      <ul>
        <li>Must be HTTPS GitHub repo root: <code>https://github.com/owner/repo</code></li>
        <li><code>.git</code> suffix is allowed and stripped</li>
        <li>No <code>/tree/...</code> paths</li>
        <li><strong>Public repositories only</strong></li>
      </ul>

      <h2>Ref Requirements</h2>
      <ul>
        <li>Must be a <strong>full 40-hex commit SHA</strong></li>
        <li>Tags and branch names are not allowed</li>
        <li>If omitted, tracks default branch (resolved at load time)</li>
      </ul>

      <h2>Path Requirements</h2>
      <ul>
        <li>Must be a directory path within the repo</li>
        <li>No leading <code>/</code></li>
        <li>No <code>..</code> traversal</li>
      </ul>

      <h2>Fetch Behavior</h2>
      <ul>
        <li>Downloads from <code>codeload.github.com</code></li>
        <li>Connect timeout: 5 seconds</li>
        <li>Download timeout: 30 seconds</li>
        <li>Max download size: 20 MB compressed</li>
        <li>Max extracted size: 100 MB</li>
        <li>Max file count: 5,000 entries</li>
      </ul>

      <h2>Security</h2>
      <ul>
        <li>Symlinks are rejected</li>
        <li>Only 1 redirect allowed (within GitHub domains)</li>
        <li>gzip magic bytes validated</li>
        <li>Atomic extraction (temp dir, then move)</li>
      </ul>
    </div>
  );
});
