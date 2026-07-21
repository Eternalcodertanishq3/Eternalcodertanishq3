# Setup — 5 steps, ~5 minutes

1. **Profile repo must exist and be public**, named *exactly* `Eternalcodertanishq3`.
   If it doesn't exist: github.com/new → repository name = `Eternalcodertanishq3` → Public → Create.

2. **Drop these files in, preserving the folder structure exactly:**
   ```
   Eternalcodertanishq3/
   ├── README.md
   ├── assets/
   │   ├── divider.svg
   │   ├── terminal.svg
   │   └── focus-bars.svg
   └── .github/
       ├── workflows/
       │   ├── sync-readme.yml
       │   └── snake.yml
       └── scripts/
           └── sync-readme.mjs
   ```
   Commit and push to `main`.

3. **Allow Actions to write back to the repo** (required or both workflows fail on the push/commit step):
   Repo → Settings → Actions → General → Workflow permissions → select **"Read and write permissions"** → Save.

4. **Trigger both workflows once manually** to seed real data immediately instead of waiting for the schedule:
   Repo → Actions tab → select **"Sync README"** → Run workflow → select **"Generate Snake Animation"** → Run workflow.
   The snake workflow creates a new `output` branch automatically — that's expected.

5. **Done.** From here:
   - "Currently Building" re-syncs from your real push activity every 6 hours, and instantly on every push.
   - The snake animation regenerates every 12 hours.
   - Stats/streak/langs/trophy cards are live on every page view — no setup needed for those.

### Notes
- Everything runs on the free default `GITHUB_TOKEN` — no secrets or personal access token required.
- A true animated *page background* (like a real website) isn't possible — GitHub strips `<style>`/`<script>` from README HTML for security. What's here instead: an animated hero banner, three custom animated SVG components (`assets/`), and the snake/stats cards, which all animate because they're separate image files the browser renders natively — that part of the sanitizer doesn't touch them.
- Optional further upgrades not included here (need external account setup I can't do for you): WakaTime coding-time stats, Spotify "now playing" widget, `lowlighter/metrics` for an isometric contribution calendar.
