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
      ? '원격 ctxbin에 저장한 스킬과 에이전트 전체를 로컬 Claude Code와 Codex에 설치합니다. --target은 필수입니다.'
      : 'Install all remote ctxbin skills and agents into local Claude Code and Codex. An explicit --target is required.'}</p>
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
        <tr><td><code>--skills-dir &lt;path&gt;</code></td><td>{ko ? '단일 대상 스킬 경로 지정' : 'Override skills root for one target'}</td></tr>
        <tr><td><code>--agents-dir &lt;path&gt;</code></td><td>{ko ? '단일 대상 에이전트 경로 지정' : 'Override agents root for one target'}</td></tr>
      </tbody>
    </table>
    <p>{ko ? '경로 지정 옵션은 --target all과 함께 사용할 수 없습니다. Sync 옵션은 sync에만 적용하며 --file, --dir, --append, --raw 등 save/load 옵션은 지원하지 않습니다. 설치에 --raw는 필요하지 않습니다.' : 'Path overrides cannot be combined with --target all. Sync flags belong to sync only; save/load flags such as --file, --dir, --append, and --raw are rejected. Installation does not require --raw.'}</p>

    <h2>{ko ? '덮어쓰기와 삭제' : 'Replacement and pruning'}</h2>
    <ul>
      <li>{ko ? '같은 이름 스킬은 폴더 전체를 교체하므로 이전 파일이 남지 않습니다. 에이전트는 파일 전체를 교체합니다.' : 'Replace each matching skill directory completely, removing stale files. Replace agents as complete files.'}</li>
      <li>{ko ? '로컬에만 있는 항목은 유지합니다. --prune은 같은 원격 저장소에서 ctxbin이 설치한 항목 중 원격에서 사라진 항목만 삭제합니다.' : '--prune deletes only previously tracked installs from the same store that are now absent remotely. Unmanaged and other-store items remain.'}</li>
      <li>{ko ? '--prune을 생략하면 원격에서 지운 항목도 설치 이력에 남아, 나중에 정리할 수 있습니다.' : 'Without --prune, removed remote items remain installed and tracked for a later prune.'}</li>
      <li>{ko ? '--dry-run은 원격 자료를 내려받고 검증해 작업을 출력하며, 설치 폴더와 이력은 변경하지 않습니다.' : '--dry-run downloads and validates the content, then prints actions without changing installation directories or state.'}</li>
      <li>{ko ? '원격 저장소에는 쓰지 않으며 ctx는 다루지 않습니다. 업로드에는 기존 save 명령을 사용합니다.' : 'Sync reads the remote store only and does not access ctx. Upload using existing save commands.'}</li>
      <li>{ko ? '다른 저장소에서 같은 이름 항목을 설치하면 이력의 소유 저장소가 바뀝니다. 빈 저장소도 성공하며 --prune을 주면 해당 저장소의 이전 설치를 정리할 수 있습니다.' : 'Installing a same-name item from another store transfers its tracking ownership. Empty stores succeed and can prune their previous installs when requested.'}</li>
    </ul>

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

    <h2>{ko ? '저장 형식' : 'Stored formats'}</h2>
    <p>{ko ? '스킬 문자열, skillpack, skillref를 지원합니다. 번들에는 루트 SKILL.md가 필요하며 보조 파일과 실행 권한을 유지합니다. 키는 1~64자의 소문자·숫자와 단일 하이픈·밑줄 구분자를 사용합니다. 위험하거나 예약된 이름은 거부하며, 메타데이터 name은 키와 같아야 합니다.' : 'Skills support strings, skillpacks, and skillrefs. Bundles need root SKILL.md; supporting files and normalized executable permissions survive. Keys use 1–64 lowercase letters/digits with single hyphen/underscore separators. Unsafe/reserved names fail; supplied frontmatter names must match keys.'}</p>
    <p>{ko ? '에이전트는 name과 description만 포함하는 공통 Markdown을 저장합니다. 설치 시 Claude Markdown과 Codex TOML로 변환합니다.' : 'Store shared agent Markdown with name and description only. Sync renders native Claude Markdown and Codex TOML.'}</p>
    <CodeBlock language="markdown" code={agent(ko)} />
    <CodeBlock language="bash" code="npx ctxbin agent save reviewer --file reviewer.md" />
    <p>{ko ? '기존 일반 Markdown에는 키로 이름을 채우고, Agent rules for <name>. 또는 Reusable instructions for <name>.을 기본 설명으로 넣습니다. 스킬의 다른 YAML 필드는 보존합니다. 공급자별 에이전트 모델·도구 설정은 변환하지 않으며, 공통 형식에 포함하면 오류를 반환합니다.' : 'Legacy Markdown gets its name from the key and a default description: Agent rules for <name>. or Reusable instructions for <name>. Other skill YAML fields are preserved. Provider-specific agent model/tool settings are not translated; unsupported agent fields return an error.'}</p>
    <p>{ko ? '기존 skill load --dir은 같은 경로 파일을 복사하고 추가 파일은 유지합니다. Sync는 같은 이름 폴더 전체를 교체합니다. 원격 목록만 설치하므로 내장 ctxbin 대체 스킬은 자동으로 추가하지 않습니다. 이름 synced, anthropic-skills와 Windows 장치 이름 등은 사용할 수 없습니다.' : 'Existing skill load --dir copies matching files and keeps extra files. Sync replaces complete matching directories. It installs the remote list only, without automatically adding the bundled ctxbin fallback. Reserved names include synced, anthropic-skills, and Windows device names.'}</p>

    <h2>{ko ? '실패 시 동작' : 'Failure behavior'}</h2>
    <p>{ko ? '모든 항목을 준비·검증한 뒤 교체합니다. 일반적인 적용 실패는 파일과 설치 이력을 복원합니다. 대상의 심볼릭 링크와 겹치는 경로는 거부합니다.' : 'All items are staged and validated before replacement. Ordinary apply failures restore entries and manifests. Destination symlinks and overlapping roots are rejected.'}</p>
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
