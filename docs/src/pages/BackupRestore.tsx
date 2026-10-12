import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

const page = (ko: boolean) => (
  <div class="page-sheet">
    <h1>{ko ? '스킬·에이전트 백업과 복구' : 'Skill and Agent Backup / Restore'}</h1>
    <p>{ko ? '원격 ctxbin 데이터가 사라졌을 때 복구하도록 원본 스킬·에이전트 값을 로컬 JSON 파일에 보관합니다. Claude·Codex 설치와 별개이며 ctx나 자격 증명은 포함하지 않습니다.' : 'Keep original remote skills and agents in local JSON for recovery after data loss. This is separate from Claude/Codex installation; ctx and credentials are excluded.'}</p>
    <CodeBlock language="bash" code={'npx ctxbin backup --file ./backups/ctxbin.json\nnpx ctxbin restore --file ./backups/ctxbin.json --dry-run\nnpx ctxbin restore --file ./backups/ctxbin.json'} />
    <h2>{ko ? '백업에 포함되는 내용' : 'What the backup contains'}</h2>
    <ul>
      <li>{ko ? 'skill·agent 해시의 모든 키와 저장값을 변환 없이 보관합니다. savedAt/by, YAML frontmatter, 일반 Markdown과 오래된 형식도 그대로 유지합니다.' : 'All skill/agent keys and values without conversion, including savedAt/by, YAML frontmatter, plain Markdown, and legacy formats.'}</li>
      <li>{ko ? 'Skillpack은 저장된 번들과 보조 파일을 포함합니다. Skillref는 저장된 GitHub 참조만 보관하며 외부 파일을 내려받지 않습니다.' : 'Skillpacks include stored bundles/assets. Skillrefs retain stored GitHub references only; external files are not downloaded.'}</li>
      <li>{ko ? '파일 형식·버전·생성 시각·원격 주소 해시·체크섬을 기록합니다. 설정된 URL이나 토큰은 기록하지 않습니다.' : 'Format/version, creation time, source URL digest, and checksum. The configured URL and token are not stored.'}</li>
    </ul>
    <h2>{ko ? '옵션과 복구 규칙' : 'Options and recovery rules'}</h2>
    <table><thead><tr><th>{ko ? '명령어' : 'Command'}</th><th>{ko ? '지원 옵션' : 'Allowed options'}</th></tr></thead><tbody><tr><td>backup</td><td>--file (required), --force</td></tr><tr><td>restore</td><td>--file (required), --dry-run, --force</td></tr></tbody></table>
    <p>{ko ? '백업은 항상 스킬·에이전트 전체를 보관합니다. 두 명령에는 target, 선택, prune 옵션을 사용하지 않습니다. 현재 설정된 저장소에 접근하며 따옴표로 감싼 ~/ 경로도 홈으로 확장합니다.' : 'Backup always exports all skills/agents. These commands take no target, selectors, or prune flag. They use the configured store and expand quoted leading ~/ paths.'}</p>
    <p>{ko ? '기존 파일을 교체하려면 backup --force가 필요합니다. 캡처와 임시 파일 쓰기가 성공한 뒤 완성된 파일을 교체하며, 새 파일은 비공개 권한으로 생성합니다.' : 'Replacing an existing backup requires backup --force. Publish the complete file after capture/staging succeed; new files use private permissions.'}</p>
    <p>{ko ? '복구는 원격 접근 전에 형식과 체크섬을 검증합니다. 없는 키는 생성하고 같은 값은 그대로 두며, 다른 기존 값에는 restore --force가 필요합니다. 미리보기는 교체 작업을 표시하고 쓰지 않습니다. 백업에 없는 원격 항목은 유지합니다.' : 'Restore validates schema/checksum before remote access. Create missing keys, skip identical values, and require restore --force for conflicts. Preview reports replacements without writes. Remote names outside the file remain.'}</p>
    <p>{ko ? '새 저장소로도 복구할 수 있습니다. 대상은 현재 자격 증명으로 정하며 원본 주소 해시는 대상 제한으로 쓰지 않습니다. savedAt/by를 새로 넣지 않고 원본 값을 복원합니다.' : 'Recovery into a new store is supported. Current credentials choose the target; the source digest does not restrict it. Restore original values without fresh savedAt/by metadata.'}</p>
    <h2>{ko ? '실패와 출력' : 'Failures and output'}</h2>
    <p>{ko ? '변경할 키를 다시 확인하고 일반적인 적용 실패에는 이전 값을 복원하거나 새 값을 제거합니다. 복구가 완료되지 않으면 오류에 항목을 표시하며 로컬 백업은 유지합니다. 중단·망 장애·동시 수정에 대한 원자성은 보장하지 않으므로 캡처·복구 중에는 수정을 피하고 오류 뒤에는 상태를 확인하세요.' : 'Recheck changed keys and attempt rollback on ordinary failures. Incomplete rollback reports affected names; the backup remains. Capture/recovery is not transaction-atomic against interruptions, outages, or concurrent edits. Avoid editing during recovery and inspect state after errors.'}</p>
    <p>{ko ? '백업 출력은 backup·경로·스킬 수·에이전트 수이며 복구 출력은 작업·리소스·이름입니다. 탭으로 구분하고 경로·이름은 JSON 문자열로 표시합니다. 미리보기에는 dry-run이 붙고 실제 값이나 자격 증명은 출력하지 않습니다.' : 'Backup output is backup/path/skill-count/agent-count; restore output is action/resource/name. Fields are tab-separated with JSON-quoted paths/names. Preview adds dry-run; values and credentials are not printed.'}</p>
    <CodeBlock language="text" code={'backup\t"/Users/example/backups/ctxbin.json"\t8\t3\ndry-run\tcreate\tskill\t"workflow"\ndry-run\treplace\tagent\t"reviewer"'} />
    <p>{ko ? '실제 클라이언트 설치에는 ' : 'For native client installation, use '}<span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync</span>.</p>
  </div>
);

export const BackupRestore = mount(() => () => page(false));
export const BackupRestoreKo = mount(() => () => page(true));
