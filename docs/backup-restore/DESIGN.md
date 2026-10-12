# Skill and agent backup/restore — design

## Commands

```sh
ctxbin backup --file ./backups/ctxbin.json
ctxbin backup --file ./backups/ctxbin.json --force
ctxbin restore --file ./backups/ctxbin.json --dry-run
ctxbin restore --file ./backups/ctxbin.json
ctxbin restore --file ./backups/ctxbin.json --force
```

Backup accepts file/force only; restore accepts file/dry-run/force only. Reject
positionals, selector/target/save flags, and empty file paths before configuration
access. Backup needs configured store access; restore preview also reads that store.
Leading quoted `~` expands to the user home.

Backup prints tab-separated `backup`, JSON-quoted absolute path, skill count, agent
count and emits the existing quiet-aware success marker. Restore prints action
(`create`, `replace`, `unchanged`), resource, and JSON-quoted field; preview prefixes
`dry-run`. Output never includes values or credentials.

## File contract

```json
{
  "format": "ctxbin-backup",
  "version": 1,
  "createdAt": "2026-10-12T00:00:00.000Z",
  "sourceId": "sha256-of-store-url",
  "resources": {
    "skill": [{"field": "workflow", "value": "raw stored value"}],
    "agent": [{"field": "reviewer", "value": "raw stored value"}]
  },
  "checksum": "sha256-of-JSON-stringified-resources"
}
```

Require the format/version, valid timestamp/digests, both resource arrays, string
fields/values, unique fields within each resource, and matching payload checksum.
Checksum serialization uses skill/agent order and field/value pairs in that order;
entry array order remains part of the checksum.
Empty arrays/values and arbitrary Redis field names are valid. Preserve values
exactly, without injecting fresh metadata or interpreting installation frontmatter.
Skillpacks remain self-contained encoded bundles; skillrefs retain only stored pointers.

Read both hashes once and sort entries. Validate the resulting snapshot before
writing. Write and flush a mode-0600 temporary file beside the destination, then
publish by exclusive hard link (new file) or rename (force). Clean staging without
masking the primary result. Existing backup bytes survive failed capture/publication.

## Restore flow

1. Read and fully validate the file, including checksum, before loading credentials.
2. Read current hashes represented by nonempty backup arrays and plan exact-key writes.
3. Preview returns create/replace/unchanged. Normal restore rejects every conflicting
   replacement before applying unless force is explicit.
4. For each change, verify the current value still matches preflight, record the old
   value before attempting the write, then set the raw backed-up value.
5. On failure, visit attempted writes in reverse. If the current value equals the
   old value, skip. If it equals the restored value, restore/delete the old state.
   Any other value or inaccessible key is unresolved; report incomplete rollback.

The local backup always survives restore. No remote names outside the file are
deleted. Data can recover into a different configured store; sourceId is provenance,
not an authorization lock. Reads across hashes and multi-key writes are not atomic
against process termination or concurrent remote edits.

## Integration

`src/backup.ts` owns serialization, file publication, validation, planning, and
best-effort rollback using the existing Store interface. It does not call sync,
native renderers, GitHub downloaders, or ctx operations. Existing commands and the
packaging launcher protections remain intact. No new dependency is required.

Store responses must contain an own `result` property, and HGETALL must return an
array. Missing/null/scalar responses fail with NETWORK before an existing backup
can be replaced. A missing hash is represented by an empty array, as documented by
[Upstash REST](https://upstash.com/docs/redis/features/restapi) and
[Redis HGETALL](https://redis.io/docs/latest/commands/hgetall/).
