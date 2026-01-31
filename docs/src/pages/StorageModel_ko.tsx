import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

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

      <h2>삭제 규칙</h2>
      <ul>
        <li><strong>삭제는 항상 명시적</strong></li>
        <li>빈 값 저장은 <strong>데이터를 절대 삭제하지 않음</strong></li>
        <li><code>delete</code>만이 저장된 콘텐츠를 제거하는 유일한 방법</li>
        <li>소프트 삭제 없음</li>
        <li>확인 프롬프트 없음 (에이전트 안전)</li>
      </ul>

      <h2>비목표</h2>
      <ul>
        <li>RAG 없음</li>
        <li>임베딩 없음</li>
        <li>검색 없음</li>
        <li>버전 관리 없음</li>
        <li>히스토리 없음</li>
        <li>병합 없음</li>
        <li>권한 없음</li>
        <li>추론 없음</li>
      </ul>
    </div>
  );
});
