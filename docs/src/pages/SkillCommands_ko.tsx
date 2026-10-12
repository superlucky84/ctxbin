import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

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

      <h2>원격 스킬을 로컬에 설치</h2>
      <CodeBlock language="bash" code={`npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all
npx ctxbin sync --target codex --skills-dir ~/.codex/skills`} />
      <p>Sync는 원격 스킬·에이전트 전체를 설치합니다. 스킬 기본 경로는 ~/.claude/skills/&lt;name&gt;/SKILL.md 또는 ~/.agents/skills/&lt;name&gt;/SKILL.md입니다. 문자열·skillpack·skillref를 지원하며 번들에는 루트 SKILL.md가 필요합니다. 메타데이터 name은 원격 키와 같아야 합니다. 없는 name·description은 기본값으로 채우고 다른 스킬 메타데이터와 보조 파일은 유지합니다.</p>
      <p>Load --dir의 파일 복사와 달리, sync는 같은 이름 스킬 폴더 전체를 교체해 내부의 오래된 파일을 제거합니다. 로컬에만 있는 항목은 유지하며 --prune은 같은 저장소의 설치 이력에 있는 항목 중 원격에서 사라진 항목만 삭제합니다. 업로드에는 기존 skill save --dir을 사용합니다. 이름 규칙·경로 지정·복구는 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요.</p>

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

      <h2>내장 사용 가이드</h2>
      <p>
        내장된 ctxbin 사용 가이드 출력 (Redis가 설정되지 않아도 동작):
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin help`}
      />
    </div>
  );
});
