import { fetchGitHubData } from "./_fetchData.js";
import { drawContributionGraph } from "../.github/scripts/sync-readme.mjs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "max-age=0, no-cache, no-store, must-revalidate");
  
  const username = req.query.username || "Eternalcodertanishq3";
  try {
    const data = await fetchGitHubData(username);
    const svg = drawContributionGraph(username, data.days);
    res.status(200).send(svg);
  } catch (error) {
    console.error("Error generating graph:", error);
    // Return empty fallback graph on error
    const today = new Date();
    const fallbackDays = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      fallbackDays.push({ date: d.toISOString().split("T")[0], contributionCount: 0 });
    }
    const svg = drawContributionGraph(username, fallbackDays);
    res.status(200).send(svg);
  }
}
