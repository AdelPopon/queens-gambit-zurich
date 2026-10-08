# Queen's Gambit Zürich · Website backups

This branch stores backups only. It is kept separate from the published website, which is the `main` branch served by GitHub Pages. Nothing on this branch is published.

## Procedure

Before every change to the website:

1. A complete ZIP of the current live version (`main`) is created, named `QGZ_Website_Backup_YYYY-MM-DD_HHMM.zip` (Zürich time).
2. The ZIP is checked: the archive must be readable, and when unpacked it must be identical to the live commit.
3. The ZIP is added to `backups/` on this branch and listed in `backups/manifest.tsv` and the table below. Existing backups are never overwritten or deleted.
4. The **Backup tags** GitHub Action then creates a Git tag (`backup-YYYY-MM-DD_HHMM`) on the backed-up commit, plus a GitHub Release with the ZIP attached.
5. Only after the backup exists does work on the website change begin.

## Restoring a previous version

- **Files:** download the ZIP from this branch (`backups/`) or from the matching Release, then unpack it.
- **Git:** check out the tag, e.g. `git checkout backup-2026-10-08`. To roll back the live site, open a pull request that restores `main` to that tag's contents.

## Backups

| Backup | Tag | Live commit | Created (Zürich) | Notes |
|---|---|---|---|---|
| `QGZ_Website_Backup_2026-10-08.zip` | `backup-2026-10-08` | `a0277d9` | 2026-10-08 16:22 | Version 1 as published (PR #1) plus custom domain `CNAME` |
| `QGZ_Website_Backup_2026-10-08_1628.zip` | `backup-2026-10-08_1628` | `a0277d9` | 2026-10-08 16:28 | Live site before the logo, photo-privacy and Kids image update. |
