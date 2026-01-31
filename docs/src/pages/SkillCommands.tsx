import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const SkillCommands = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>skill Commands</h1>

      <p>
        The <code>skill</code> resource stores skill definitions. Skills can be:
      </p>
      <ul>
        <li><strong>String values</strong> - markdown text</li>
        <li><strong>Skillpacks</strong> - bundled directory (tar.gz)</li>
        <li><strong>Skillrefs</strong> - GitHub directory reference</li>
      </ul>
      <p><strong>Key is always required</strong>.</p>

      <h2>Load</h2>
      <CodeBlock
        language="bash"
        code={`# String value (prints to stdout)
$ ctxbin skill load my-skill

# Skillpack or skillref (extracts to directory)
$ ctxbin skill load my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (String)</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill save my-skill --value "# Skill markdown"
$ ctxbin skill save my-skill --file SKILL.md`}
      />

      <h2>Save (Skillpack)</h2>
      <p>Bundle a directory as a skillpack:</p>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill save my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (Skillref)</h2>
      <p>Store a GitHub directory reference:</p>
      <CodeBlock
        language="bash"
        code={`# Pin to specific commit
$ ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --ref <40-hex-commit-sha> \\
  --path skills/my-skill

# Track default branch
$ ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --path skills/my-skill`}
      />

      <h2>Append</h2>
      <p>Only works with string values:</p>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill save my-skill --append --value "extra content"`}
      />

      <h2>List</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill list
my-skill   --value
fp-pack    --dir
react-lib  --url`}
      />

      <h2>Delete</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill delete my-skill`}
      />

      <h2>Bundled ctxbin Skill</h2>
      <p>
        A special fallback: <code>ctxbin skill load ctxbin</code> returns the bundled
        skill text even when Redis is not configured.
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load ctxbin`}
      />
    </div>
  );
});
