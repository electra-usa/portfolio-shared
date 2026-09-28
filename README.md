# portfolio-shared

Shared assets used by both portfolio sites so they stay identical where it matters:

- `claude-usage.json` — daily Claude usage data (`[{ "date": "YYYY-MM-DD", "count": N }, ...]`),
  read by both [automations-portfolio](https://github.com/electra-usa/automations-portfolio) and
  [knowledge-work-portfolio](https://github.com/electra-usa/knowledge-work-portfolio) to render
  the "Claude activity" heatmap. **Currently placeholder data** — see Automating below.
- `heatmap.js` — the GitHub-style contribution calendar component. Both sites load this file
  directly (`<script src="https://electra-usa.github.io/portfolio-shared/heatmap.js">`), so any
  visual change here updates both sites at once.

## Updating the data manually

Edit `claude-usage.json`, add/adjust `{ "date": "...", "count": ... }` entries, commit, and push.
Both sites will reflect the change within a minute or two (no code changes needed on their end).

## Automating it (next step, not yet built)

There's no API that reports "how often I used Claude," so real automation has to come from
logging activity as it happens. The realistic path:

1. A Claude Code **hook** (`Stop` or `SessionEnd` in `settings.json`) that fires when a session
   ends, inspects what tools were used (Bash/Edit/Write → "code", Artifact → "design", otherwise
   → "chat"), and appends a `{date, count}` entry to a local log file.
2. A small script (run manually, on a schedule via Windows Task Scheduler, or as a further hook)
   that pulls that local log, merges it into `claude-usage.json` in this repo, and pushes.

This wasn't built yet — flagged here so it's easy to pick up later. The `update-config` skill in
Claude Code is the right tool for wiring up the hook when you're ready.
