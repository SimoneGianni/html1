# GitHub Lite

Minimal HTML+JS GitHub client for old devices (iOS 16 Safari and up). No build, no framework — open `index.html` from any static server (or file://) and enter `owner/repo` plus a PAT on first run (stored in localStorage, gear icon to change).

Use a **classic** PAT with the `repo` scope, not a fine-grained token: marking a draft PR as ready for review has no REST endpoint, so it's done via a GraphQL mutation, and GitHub's fine-grained PATs don't support GraphQL mutations yet (you'll get "Resource not accessible by personal access token" if you try). Fine-grained tokens do work for every other feature.

Features:
- **PRs**: list (open/closed), conversation and review comments, add comments, per-line pending review comments on the diff, submit review (approve / comment / request changes), build status badges (check-runs + commit statuses), merge (merge commit / squash / rebase, with conflict and draft-state checks), mark a draft PR as ready for review.
- **Issues**: list, comments, add comments, edit labels, create, close/reopen.

Lists fetch the first 100 items; no pagination. Bodies are shown as plain text, not rendered markdown.
