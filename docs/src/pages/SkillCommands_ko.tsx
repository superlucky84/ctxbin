import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const SkillCommandsKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>skill 명령어</h1>

      <p>
        <code>skill</code> 리소스는 스킬 정의를 저장합니다. 스킬은 다음이 될 수 있습니다:
      </p>
      <ul>
        <li><strong>문자열 값</strong> - 마크다운 텍스트</li>
        <li><strong>Skillpacks</strong> - 번들된 디렉터리 (tar.gz)</li>
        <li><strong>Skillrefs</strong> - GitHub 디렉터리 참조</li>
      </ul>
      <p><strong>키는 항상 필수</strong>입니다.</p>

      <h2>Load</h2>
      <CodeBlock
        language="bash"
        code={`# 문자열 값 (stdout으로 출력)
$ npx ctxbin skill load my-skill

# Skillpack 또는 skillref (디렉터리로 추출)
$ npx ctxbin skill load my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (문자열)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --value "# 스킬 마크다운"
$ npx ctxbin skill save my-skill --file SKILL.md`}
      />

      <h2>Save (Skillpack)</h2>
      <p>디렉터리를 skillpack으로 번들:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --dir ./skills/my-skill`}
      />

      <h2>Save (Skillref)</h2>
      <p>GitHub 디렉터리 참조 저장:</p>
      <CodeBlock
        language="bash"
        code={`# 특정 커밋에 고정
$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --ref <40자-16진수-커밋-sha> \\
  --path skills/my-skill

# 기본 브랜치 추적
$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --path skills/my-skill`}
      />

      <h2>Append</h2>
      <p>문자열 값에서만 작동:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill --append --value "추가 컨텐츠"`}
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

      <h2>번들된 ctxbin 스킬</h2>
      <p>
        특별한 폴백: Redis가 설정되지 않았을 때도 <code>npx ctxbin skill load ctxbin</code>은
        번들된 스킬 텍스트를 반환합니다.
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load ctxbin`}
      />
    </div>
  );
});
