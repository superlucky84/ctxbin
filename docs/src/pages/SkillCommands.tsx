import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

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
$ npx ctxbin skill load my-skill

# Skillpack or skillref (extracts to directory)
$ npx ctxbin skill load my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (String)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --value "# Skill markdown"
$ npx ctxbin skill save my-skill --file SKILL.md`}
      />

      <h2>Save (Skillpack)</h2>
      <p>Bundle a directory as a skillpack:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (Skillref)</h2>
      <p>Store a GitHub directory reference:</p>
      <CodeBlock
        language="bash"
        code={`# Pin to specific commit
$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --ref <40-hex-commit-sha> \\
  --path skills/my-skill

# Track default branch
$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --path skills/my-skill`}
      />

      <h2>Install Remote Skills Locally</h2>
      <CodeBlock language="bash" code={`npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all
npx ctxbin sync --target codex --skills-dir ~/.codex/skills`} />
      <p>Sync installs all remote skills/agents by default; --skill/--agent selects exact names. Skills go to ~/.claude/skills/&lt;name&gt;/SKILL.md or ~/.agents/skills/&lt;name&gt;/SKILL.md by default. String, skillpack, and skillref values work; bundles need root SKILL.md and supplied names must match remote keys. Missing name/description fields receive deterministic defaults while other skill metadata and supporting files survive.</p>
      <p>Unlike the file-copy behavior of load --dir, sync replaces matching skill folders entirely, removing stale files inside them. Local-only entries remain; --prune removes only this store's tracked installs absent remotely. Existing skill save --dir handles uploads. See <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync commands</span> for naming rules, overrides, and recovery.</p>

      <h2>Append</h2>
      <p>Only works with string values:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --append --value "extra content"`}
      />

      <h2>List</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill list
my-skill   --value
fp-pack    --dir
react-lib  --url`}
      />

      <h2>Delete</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill delete my-skill`}
      />

      <h2>Built-in Usage Guide</h2>
      <p>
        Print the bundled ctxbin usage guide (works even when Redis is not configured):
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin help`}
      />
      <p>Replacing an unmanaged matching local item requires --force. Preview labels it replace-unmanaged; identical managed entries are unchanged without rewrites.</p>
      <p>Selecting only --skill skips agents; selective --prune keeps unselected tracking. For original-value recovery, including stored skillpacks and skillref pointers, see <span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">backup / restore</span>.</p>
    </div>
  );
});
