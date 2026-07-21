import { fetchGitHubData } from "./_fetchData.js";
import { drawLanguageGalaxy } from "./_helpers.js";

export default async function handler(req, res) {
  const { username = "Eternalcodertanishq3" } = req.query;
  const data = await fetchGitHubData(username);
  
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "max-age=0, no-cache, no-store, must-revalidate");
  
  res.status(200).send(drawLanguageGalaxy(data.languages));
}
