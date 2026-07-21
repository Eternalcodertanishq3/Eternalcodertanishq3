import { fetchGitHubData } from "./_fetchData.js";
import { drawProjectCard } from "./_helpers.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "max-age=0, no-cache, no-store, must-revalidate");

  const username = req.query.username || "Eternalcodertanishq3";
  const index = parseInt(req.query.index || "0", 10);

  try {
    const data = await fetchGitHubData(username);
    const repos = data.activeRepos || [];
    
    if (index >= 0 && index < repos.length) {
      const r = repos[index];
      const svg = drawProjectCard(
        r.name,
        r.description,
        r.latestCommit,
        r.primaryLanguage?.name || "—",
        r.primaryLanguage?.color || "#38BDF8",
        r.pushedAgo,
        r.stars,
        "🌐",
        "" // subinfo empty for building repos
      );
      res.status(200).send(svg);
    } else {
      // Return a blank transparent spacer SVG if index is out of bounds
      res.status(200).send(`<svg width="420" height="220" xmlns="http://www.w3.org/2000/svg" />`);
    }
  } catch (error) {
    console.error("Error in building handler:", error);
    res.status(200).send(`<svg width="420" height="220" xmlns="http://www.w3.org/2000/svg" />`);
  }
}
