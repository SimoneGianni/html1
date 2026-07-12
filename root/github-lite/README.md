# GitHub Lite

Minimal HTML+JS GitHub client for old devices (iOS 16 Safari and up). No build, no framework — open `index.html` from any static server (or file://) and enter a PAT on first run (stored in localStorage). After that, pick a repo from the list of ones the token can access (or type `owner/repo` manually); use the ⇄ button to switch repos and the ⚙ button to change the token.

Features:
- **Multiple repos**: after entering a token, browse/filter the repos it has access to and pick one; switch repos at any time via the ⇄ button. Manual `owner/repo` entry is still available as a fallback.
- **PRs**: list (open/closed), conversation and review comments, add comments, per-line pending review comments on the diff, submit review (approve / comment / request changes), build status badges (check-runs + commit statuses), merge (merge commit / squash / rebase, with conflict and draft-state checks), mark a draft PR as ready for review.
- **Issues**: list, comments, add comments, edit labels, create, close/reopen.
- **Search & sort**: the list view has a search box that accepts GitHub's issue/PR search syntax (e.g. `author:octocat label:bug in:title foo`) and runs against the GitHub Search API, plus a sort (created / last updated / total comments / best match) and order (asc/desc) control. "Best match" only applies when a search query is entered; without a query, sorting uses the plain issue/PR list endpoints.

Lists fetch the first 100 items; no pagination. Bodies are shown as plain text, not rendered markdown.
