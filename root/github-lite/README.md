# GitHub Lite

Minimal HTML+JS GitHub client for old devices (iOS 16 Safari and up). No build, no framework — open `index.html` from any static server (or file://) and enter `owner/repo` plus a PAT on first run (stored in localStorage, gear icon to change).

Features:
- **PRs**: list (open/closed), conversation and review comments, add comments, per-line pending review comments on the diff, submit review (approve / comment / request changes), build status badges (check-runs + commit statuses), merge (merge commit / squash / rebase, with conflict and draft-state checks), mark a draft PR as ready for review, close a PR without merging.
- **Issues**: list, comments, add comments, edit labels, create, close/reopen.
- **Search & sort**: the list view has a search box that accepts GitHub's issue/PR search syntax (e.g. `author:octocat label:bug in:title foo`) and runs against the GitHub Search API, plus a sort (created / last updated / total comments / best match) and order (asc/desc) control. "Best match" only applies when a search query is entered; without a query, sorting uses the plain issue/PR list endpoints.

Lists fetch the first 100 items; no pagination. Bodies are shown as plain text, not rendered markdown.
