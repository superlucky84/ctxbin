import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const StorageModelKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>저장소 모델</h1>

      <p>
        ctxbin은 <strong>Upstash Redis</strong>를 저장소 백엔드로 사용하며,
        <strong>HTTP REST API</strong>를 통해 접근합니다.
        <strong>HASH</strong> 데이터 타입만 사용됩니다.
      </p>

      <h2>Redis 데이터 모델</h2>
      <p>각 리소스 타입은 하나의 Redis 해시에 매핑됩니다:</p>

      <h3>Context (ctx)</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): ctx
Field           : {project}/{branch}
Value           : 마크다운 문자열 (UTF-8)`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis 동등 명령어
HSET ctx my-project/main "# 컨텍스트 마크다운..."
HGET ctx my-project/main
HDEL ctx my-project/main`}
      />

      <h3>Agent</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): agent
Field           : {agent-name}
Value           : 마크다운 문자열`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis 동등 명령어
HSET agent frontend-reviewer "# 에이전트 역할 마크다운..."
HGET agent frontend-reviewer
HDEL agent frontend-reviewer`}
      />

      <h3>Skill</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): skill
Field           : {skill-name}
Value           : 마크다운 문자열 | skillpack | skillref`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis 동등 명령어
HSET skill fp-pack "# 스킬 마크다운..."
HGET skill fp-pack
HDEL skill fp-pack`}
      />

      <h2>로컬 설치 이력</h2>
      <p>Sync는 선택한 리소스 해시를 HGETALL로 읽고 이름으로 필터한 뒤 검증·다운로드합니다. 제외한 리소스 해시는 읽지 않습니다. Ctx에 접근하거나 별도 Redis 해시를 만들거나 원격에 쓰지 않습니다. 내려받은 정의로 도구에 맞는 로컬 형식을 생성합니다.</p>
      <p>각 설치 폴더의 .ctxbin-sync.json에 항목 소유 저장소와 원격 주소의 해시를 기록합니다. --prune은 같은 저장소의 설치 이력에 있는 항목 중 원격에서 사라진 항목만 로컬에서 삭제합니다. 다른 저장소에서 같은 이름 항목을 설치하면 소유 저장소가 바뀌며, 다른 저장소 항목과 미관리 항목은 유지합니다. 이 파일은 ~/.ctxbin/config.json의 자격 증명과 별개입니다. 자세한 내용은 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요.</p>

      <h2>내부 저장소 인터페이스</h2>
      <CodeBlock
        language="typescript"
        code={`interface Store {
  get(hash: string, field: string): string | null;
  set(hash: string, field: string, value: string): void;
  delete(hash: string, field: string): void;
  list(hash: string): Array<{ field: string; value: string }>;
}`}
      />

      <h2>원격 삭제 규칙</h2>
      <ul>
        <li><strong>삭제는 항상 명시적</strong></li>
        <li>빈 값 저장은 <strong>데이터를 절대 삭제하지 않음</strong></li>
        <li>명시적 delete로 원격 항목을 삭제하며, 복구 실패 시 롤백은 자신이 새로 만든 항목을 제거할 수 있음</li>
        <li>소프트 삭제 없음</li>
        <li>확인 프롬프트 없음 (에이전트 안전)</li>
      </ul>

      <h2>비목표</h2>
      <ul>
        <li>RAG 없음</li>
        <li>임베딩 없음</li>
        <li>검색 없음</li>
        <li>버전 관리 없음</li>
        <li>원격 콘텐츠 버전 이력 없음</li>
        <li>병합 없음</li>
        <li>권한 없음</li>
        <li>추론 없음</li>
      </ul>
      <p>백업은 skill·agent 원본 값을 보관하고 복구는 백업 이름만 처리하며 충돌을 보호하고 다른 항목을 유지합니다. Ctx나 클라이언트 설치는 다루지 않습니다. 자세한 내용은 <span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">백업·복구 안내</span>.</p>
    </div>
  );
});
