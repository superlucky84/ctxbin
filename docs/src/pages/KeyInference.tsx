import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const KeyInference = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Key Inference</h1>

      <p>
        When using <code>ctx</code> commands without an explicit key, ctxbin automatically
        infers the key from your git repository. This page explains exactly how the inference works.
      </p>

      <h2>Key Format</h2>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}`}
      />

      <h2>How Project Name is Determined</h2>
      <p>The project name is determined in the following order:</p>
      <ol>
        <li>
          <strong>package.json name field</strong>: If <code>package.json</code> exists in the git root,
          the <code>name</code> field is used as the project name.
        </li>
        <li>
          <strong>Folder name fallback</strong>: If no <code>package.json</code> exists,
          the git repository root folder name is used.
        </li>
      </ol>

      <h3>Example with package.json</h3>
      <CodeBlock
        language="json"
        code={`// package.json
{
  "name": "my-awesome-app",
  ...
}`}
      />
      <p>
        If you're on the <code>main</code> branch, the inferred key will be:
        <code>my-awesome-app/main</code>
      </p>

      <h3>Example without package.json</h3>
      <p>
        If your repository is at <code>/home/user/projects/my-project</code> and you're on the <code>feature</code> branch,
        the inferred key will be: <code>my-project/feature</code>
      </p>

      <h2>Branch Name</h2>
      <p>The branch name is determined by running:</p>
      <CodeBlock
        language="bash"
        code={`git rev-parse --abbrev-ref HEAD`}
      />

      <h2>Warning: Name Mismatch</h2>
      <p>
        If <code>package.json</code> exists and its <code>name</code> differs from the folder name,
        a warning is printed to stderr:
      </p>
      <CodeBlock
        language="text"
        code={`CTXBIN_WARN: package.json name "my-awesome-app" differs from folder name "my-project". Using "my-awesome-app".`}
      />
      <p>
        This helps you notice if you might be using a different key than expected.
      </p>

      <h2>Why Not Use Git Remote URL?</h2>
      <p>
        Some tools parse the git remote URL to determine the project name.
        ctxbin intentionally avoids this because:
      </p>
      <ul>
        <li>Remote URLs vary across git services (GitHub, GitLab, Bitbucket, self-hosted)</li>
        <li>URL formats are inconsistent (HTTPS vs SSH, with/without <code>.git</code> suffix)</li>
        <li>A repository might have multiple remotes or no remote at all</li>
        <li>Parsing is fragile and can lead to unexpected behavior</li>
      </ul>

      <h2>When Key Inference Fails</h2>
      <p>
        If you run a <code>ctx</code> command outside a git repository without providing an explicit key,
        you'll get an error:
      </p>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR NOT_IN_GIT: must be inside a git repository or provide an explicit key`}
      />

      <h2>Using Explicit Keys</h2>
      <p>
        You can always bypass inference by providing an explicit key:
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save my-project/main --value "context"
$ npx ctxbin ctx load my-project/main`}
      />
      <p>
        This is useful when:
      </p>
      <ul>
        <li>You're outside a git repository</li>
        <li>The folder name or package.json name doesn't match your intended key</li>
        <li>You want to use a consistent key across different local clones</li>
      </ul>
    </div>
  );
});
