import { drawFlagshipProjects } from "../.github/scripts/sync-readme.mjs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "max-age=0, no-cache, no-store, must-revalidate");
  
  res.status(200).send(drawFlagshipProjects());
}
