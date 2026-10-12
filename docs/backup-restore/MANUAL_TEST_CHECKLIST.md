# Skill and agent backup/restore — manual checks

Use a disposable store. These commands do not install Claude/Codex definitions.

- [ ] Capture Markdown agents, a skillpack with assets, and a skillref. Pass: JSON
  preserves original values/metadata; GitHub is not contacted and ctx is not accessed.
- [ ] Attempt backup to an existing file, then repeat with force. Pass: refusal
  preserves existing bytes; force replaces only after successful full capture.
- [ ] Empty the test skill/agent hashes and restore. Pass: all backed-up keys/values
  return exactly, including original savedAt/by and frontmatter.
- [ ] Preview restore into a store with unrelated and conflicting entries. Pass:
  preview reports actions without writes; normal restore rejects conflicts; force
  replaces backed-up conflicts while unrelated data remains.
- [ ] Restore the same file again. Pass: unchanged actions, no writes.
- [ ] Corrupt the file/checksum or duplicate a field. Pass: validation fails before
  remote access, with no local/native installation changes.
- [ ] Restore into a different configured test store. Pass: source provenance does
  not block migration; target credentials are used and never written into the backup.
- [ ] Test file permissions/atomic replacement on Windows and interruption recovery
  in a disposable environment. Pass: any incomplete restore is reported/inspectable;
  the backup remains available for retry. No crash-atomicity guarantee is claimed.
