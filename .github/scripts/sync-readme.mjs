#!/usr/bin/env node
/**
 * Syncs the "Currently Building" section of README.md with the user's
 * most recently pushed-to public GitHub repositories.
 *
 * Runs inside GitHub Actions (see .github/workflows/sync-readme.yml).
 * Uses only built-in Node APIs — no npm install required.
 */
import { readFileSync, writeFileSync } from "node:fs";

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN;
const README_PATH = "README.md";
const MAX_REPOS = 5;
const START = "<!--START_SECTION:currently-building-->";
const END = "<!--END_SECTION:currently-building-->";

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": USERNAME || "readme-sync-bot",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

async function main() {
  if (!USERNAME) throw new Error("GH_USERNAME env var is required");

  const repos = await gh(
    `/users/${USERNAME}/repos?sort=pushed&direction=desc&per_page=30`
  );

  const filtered = repos
    .filter((r) => !r.fork && r.name.toLowerCase() !== USERNAME.toLowerCase())
    .slice(0, MAX_REPOS);

  const rows = [];
  for (const repo of filtered) {
    let lastCommitMsg = "";
    try {
      const commits = await gh(`/repos/${USERNAME}/${repo.name}/commits?per_page=1`);
      lastCommitMsg = commits?.[0]?.commit?.message?.split("\n")[0] ?? "";
    } catch {
      // empty repo (409) or other transient error — skip commit line
    }
    const desc = (repo.description || "No description yet.").trim();
    const msg = lastCommitMsg.length > 72 ? lastCommitMsg.slice(0, 69) + "..." : lastCommitMsg;

    rows.push(`<tr>
<td width="230"><a href="${repo.html_url}"><b>${repo.name}</b></a><br/><sub>${desc}</sub></td>
<td align="center"><sub><b>${repo.language || "—"}</b></sub></td>
<td align="center"><sub>★ ${repo.stargazers_count}</sub></td>
<td><sub>${msg || "—"}</sub><br/><sub>⏱ ${timeAgo(repo.pushed_at)}</sub></td>
</tr>`);
  }

  const table = rows.length
    ? `<table>
<tr><th>Repository</th><th>Language</th><th>Stars</th><th>Latest Commit</th></tr>
${rows.join("\n")}
</table>

<sub>🔄 Auto-synced from live GitHub activity — last updated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</sub>`
    : `<sub>No recent public repository activity found.</sub>`;

  const readme = readFileSync(README_PATH, "utf8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.error("Section markers not found in README.md — skipping.");
    return;
  }

  const updated =
    readme.slice(0, startIdx + START.length) + "\n" + table + "\n" + readme.slice(endIdx);

  if (updated !== readme) {
    writeFileSync(README_PATH, updated, "utf8");
    console.log("README.md updated with latest activity.");
  } else {
    console.log("No changes — already up to date.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
