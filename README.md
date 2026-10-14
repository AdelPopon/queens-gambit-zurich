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
| `QGZ_Website_Backup_PreGlass_2026-10-08.zip` | `backup-PreGlass-2026-10-08` | `b1ec49a` | 2026-10-08 17:21 | Live site before the Glassmorphism visual update (Blue, Indigo & Ice). |
| `QGZ_Website_Backup_2026-10-13_1221.zip` | `backup-2026-10-13_1221` | `9d8659e` | 2026-10-13 12:21 | Live site before the WINZ partner link and Special Event badge update. |
| `QGZ_Website_Backup_2026-10-13_1711.zip` | `backup-2026-10-13_1711` | `50259dc` | 2026-10-13 17:11 | Live site before German language, WINZ programme and registration system. |
| `QGZ_Website_Backup_2026-10-13_1810.zip` | `backup-2026-10-13_1810` | `74108c2` | 2026-10-13 18:10 | Before activating event registration (PR #17) |
| `QGZ_Website_Backup_2026-10-13_1830.zip` | `backup-2026-10-13_1830` | `578f4b1` | 2026-10-13 18:30 | Before the shareable registration page /winz/ (PR #18) |
| `QGZ_Website_Backup_2026-10-13_1838.zip` | `backup-2026-10-13_1838` | `0eb3826` | 2026-10-13 18:38 | Before the navigation, Kids Chess philosophy and Youth Programme update (PR #19) |
| `QGZ_Website_Backup_2026-10-13_1854.zip` | `backup-2026-10-13_1854` | `f1804f7` | 2026-10-13 18:54 | Before the Kids Chess heading and closing statement update (PR #20) |
| `QGZ_Website_Backup_2026-10-13_1932.zip` | `backup-2026-10-13_1932` | `9158dea` | 2026-10-13 19:32 | Before the Chess Club / Community terminology review (PR #22) |
| `QGZ_Website_Backup_2026-10-13_2106.zip` | `backup-2026-10-13_2106` | `bbc054a` | 2026-10-13 21:06 | Before collapsing the Zollikon dates in the Upcoming list on phones (PR #24) |
| `QGZ_Website_Backup_2026-10-14_1302.zip` | `backup-2026-10-14_1302` | `697473c` | 2026-10-14 13:02 | Before the SEO fixes (PR #25) |
| `QGZ_Website_Backup_2026-10-14_1422.zip` | `backup-2026-10-14_1422` | `dc10805` | 2026-10-14 14:22 | Before the Mailchimp newsletter signup form (privacy-first) |
