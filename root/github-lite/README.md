# GitHub Lite

Minimal HTML+JS GitHub client for old devices (iOS 16 Safari and up). No build, no framework — open `index.html` from any static server (or file://) and enter a PAT on first run (stored in localStorage, gear icon to change). After saving the token, pick a repository from the list of repos it can access (⇄ icon to switch repos later).

Features:
- **Multi-repo**: after entering a token, a repo picker lists every repo the token can access (`GET /user/repos`, first 100, most recently pushed first) with a client-side name filter, plus a manual `owner/repo` entry field as a fallback for tokens with access to more than 100 repos or repos the listing doesn't surface. The ⇄ button in the header returns to the picker to switch repos without re-entering the token.
- **PRs**: list (open/closed), conversation and review comments, add comments, per-line pending review comments on the diff, submit review (approve / comment / request changes), build status badges (check-runs + commit statuses), merge (merge commit / squash / rebase, with conflict and draft-state checks), mark a draft PR as ready for review.
- **Issues**: list, comments, add comments, edit labels, create, close/reopen.
- **Search & sort**: the list view has a search box that accepts GitHub's issue/PR search syntax (e.g. `author:octocat label:bug in:title foo`) and runs against the GitHub Search API, plus a sort (created / last updated / total comments / best match) and order (asc/desc) control. "Best match" only applies when a search query is entered; without a query, sorting uses the plain issue/PR list endpoints.

Lists fetch the first 100 items; no pagination. Bodies are shown as plain text, not rendered markdown.
