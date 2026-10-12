import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

const commands = (ko: boolean) => `# ${ko ? '두 도구의 설치 미리보기' : 'Preview both targets'}
npx ctxbin sync --target all --dry-run

# ${ko ? '원격 스킬과 에이전트 전체 설치' : 'Install all remote skills and agents'}
npx ctxbin sync --target all
npx ctxbin sync --target claude
npx ctxbin sync --target codex --prune`;

const agent = (ko: boolean) => `---
name: reviewer
description: ${ko ? '코드 변경의 정확성과 누락된 테스트를 검토합니다.' : 'Review code changes for correctness and missing tests.'}
---

${ko ? '변경된 코드를 확인하고 수정 가능한 문제를 보고합니다.' : 'Inspect changed code and report actionable findings.'}`;

const page = (ko: boolean) => (
  <div class="page-sheet">
    <h1>{ko ? 'sync 명령어' : 'sync Command'}</h1>
    <p>{ko
      ? '원격 ctxbin의 스킬·에이전트를 로컬 Claude Code와 Codex에 설치합니다. 기본은 전체이며 --skill·--agent로 항목을 고릅니다. --target은 필수입니다.'
      : 'Install remote ctxbin skills and agents into Claude Code/Codex. Defaults to all entries; select individual keys with --skill/--agent. An explicit --target is required.'}</p>
    <p>{ko ? '미리보기도 기존 저장소 자격 증명과 원격 접근이 필요합니다. Git 저장소나 키는 필요하지 않습니다. 자격 증명은 ' : 'Preview also needs existing store credentials and remote access. No Git repository or key is required. Configure credentials using '}
      <span onClick={() => navigateTo('/config/env')} class="text-indigo-600 hover:underline cursor-pointer">{ko ? '환경 변수' : 'environment variables'}</span>
      {ko ? ' 또는 ~/.ctxbin/config.json을 사용합니다.' : ' or ~/.ctxbin/config.json.'}</p>
    <CodeBlock language="bash" code={commands(ko)} />

    <h2>{ko ? '옵션' : 'Options'}</h2>
    <table>
      <thead><tr><th>{ko ? '옵션' : 'Option'}</th><th>{ko ? '동작' : 'Behavior'}</th></tr></thead>
      <tbody>
        <tr><td><code>--target claude|codex|all</code></td><td>{ko ? '필수. 한 도구 또는 두 도구 선택' : 'Required. Select one client or both'}</td></tr>
        <tr><td><code>--dry-run</code></td><td>{ko ? '내려받고 검증한 뒤 작업만 미리보기' : 'Download, validate, and preview actions'}</td></tr>
        <tr><td><code>--prune</code></td><td>{ko ? '원격에서 사라진 같은 저장소의 설치 이력 항목 삭제' : "Delete this store's tracked installs absent remotely"}</td></tr>
        <tr><td><code>--force</code></td><td>{ko ? 'ctxbin 이력에 없는 같은 이름 로컬 항목 교체 허용' : 'Allow whole-item replacement of unmanaged matching local entries'}</td></tr>
        <tr><td><code>--skill &lt;name&gt;</code></td><td>{ko ? '정확한 스킬 키 선택. 여러 번 지정 가능' : 'Select an exact skill key; repeat for more'}</td></tr>
        <tr><td><code>--agent &lt;name&gt;</code></td><td>{ko ? '정확한 에이전트 키 선택. 여러 번 지정 가능' : 'Select an exact agent key; repeat for more'}</td></tr>
        <tr><td><code>--skills-dir &lt;path&gt;</code></td><td>{ko ? '단일 대상 스킬 경로 지정' : 'Override skills root for one target'}</td></tr>
        <tr><td><code>--agents-dir &lt;path&gt;</code></td><td>{ko ? '단일 대상 에이전트 경로 지정' : 'Override agents root for one target'}</td></tr>
      </tbody>
    </table>
    <p>{ko ? '경로 지정 옵션은 --target all과 함께 사용할 수 없습니다. 대상·선택·경로·prune 옵션은 sync 전용이며 --file, --dir, --append, --raw 등 save/load 옵션은 지원하지 않습니다. 설치에 --raw는 필요하지 않습니다.' : 'Path overrides cannot be combined with --target all. Target/selector/path/prune flags are sync-only; save/load flags such as --file, --dir, --append, and --raw are rejected. Installation does not require --raw.'}</p>

    <h2>{ko ? '덮어쓰기와 삭제' : 'Replacement and pruning'}</h2>
    <p>{ko ? '미리보기는 미관리 항목을 replace-unmanaged로 구분합니다. 이 항목을 실제로 교체하려면 --force가 필요합니다. 내용과 권한이 같은 관리 항목은 unchanged로 표시하며 다시 쓰지 않습니다. --force는 전체 교체를 허용하므로 미리보기에서 대상과 로컬 작업물을 확인하세요.' : 'Preview labels unmanaged matches replace-unmanaged; apply requires --force to replace those items. Managed entries with identical content and permissions are unchanged and are not rewritten. Force authorizes complete replacement, so inspect the preview and local workspace first.'}</p>
    <ul>
      <li>{ko ? '같은 이름 스킬은 폴더 전체를 교체하므로 이전 파일이 남지 않습니다. 에이전트는 파일 전체를 교체합니다.' : 'Replace each matching skill directory completely, removing stale files. Replace agents as complete files.'}</li>
      <li>{ko ? '로컬에만 있는 항목은 유지합니다. --prune은 같은 원격 저장소에서 ctxbin이 설치한 항목 중 원격에서 사라진 항목만 삭제합니다.' : '--prune deletes only previously tracked installs from the same store that are now absent remotely. Unmanaged and other-store items remain.'}</li>
      <li>{ko ? '--prune을 생략하면 원격에서 지운 항목도 설치 이력에 남아, 나중에 정리할 수 있습니다.' : 'Without --prune, removed remote items remain installed and tracked for a later prune.'}</li>
      <li>{ko ? '--dry-run은 원격 자료를 내려받고 검증해 작업을 출력하며, 설치 폴더와 이력은 변경하지 않습니다.' : '--dry-run downloads and validates the content, then prints actions without changing installation directories or state.'}</li>
      <li>{ko ? '원격 저장소에는 쓰지 않으며 ctx는 다루지 않습니다. 업로드에는 기존 save 명령을 사용합니다.' : 'Sync reads the remote store only and does not access ctx. Upload using existing save commands.'}</li>
      <li>{ko ? '다른 저장소에서 같은 이름 항목을 설치하면 이력의 소유 저장소가 바뀝니다. 빈 저장소도 성공하며 --prune을 주면 해당 저장소의 이전 설치를 정리할 수 있습니다.' : 'Installing a same-name item from another store transfers its tracking ownership. Empty stores succeed and can prune their previous installs when requested.'}</li>
    </ul>

    <h2>{ko ? '항목 선택과 프로젝트 설치' : 'Selection and project installation'}</h2>
    <p>{ko ? '선택 옵션이 없으면 전체를 설치합니다. 하나라도 지정하면 지정한 이름만 처리하고 선택하지 않은 리소스는 제외합니다. 중복 이름은 한 번만 처리하며 쉼표 목록이나 와일드카드는 지원하지 않습니다. 제외한 원격 내용은 검증·GitHub 다운로드를 하지 않고 제외한 리소스 해시와 설치 경로도 읽지 않습니다.' : 'Without selectors, install everything. Any selector limits processing to named entries and excludes resources without selectors. Deduplicate repeated names; comma lists and wildcards are unsupported. Unselected content is not validated/downloaded from GitHub, and excluded hashes/roots are not inspected.'}</p>
    <CodeBlock language="bash" code={'npx ctxbin sync --target claude --skill workflow --skill reference --agent reviewer \\\n  --skills-dir .claude/skills --agents-dir .claude/agents --dry-run'} />
    <p>{ko ? '없는 선택 이름은 NOT_FOUND로 실패하고 설치하지 않습니다. --prune을 주면 선택한 대상 중 하나에 같은 저장소의 설치 이력이 있는 이름만 정리 후보로 허용합니다. 오타나 이미 이력을 정리한 이름은 NOT_FOUND이며, 미관리·다른 저장소 항목과 선택하지 않은 이력은 유지합니다.' : 'Missing selected names fail with NOT_FOUND before installation. With --prune, an absent name needs same-source tracking in a selected target. Typos and already pruned names return NOT_FOUND; unmanaged/other-source entries and unselected tracking remain untouched.'}</p>

    <h2>{ko ? '설치 위치' : 'Installation paths'}</h2>
    <table>
      <thead><tr><th>{ko ? '대상' : 'Target'}</th><th>{ko ? '스킬' : 'Skills'}</th><th>{ko ? '에이전트' : 'Agents'}</th></tr></thead>
      <tbody>
        <tr><td>Claude Code</td><td><code>~/.claude/skills/&lt;name&gt;/SKILL.md</code></td><td><code>~/.claude/agents/&lt;name&gt;.md</code></td></tr>
        <tr><td>Codex</td><td><code>~/.agents/skills/&lt;name&gt;/SKILL.md</code></td><td><code>~/.codex/agents/&lt;name&gt;.toml</code></td></tr>
      </tbody>
    </table>
    <p>{ko ? '단일 대상에서는 --skills-dir과 --agents-dir로 경로를 지정할 수 있습니다. 기존 Codex 설치 경로를 사용하는 예:' : 'For a single target, override paths with --skills-dir and --agents-dir. For example, use an existing Codex skills layout:'}</p>
    <CodeBlock language="bash" code="npx ctxbin sync --target codex --skills-dir ~/.codex/skills" />
    <CodeBlock language="bash" code="npx ctxbin sync --target claude --skills-dir ./local-skills --agents-dir ./local-agents" />
    <p>{ko ? '따옴표로 감싼 "~/.codex/skills"도 사용자 홈으로 확장합니다. 스킬 폴더의 심볼릭 링크는 대상에 쓰지 않고 링크 자체만 교체하며, 원래 대상 폴더는 유지합니다. 미관리 링크를 교체하려면 --force가 필요합니다.' : 'Quoted "~/.codex/skills" expands to the user home. Skill-entry symlinks are replaced as links without writing into their targets, leaving the original target directories intact. Unmanaged links require --force.'}</p>

    <h2>{ko ? '저장 형식' : 'Stored formats'}</h2>
    <p>{ko ? '스킬 문자열, skillpack, skillref를 지원합니다. 번들에는 루트 SKILL.md가 필요하며 보조 파일과 실행 권한을 유지합니다. 키는 1~64자의 소문자·숫자와 단일 하이픈·밑줄 구분자를 사용합니다. 위험하거나 예약된 이름은 거부하며, 메타데이터 name은 키와 같아야 합니다.' : 'Skills support strings, skillpacks, and skillrefs. Bundles need root SKILL.md; supporting files and normalized executable permissions survive. Keys use 1–64 lowercase letters/digits with single hyphen/underscore separators. Unsafe/reserved names fail; supplied frontmatter names must match keys.'}</p>
    <p>{ko ? '원격 원본은 두 도구가 공유하는 Markdown과 YAML name/description입니다. 역할과 사용할 시점을 description에 적으세요. Sync는 Claude에는 YAML frontmatter가 있는 Markdown을, Codex에는 name·description·developer_instructions(본문)의 TOML을 생성합니다. Codex 룰을 수정해 업로드할 때도 공통 Markdown 원본을 사용합니다.' : 'The remote source is shared Markdown with YAML name/description for both clients. Describe the role and when to use it. Sync generates Claude Markdown with YAML frontmatter, or Codex TOML with name, description, and developer_instructions (the body). Upload the shared Markdown source when editing Codex rules.'}</p>
    <CodeBlock language="markdown" code={agent(ko)} />
    <CodeBlock language="bash" code="npx ctxbin agent save reviewer --file reviewer.md" />
    <p>{ko ? '기본 agent load는 ctxbin의 savedAt/by 래퍼만 제거하고 작성한 YAML frontmatter는 유지합니다. 원본 데이터를 복구용으로 보관하려면 ' : 'Default agent load removes only the savedAt/by wrapper and keeps authored YAML frontmatter. For original-value recovery, use '}<span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">backup / restore</span>.</p>
    <p>{ko ? '원격 에이전트 설명이 없으면 유효한 기존 로컬 설명을 유지한 뒤 Agent rules for <name>.을 기본값으로 사용합니다. 원격 설명이 있으면 우선합니다. 스킬 설명 기본값은 Reusable instructions for <name>.입니다. 모델·도구 등 공급자별 에이전트 필드는 오류를 반환합니다.' : 'When a remote agent description is missing, a valid existing local description is preserved before falling back to Agent rules for <name>. Explicit remote descriptions take precedence. Skill descriptions default to Reusable instructions for <name>. Provider-specific agent model/tool fields return an error.'}</p>
    <p>{ko ? '기존 스킬 frontmatter는 다시 직렬화하지 않아 {{version}} 같은 템플릿과 줄바꿈을 유지합니다. 한 줄 일반 description의 따옴표 없는 콜론·공백만 제한적으로 보정하며, 그 외 잘못된 YAML은 오류로 보고합니다. 적용 전 모든 항목의 오류를 모아 표시합니다. 번들은 모든 플랫폼에서 정확한 대문자 SKILL.md 파일명이 필요합니다.' : 'Existing skill frontmatter is preserved without reserialization, retaining templates such as {{version}} and line endings. Only an unquoted colon-space in a single-line plain description is narrowly repaired; other malformed YAML fails. All item preflight errors are collected before apply. Bundles require exact SKILL.md casing on every platform.'}</p>
    <p>{ko ? '기존 skill load --dir은 같은 경로 파일을 복사하고 추가 파일은 유지합니다. Sync는 같은 이름 폴더 전체를 교체합니다. 원격 목록만 설치하므로 내장 ctxbin 대체 스킬은 자동으로 추가하지 않습니다. 이름 synced, anthropic-skills와 Windows 장치 이름 등은 사용할 수 없습니다.' : 'Existing skill load --dir copies matching files and keeps extra files. Sync replaces complete matching directories. It installs the remote list only, without automatically adding the bundled ctxbin fallback. Reserved names include synced, anthropic-skills, and Windows device names.'}</p>

    <h2>{ko ? '실패 시 동작' : 'Failure behavior'}</h2>
    <p>{ko ? '모든 항목을 준비·검증한 뒤 교체합니다. 일반적인 적용 실패는 파일과 설치 이력을 복원합니다. 루트·에이전트 심볼릭 링크와 겹치는 경로는 거부합니다. 정리 실패는 CTXBIN_WARN으로 알리며 원래 적용 결과·오류를 가리지 않습니다. Skillref는 최신 내용 확인을 위해 미리보기를 포함해 매번 내려받습니다.' : 'All items are staged and validated before replacement. Ordinary apply failures restore entries and manifests. Root/agent symlinks and overlapping roots are rejected. Cleanup failures emit CTXBIN_WARN without masking the original result/error. Skillrefs still download on every run, including preview, to check freshness.'}</p>
    <p>{ko ? '프로세스 종료·전원 중단까지 원자성을 보장하지는 않습니다. 중단 후 남은 .ctxbin-sync.lock과 .ctxbin-sync-txn-* 백업을 확인한 뒤 재시도하세요.' : 'Whole-command atomicity is not guaranteed across process termination or power loss. Inspect leftover .ctxbin-sync.lock and .ctxbin-sync-txn-* backups before retrying an interrupted run.'}</p>
    <p>{ko ? '잠금이 남으면 IO 오류를 반환합니다. 복구가 완료되지 않으면 오류에 보존된 백업 경로를 표시합니다. 백업 폴더의 journal.json에는 대상·대체 파일·원본 백업 경로가 있어 수동 복구에 사용할 수 있습니다.' : 'A held lock returns IO. Incomplete rollback reports retained backup paths. Each backup directory contains journal.json mapping destinations, replacements, and original backups for manual recovery.'}</p>
    <p>{ko ? '잘못된 옵션·메타데이터·이력은 INVALID_INPUT, 위험한 이름·대상은 INVALID_PATH, 원격 접근 실패는 NETWORK를 반환합니다. 오류는 stderr와 종료 코드 1로 표시합니다. 미리보기에서도 잘못된 원격 자료나 네트워크 오류가 발생할 수 있습니다.' : 'Invalid options/metadata/state return INVALID_INPUT; unsafe names/destinations return INVALID_PATH; remote access failures return NETWORK. Errors use stderr and exit 1. Preview can also fail on invalid remote data or network errors.'}</p>
    <p>{ko ? '출력은 작업·대상·리소스·이름·절대 경로를 탭으로 구분합니다. 미리보기에는 dry-run 필드가 맨 앞에 붙습니다. 설치 이력 .ctxbin-sync.json에는 원격 주소의 해시를 기록하며 인증 정보는 기록하지 않습니다.' : 'Output is tab-separated action, target, resource, name, and absolute path; preview adds a leading dry-run field. Each destination stores .ctxbin-sync.json with source URL digests and no credentials.'}</p>
    <CodeBlock language="text" code={`dry-run\tcreate\tclaude\tskill\tmy-skill\t/Users/example/.claude/skills/my-skill
dry-run\tcreate\tcodex\tagent\treviewer\t/Users/example/.codex/agents/reviewer.toml`} />
    <p>{ko ? '작업 출력은 검증·적용이 성공한 뒤에만 표시합니다. 빈 저장소에서 정리할 항목도 없으면 작업 출력 없이 성공합니다.' : 'Actions are printed only after successful validation/apply. An empty store with nothing to prune succeeds without action output.'}</p>
  </div>
);

export const SyncCommands = mount(() => () => page(false));
export const SyncCommandsKo = mount(() => () => page(true));
