# Skill and agent backup/restore — requirements

Canonical documents live in `docs/backup-restore/`. Scope: `src/backup.ts`, CLI
routing, backup/restore tests, help/README, and bilingual documentation pages.
Work branch: `feat/selective-sync-and-backup`, based on `ctxbin@1.4.1` (`182e181`).
The same branch also adds [selective installation](../local-sync/REQUIREMENTS.md).

## Requirements

- B1: `ctxbin backup --file <path>` saves every remote skill/agent into one JSON
  file. It only reads the store and does not install anything into client directories.
- B2: Preserve raw remote keys/values, including ctxbin metadata, YAML frontmatter,
  skillpack payloads/assets, malformed legacy content, and skillref reference values.
  Do not convert to native client formats or download skillref repositories.
- B3: A versioned format identifies the backup, records creation time and a source
  URL digest, and checksums the resource payload. Do not add configured URL/token credentials.
  Represent entries as arrays so arbitrary Redis fields, including prototype names,
  cannot affect object ownership. No `ctx` hash is included.
- B4: Publish a complete backup file atomically with private permissions. Refuse
  existing destinations unless `--force`; refuse directory/symlink destinations.
  Failed snapshots or writes preserve the existing backup.
- B5: `ctxbin restore --file <path> [--dry-run] [--force]` validates the entire
  backup before remote access, plans changes, and writes exact backed-up values.
  Restore uses the currently configured store; a backup can recover into a new store.
- B6: Restore creates missing entries, skips identical values, and preserves remote
  names absent from the backup. Conflicting values require force; without it, fail
  before any write. Preview reports conflicts without applying them.
- B7: Recheck changed keys before writes. On ordinary apply failure, attempt to
  restore previous values/delete newly created values, including ambiguous failed
  writes. Preserve observed concurrent third-party changes during rollback. Report
  incomplete rollback explicitly. No crash/network-outage atomicity guarantee.
- B8: Help and site guides distinguish backup/restore from native installation.
  Backup covers data stored in ctxbin; skillref remains a reference, not an external
  repository snapshot. Full remote export is not a server-side transaction snapshot.

## Decisions

- [x] BD1: One portable JSON file, separate from Claude/Codex installation paths.
- [x] BD2: Both skill/agent hashes, opaque values and keys, no ctx or native conversion.
- [x] BD3: Checksum and schema validation precede remote changes.
- [x] BD4: Restore merges backup names only; force is required for conflicting values.
- [x] BD5: Ordinary failures use best-effort rollback; interruptions remain recoverable
  by checking the current store and rerunning from the retained backup.

Validation: exact-value round trips, skillpacks/refs, file overwrite/write failures,
malformed/checksum/duplicate-key rejection, conflict/preview/no-op cases, rollback and
concurrent-write faults, CLI mock-store recovery, and packaged help/launcher checks.
