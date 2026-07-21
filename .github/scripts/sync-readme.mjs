#!/usr/bin/env node
/**
 * Space-themed GitHub Profile Dashboard Generator
 * Generates custom SVG cards (Hero, Streaks, Languages Galaxy, Stats HUD)
 * and updates README.md with GFM table project card grids and the live-updating activity graph.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const USERNAME = process.env.GH_USERNAME || "Eternalcodertanishq3";
const TOKEN = process.env.GH_TOKEN;
const README_PATH = "README.md";
const ASSETS_DIR = "assets";
const VERCEL_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://eternalcodertanishq3.vercel.app`;

// Ensure assets directory exists
if (!existsSync(ASSETS_DIR)) {
  mkdirSync(ASSETS_DIR, { recursive: true });
}

// Custom GraphQL query to fetch all required statistics in a single call
export const GRAPHQL_QUERY = `
query($username: String!) {
  user(login: $username) {
    name
    login
    bio
    avatarUrl
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        name
        stargazerCount
        forkCount
        description
        primaryLanguage {
          name
          color
        }
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
        pushedAt
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 1) {
                nodes {
                  message
                }
              }
            }
          }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
    followers {
      totalCount
    }
  }
}
`;

// Scraper for public contributions page (allows real data without tokens)
export async function fetchPublicContributions(username) {
  const url = `https://github.com/users/${username}/contributions`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch public contributions: ${res.status}`);
  }
  const html = await res.text();

  // Parse total contributions
  let totalContributions = 0;
  const totalMatch = html.match(/([0-9,]+)\s+contributions\s+in\s+the\s+last\s+year/i);
  if (totalMatch) {
    totalContributions = parseInt(totalMatch[1].replace(/,/g, ""), 10);
  }

  // Parse calendar cells
  const cellRegex = /<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
  const cells = [...html.matchAll(cellRegex)];
  const idToDate = {};
  for (const cell of cells) {
    const cellHtml = cell[0];
    const idMatch = cellHtml.match(/id="([^"]+)"/);
    const dateMatch = cellHtml.match(/data-date="([^"]+)"/);
    if (idMatch && dateMatch) {
      idToDate[idMatch[1]] = dateMatch[1];
    }
  }

  // Parse tooltips
  const tooltips = [...html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]+)<\/tool-tip>/g)];
  const contributionsMap = {};
  for (const tooltip of tooltips) {
    const id = tooltip[1];
    const text = tooltip[2].trim();
    const date = idToDate[id];
    if (date) {
      let count = 0;
      if (!text.toLowerCase().includes("no contributions")) {
        const match = text.match(/^([0-9,]+)\s+contribution/i);
        if (match) {
          count = parseInt(match[1].replace(/,/g, ""), 10);
        } else {
          count = 1;
        }
      }
      contributionsMap[date] = count;
    }
  }

  // Build calendar days array for the past year
  const days = [];
  const today = new Date();
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    const count = contributionsMap[dateStr] || 0;
    days.push({ date: dateStr, contributionCount: count });
  }

  return { days, totalContributions };
}

// Helper for time calculation
export function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Generate starry backdrop helper for SVGs
export function generateStars(count, width, height) {
  let svg = "";
  const starColors = ["#38BDF8", "#F8FAFC", "#818CF8", "#A5B4FC"];
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = (Math.random() * 0.8 + 0.4).toFixed(1);
    const opacity = (Math.random() * 0.7 + 0.15).toFixed(2);
    const delay = (Math.random() * 5).toFixed(1);
    const duration = (Math.random() * 3 + 2).toFixed(1);
    const color = starColors[Math.floor(Math.random() * starColors.length)];
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" style="animation: pulse ${duration}s ease-in-out infinite ${delay}s" />\n`;
  }
  return svg;
}

// Generate shooting stars helper for SVGs
export function generateShootingStars(count, width, height) {
  let svg = "";
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * (width - 100));
    const y = Math.floor(Math.random() * (height / 2));
    const len = Math.floor(Math.random() * 80 + 40);
    const delay = (Math.random() * 8).toFixed(1);
    const duration = (Math.random() * 2 + 1.5).toFixed(1);
    svg += `<path d="M ${x},${y} L ${x + len},${y + len}" stroke="url(#shootingStarGradient)" stroke-width="1.5" stroke-linecap="round" opacity="0" style="animation: shoot ${duration}s linear infinite ${delay}s" />\n`;
  }
  return svg;
}

// Helper to calculate streaks and total contributions
export function calculateStreaks(days) {
  let totalContributions = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < days.length; i++) {
    const count = days[i].contributionCount;
    totalContributions += count;
    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak
  let currentStreakTemp = 0;
  let foundStart = false;
  for (let i = days.length - 1; i >= 0; i--) {
    const count = days[i].contributionCount;
    if (count > 0) {
      currentStreakTemp++;
      foundStart = true;
    } else {
      if (foundStart) {
        break;
      }
      if (days.length - 1 - i > 2) {
        break;
      }
    }
  }
  currentStreak = currentStreakTemp;

  return { totalContributions, currentStreak, longestStreak };
}

// 1. Generate assets/hero-banner.svg
export function drawHeroBanner(name, bio) {
  const width = 1200;
  const height = 320;
  const stars = generateStars(90, width, height);
  const shootingStars = generateShootingStars(3, width, height);

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050814"/>
      <stop offset="50%" stop-color="#0A1024"/>
      <stop offset="100%" stop-color="#02040A"/>
    </linearGradient>
    <radialGradient id="nebulaCyan" cx="20%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0E0EA5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nebulaPurple" cx="80%" cy="60%" r="55%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shootingStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0"/>
      <stop offset="80%" stop-color="#38BDF8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="faintGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 0.15; }
        50% { opacity: 1; }
      }
      @keyframes shoot {
        0% { transform: translate(-100px, -100px); opacity: 0; }
        1% { opacity: 1; }
        15% { transform: translate(150px, 150px); opacity: 0; }
        100% { transform: translate(150px, 150px); opacity: 0; }
      }
      @keyframes orbit {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .font-sans { font-family: system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: ui-monospace, monospace; }
      .orbit-path { stroke: #1E293B; stroke-opacity: 0.4; fill: none; stroke-dasharray: 4 4; }
      .hud-line { stroke: #38BDF8; stroke-opacity: 0.2; }
      .hud-text { fill: #38BDF8; font-size: 10px; opacity: 0.7; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#nebulaCyan)" />
  <rect width="${width}" height="${height}" fill="url(#nebulaPurple)" />

  <!-- Stars -->
  ${stars}
  ${shootingStars}

  <!-- Orbital lines -->
  <ellipse cx="950" cy="160" rx="300" ry="120" class="orbit-path" />
  <ellipse cx="950" cy="160" rx="200" ry="80" class="orbit-path" />
  
  <!-- Orbiting planet -->
  <g style="transform-origin: 950px 160px; animation: orbit 45s linear infinite;">
    <circle cx="750" cy="160" r="14" fill="#0284C7" filter="url(#faintGlow)"/>
    <ellipse cx="750" cy="160" rx="26" ry="6" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-opacity="0.6" transform="rotate(-15 750 160)"/>
  </g>

  <!-- HUD Grid lines / futuristic frame -->
  <line x1="20" y1="20" x2="120" y2="20" class="hud-line" stroke-width="1.5" />
  <line x1="20" y1="20" x2="20" y2="120" class="hud-line" stroke-width="1.5" />
  
  <line x1="1180" y1="20" x2="1080" y2="20" class="hud-line" stroke-width="1.5" />
  <line x1="1180" y1="20" x2="1180" y2="120" class="hud-line" stroke-width="1.5" />

  <line x1="20" y1="300" x2="120" y2="300" class="hud-line" stroke-width="1.5" />
  <line x1="20" y1="300" x2="20" y2="200" class="hud-line" stroke-width="1.5" />
  
  <line x1="1180" y1="300" x2="1080" y2="300" class="hud-line" stroke-width="1.5" />
  <line x1="1180" y1="300" x2="1180" y2="200" class="hud-line" stroke-width="1.5" />

  <!-- Cockpit details -->
  <text x="35" y="38" class="font-mono hud-text">SYS.STATUS: ACTIVE</text>
  <text x="1100" y="38" class="font-mono hud-text" text-anchor="end">ALTITUDE: 35,786 KM</text>

  <!-- Center Content -->
  <g transform="translate(60, 0)">
    <text x="0" y="145" fill="url(#titleGrad)" font-size="52" font-weight="900" class="font-sans" filter="url(#neonGlow)" letter-spacing="1.5">${name}</text>
    <text x="5" y="185" fill="#E2E8F0" font-size="16" font-weight="700" class="font-mono" letter-spacing="4">SYSTEMS BUILDER · AI/ML · FULL-STACK</text>
    
    <!-- Bio line -->
    <rect x="5" y="215" width="620" height="42" rx="6" fill="#0F172A" stroke="#1E293B" stroke-width="1" />
    <text x="20" y="241" fill="#38BDF8" font-size="14" class="font-mono">&gt;_</text>
    <text x="45" y="241" fill="#94A3B8" font-size="13" class="font-mono">${bio}</text>
  </g>
</svg>`;
}

// 2. Generate assets/contribution-graph.svg
export function drawContributionGraph(username, days) {
  const width = 850;
  const height = 300;
  const graphWidth = 720;
  const graphHeight = 140;
  const startX = 65;
  const startY = 60;
  const endY = startY + graphHeight;

  const counts = days.map((d) => d.contributionCount);
  const maxVal = Math.max(...counts, 1); // Avoid division by zero

  const points = [];
  for (let i = 0; i < days.length; i++) {
    const x = startX + i * (graphWidth / (days.length - 1));
    const y = endY - (days[i].contributionCount / maxVal) * graphHeight;
    points.push({ x, y, count: days[i].contributionCount, date: days[i].date });
  }

  let pathD = `M ${points[0].x} ${points[0].y}`;
  let areaD = `M ${points[0].x} ${endY} L ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
    areaD += ` L ${points[i].x} ${points[i].y}`;
  }
  areaD += ` L ${points[points.length - 1].x} ${endY} Z`;

  const gridLines = [];
  const numGridLines = 4;
  for (let i = 0; i <= numGridLines; i++) {
    const val = Math.round((maxVal / numGridLines) * i);
    const y = endY - (val / maxVal) * graphHeight;
    gridLines.push({ y, val });
  }

  const stars = generateStars(50, width, height);

  let dots = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let fill = "#1E293B";
    let size = 2.5;
    let glow = "";
    
    if (p.count > 0 && p.count < 3) {
      fill = "#0ea5e9";
      size = 3.5;
    } else if (p.count >= 3 && p.count < 8) {
      fill = "#818cf8";
      size = 4.5;
      glow = `filter="url(#dotGlow)"`;
    } else if (p.count >= 8) {
      fill = "#c084fc";
      size = 6;
      glow = `filter="url(#dotGlowLarge)"`;
    }
    
    dots += `<circle cx="${p.x}" cy="${p.y}" r="${size}" fill="${fill}" ${glow} />\n`;
    if (p.count >= 8) {
      dots += `<circle cx="${p.x}" cy="${p.y}" r="${size + 4}" fill="none" stroke="#c084fc" stroke-opacity="0.3" stroke-width="1"><animate attributeName="r" values="${size};${size + 8};${size}" dur="3s" repeatCount="indefinite"/></circle>\n`;
    }
  }

  let xAxisDotsAndLabels = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dateObj = new Date(p.date);
    const dayNum = dateObj.getDate();
    xAxisDotsAndLabels += `<circle cx="${p.x}" cy="${endY}" r="2" fill="#38BDF8" opacity="0.5" />\n`;
    xAxisDotsAndLabels += `<text x="${p.x}" y="${endY + 16}" class="font-mono axis-label-daily" text-anchor="middle" font-size="8.5">${dayNum}</text>\n`;
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070D1E"/>
      <stop offset="100%" stop-color="#040712"/>
    </linearGradient>
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#818CF8" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#040712" stop-opacity="0"/>
    </linearGradient>
    <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="dotGlowLarge" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .font-sans { font-family: system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: ui-monospace, monospace; }
      .title { fill: #E2E8F0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
      .grid-line-dotted { stroke: #1E293B; stroke-opacity: 0.6; stroke-dasharray: 1 3; }
      .axis-label { fill: #64748B; font-size: 11px; }
      .axis-label-daily { fill: #475569; font-weight: bold; }
    </style>
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Header -->
  <text x="24" y="34" class="font-sans title">✦ Contribution Graph (Last 30 Days)</text>
  <text x="826" y="34" class="font-mono axis-label" text-anchor="end">MAX DAILY: ${maxVal} COMMITS</text>

  <!-- Grid lines & Y Axis Labels -->
  ${gridLines
    .map(
      (line) => `
    <line x1="${startX}" y1="${line.y}" x2="${startX + graphWidth}" y2="${line.y}" class="grid-line-dotted" />
    <text x="${startX - 12}" y="${line.y + 4}" class="font-mono axis-label" text-anchor="end">${line.val}</text>
  `
    )
    .join("")}

  <!-- Area under curve -->
  <path d="${areaD}" fill="url(#areaGrad)" />

  <line x1="${startX}" y1="${endY}" x2="${startX + graphWidth}" y2="${endY}" stroke="#1E293B" stroke-width="1.2" />
  ${xAxisDotsAndLabels}

  <!-- Smooth Neon Line -->
  <path d="${pathD}" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="url(#lineGlow)" />

  <!-- Constellation Dots -->
  ${dots}
</svg>`;
}

// 3. Generate assets/streak-stats.svg
export function drawStreakStats(stats) {
  const width = 410;
  const height = 280;
  const stars = generateStars(30, width, height);

  const cx = 135;
  const cy = 145;
  
  const totRadius = 75;
  const totCircum = 2 * Math.PI * totRadius;
  const totOffset = totCircum * 0.15;

  const longRadius = 55;
  const longCircum = 2 * Math.PI * longRadius;
  const longPct = Math.min(stats.longestStreak / 30, 1.0);
  const longOffset = longCircum * (1 - longPct);

  const currRadius = 35;
  const currCircum = 2 * Math.PI * currRadius;
  const currPct = Math.min(stats.currentStreak / 30, 1.0);
  const currOffset = currCircum * (1 - currPct);

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070D1E"/>
      <stop offset="100%" stop-color="#040712"/>
    </linearGradient>
    <filter id="neonCyan" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="neonPurple" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="neonPink" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .font-sans { font-family: system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: ui-monospace, monospace; }
      .title { fill: #E2E8F0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
      .gauge-bg { stroke: #1E293B; stroke-opacity: 0.4; fill: none; }
      .stat-val { fill: #F8FAFC; font-weight: 700; }
      .stat-lbl { fill: #64748B; font-size: 11px; }
      @keyframes spin-cw {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .planet-rot { transform-origin: ${cx}px ${cy}px; }
    </style>
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Title -->
  <text x="24" y="34" class="font-sans title">✦ Contribution Streaks</text>

  <!-- Radial Gauge Dials -->
  <circle cx="${cx}" cy="${cy}" r="${totRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${totRadius}" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${totCircum}" stroke-dashoffset="${totOffset}" transform="rotate(-90 ${cx} ${cy})" fill="none" filter="url(#neonCyan)" />

  <circle cx="${cx}" cy="${cy}" r="${longRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${longRadius}" stroke="#818CF8" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${longCircum}" stroke-dashoffset="${longOffset}" transform="rotate(-90 ${cx} ${cy})" fill="none" filter="url(#neonPurple)" />

  <circle cx="${cx}" cy="${cy}" r="${currRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${currRadius}" stroke="#C084FC" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${currCircum}" stroke-dashoffset="${currOffset}" transform="rotate(-90 ${cx} ${cy})" fill="none" filter="url(#neonPink)" />

  <!-- Center planet in the gauge -->
  <circle cx="${cx}" cy="${cy}" r="18" fill="#1E1B4B" stroke="#818CF8" stroke-width="1"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#38BDF8" font-size="12" font-weight="900" class="font-mono">${stats.currentStreak}d</text>

  <!-- Small rotating planet on the outer orbit -->
  <g class="planet-rot" style="animation: spin-cw 20s linear infinite;">
    <circle cx="${cx + totRadius}" cy="${cy}" r="4" fill="#38BDF8" filter="url(#neonCyan)" />
  </g>

  <!-- Stats Legend List -->
  <g transform="translate(250, 75)" class="font-sans">
    <!-- Stat 1: Total -->
    <circle cx="0" cy="5" r="5" fill="#38BDF8" filter="url(#neonCyan)" />
    <text x="16" y="8" class="font-mono stat-val" font-size="17">${stats.totalContributions}</text>
    <text x="16" y="24" class="stat-lbl">TOTAL COMMITS</text>

    <!-- Stat 2: Longest -->
    <g transform="translate(0, 52)">
      <circle cx="0" cy="5" r="5" fill="#818CF8" filter="url(#neonPurple)" />
      <text x="16" y="8" class="font-mono stat-val" font-size="17">${stats.longestStreak} DAYS</text>
      <text x="16" y="24" class="stat-lbl">LONGEST STREAK</text>
    </g>

    <!-- Stat 3: Current -->
    <g transform="translate(0, 104)">
      <circle cx="0" cy="5" r="5" fill="#C084FC" filter="url(#neonPink)" />
      <text x="16" y="8" class="font-mono stat-val" font-size="17">${stats.currentStreak} DAYS</text>
      <text x="16" y="24" class="stat-lbl">CURRENT STREAK</text>
    </g>
  </g>
</svg>`;
}

// 4. Generate assets/language-galaxy.svg
export function drawLanguageGalaxy(langs) {
  const width = 410;
  const height = 280;
  const stars = generateStars(35, width, height);

  const cx = 135;
  const cy = 145;

  const topLangs = langs.slice(0, 5);
  const totalWeight = topLangs.reduce((acc, curr) => acc + curr.size, 0);

  let orbitGroups = "";
  let legendItems = "";

  const orbitRadii = [36, 56, 74, 92, 108];
  const orbitSpeeds = [14, 20, 28, 38, 50];

  for (let i = 0; i < topLangs.length; i++) {
    const lang = topLangs[i];
    const pct = totalWeight > 0 ? (lang.size / totalWeight) * 100 : 0;
    const planetSize = Math.max(Math.sqrt(pct) * 2.2, 4);
    const r = orbitRadii[i] || 110;
    const dur = orbitSpeeds[i] || 60;
    const color = lang.color || "#818cf8";

    orbitGroups += `
    <!-- ${lang.name} Orbit -->
    <circle cx="${cx}" cy="${cy}" r="${r}" class="gauge-bg" stroke-width="0.8" />
    <g style="transform-origin: ${cx}px ${cy}px; animation: spin-cw ${dur}s linear infinite;">
      <circle cx="${cx + r}" cy="${cy}" r="${planetSize.toFixed(1)}" fill="${color}" filter="url(#glow-${i})" />
    </g>
    `;

    const legendY = 62 + i * 36;
    legendItems += `
    <g transform="translate(0, ${legendY})">
      <circle cx="0" cy="5" r="5" fill="${color}" />
      <text x="16" y="9" class="font-mono stat-val" font-size="13">${lang.name}</text>
      <text x="130" y="9" class="font-mono stat-lbl" font-size="12" text-anchor="end">${pct.toFixed(1)}%</text>
      <rect x="16" y="16" width="114" height="3" rx="1.5" fill="#1E293B" />
      <rect x="16" y="16" width="${(114 * (pct / 100)).toFixed(0)}" height="3" rx="1.5" fill="${color}" />
    </g>
    `;
  }

  let filters = "";
  for (let i = 0; i < topLangs.length; i++) {
    filters += `
    <filter id="glow-${i}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`;
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070D1E"/>
      <stop offset="100%" stop-color="#040712"/>
    </linearGradient>
    <style>
      .font-sans { font-family: system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: ui-monospace, monospace; }
      .title { fill: #E2E8F0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
      .gauge-bg { stroke: #1E293B; stroke-opacity: 0.4; fill: none; stroke-dasharray: 2 4; }
      .stat-val { fill: #F8FAFC; font-weight: 600; }
      .stat-lbl { fill: #64748B; }
      @keyframes spin-cw {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
    ${filters}
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Title -->
  <text x="24" y="34" class="font-sans title">✦ Language Distribution</text>

  <!-- Central Star -->
  <circle cx="${cx}" cy="${cy}" r="15" fill="#F59E0B" filter="url(#glow-0)"/>
  <circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="#F59E0B" stroke-opacity="0.2" stroke-width="1">
    <animate attributeName="r" values="15;28;15" dur="4s" repeatCount="indefinite"/>
  </circle>

  <!-- Galaxy orbits and planets -->
  ${orbitGroups}

  <!-- Legend -->
  <g transform="translate(250, 10)" class="font-sans">
    ${legendItems}
  </g>
</svg>`;
}

// 5. Generate assets/github-stats.svg
export function drawGithubStats(stats) {
  const width = 850;
  const height = 180;
  const stars = generateStars(40, width, height);

  const colWidth = 186;
  const colGap = 16;
  const startX = 35;
  const panels = [
    { name: "COMMITS", val: stats.commits, color: "#38BDF8", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
    { name: "PULL REQUESTS", val: stats.prs, color: "#818CF8", icon: "M6 3v12M18 9V21M6 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6z" },
    { name: "ISSUES FIXED", val: stats.issues, color: "#C084FC", icon: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
    { name: "TOTAL STARS", val: stats.stars, color: "#F59E0B", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }
  ];

  let panelsSvg = "";
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    const x = startX + i * (colWidth + colGap);
    
    panelsSvg += `
    <g transform="translate(${x}, 52)">
      <rect width="${colWidth}" height="100" rx="8" fill="#0C142A" stroke="#1E293B" stroke-width="1.2" />
      <line x1="0" y1="10" x2="0" y2="90" stroke="${p.color}" stroke-width="2.5" />
      <g transform="translate(18, 18) scale(0.8)" fill="none" stroke="${p.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${p.icon}" />
      </g>
      <text x="18" y="58" class="font-sans stat-lbl" fill="#64748B" font-size="10" font-weight="700">${p.name}</text>
      <text x="18" y="82" class="font-mono stat-val" fill="#E2E8F0" font-size="20" font-weight="900" filter="url(#glow-${i})">${p.val}</text>
    </g>
    `;
  }

  let filters = "";
  for (let i = 0; i < panels.length; i++) {
    filters += `
    <filter id="glow-${i}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`;
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070D1E"/>
      <stop offset="100%" stop-color="#040712"/>
    </linearGradient>
    <style>
      .font-sans { font-family: system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: ui-monospace, monospace; }
      .title { fill: #E2E8F0; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
      .stat-val { fill: #F8FAFC; }
      .stat-lbl { letter-spacing: 1px; }
    </style>
    ${filters}
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Title -->
  <text x="24" y="34" class="font-sans title">✦ GitHub Profile Statistics</text>

  <!-- Panels -->
  ${panelsSvg}
</svg>`;
}

// Main compiler
async function main() {
  console.log(`Starting space dashboard generation for ${USERNAME}...`);
  
  let days = [];
  let streakData = { totalContributions: 0, currentStreak: 0, longestStreak: 0 };
  let totalContributionsYear = 0;

  // Fetch real contributions from the public calendar scraper
  console.log("Fetching actual public contributions calendar...");
  try {
    const scraped = await fetchPublicContributions(USERNAME);
    days = scraped.days.slice(-30);
    totalContributionsYear = scraped.totalContributions;
    streakData = calculateStreaks(scraped.days);
    console.log(`Public calendar scraped successfully. Total contributions: ${totalContributionsYear}.`);
  } catch (e) {
    console.error("Failed to parse public contributions scraper:", e.message);
    console.log("Generating standard fallback contribution days...");
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      days.push({ date: dateStr, contributionCount: 0 });
    }
  }

  let userData = null;
  if (TOKEN) {
    console.log("Token found. Querying GitHub GraphQL API for repositories...");
    try {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "antigravity-readme-generator",
        },
        body: JSON.stringify({
          query: GRAPHQL_QUERY,
          variables: { username: USERNAME },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (!json.errors) {
          userData = json.data?.user;
          console.log("GraphQL user data retrieved successfully.");
        }
      }
    } catch (e) {
      console.error("Failed to query GraphQL API: ", e.message);
    }
  }

  // Fallback defaults for bio & repo stats
  let name = "Tanishq Mangal";
  let bio = "Computer Science Engineer — building RAG swarm engines, deep learning libraries, and SaaS apps.";
  let commitsCount = totalContributionsYear || 322;
  let prsCount = 14;
  let issuesCount = 4;
  let starsCount = 12;

  let languages = [
    { name: "TypeScript", size: 42000, color: "#3178c6" },
    { name: "Python", size: 31000, color: "#3572A5" },
    { name: "Rust", size: 18000, color: "#dea584" },
    { name: "Go", size: 8000, color: "#00ADD8" },
    { name: "JavaScript", size: 5000, color: "#f1e05a" }
  ];

  let activeRepos = [
    { name: "Semantic-6G", description: "Software-based 6G semantic communication system using ResNet + GRU autoencoders.", latestCommit: "refactor: optimize PyTorch image encoders", primaryLanguage: { name: "Python", color: "#3572A5" }, pushedAgo: "18d ago", stars: 0 },
    { name: "Larder", description: "Production-grade multi-tenant restaurant SaaS inventory & OCR invoice parser.", latestCommit: "feat: integrate tesseract OCR parser", primaryLanguage: { name: "TypeScript", color: "#3178c6" }, pushedAgo: "in progress", stars: 0 },
    { name: "ShipGate", description: "Self-serve production-readiness scorer for AI-agent-built apps.", latestCommit: "feat: parse repo dependencies on load", primaryLanguage: { name: "TypeScript", color: "#3178c6" }, pushedAgo: "building", stars: 0 }
  ];

  if (userData) {
    name = userData.name || USERNAME;
    bio = userData.bio || bio;

    // Overwrite commits & streaks if GraphQL calendar is valid and larger (e.g. contains private commits)
    const contributionCalendar = userData.contributionsCollection?.contributionCalendar;
    if (contributionCalendar?.weeks && contributionCalendar.totalContributions > totalContributionsYear) {
      const allDays = [];
      totalContributionsYear = contributionCalendar.totalContributions;

      for (const week of contributionCalendar.weeks) {
        for (const day of week.contributionDays) {
          allDays.push({
            date: day.date,
            contributionCount: day.contributionCount
          });
        }
      }
      
      streakData = calculateStreaks(allDays);
      days = allDays.slice(-30);
      console.log(`Using authenticated GraphQL contributions: Total=${totalContributionsYear}.`);
    }

    const repoNodes = userData.repositories?.nodes || [];
    let calculatedStars = 0;
    const langTotals = {};
    const processedRepos = [];

    for (const repo of repoNodes) {
      calculatedStars += repo.stargazerCount || 0;
      if (repo.languages?.edges) {
        for (const edge of repo.languages.edges) {
          const lName = edge.node.name;
          const lColor = edge.node.color;
          if (!langTotals[lName]) langTotals[lName] = { size: 0, color: lColor };
          langTotals[lName].size += edge.size;
        }
      }

      let commitMsg = "";
      if (repo.defaultBranchRef?.target?.history?.nodes?.[0]) {
        commitMsg = repo.defaultBranchRef.target.history.nodes[0].message.split("\n")[0];
      }
      processedRepos.push({
        name: repo.name,
        description: repo.description || "No description yet.",
        latestCommit: commitMsg || "Commit hook active",
        primaryLanguage: repo.primaryLanguage || { name: "JavaScript", color: "#f1e05a" },
        pushedAt: repo.pushedAt,
        stars: repo.stargazerCount || 0
      });
    }

    if (calculatedStars > 0) starsCount = calculatedStars;

    const sorted = processedRepos
      .filter((r) => r.name.toLowerCase() !== USERNAME.toLowerCase())
      .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime())
      .slice(0, 3);
      
    activeRepos = sorted.map(r => ({
      name: r.name,
      description: r.description,
      latestCommit: r.latestCommit,
      primaryLanguage: r.primaryLanguage,
      pushedAgo: timeAgo(r.pushedAt),
      stars: r.stars
    }));

    const formattedLangs = Object.keys(langTotals).map(lName => ({
      name: lName,
      size: langTotals[lName].size,
      color: langTotals[lName].color
    })).sort((a, b) => b.size - a.size);

    if (formattedLangs.length > 0) languages = formattedLangs;

    const coll = userData.contributionsCollection;
    if (coll) {
      commitsCount = coll.totalCommitContributions || commitsCount;
      prsCount = coll.totalPullRequestContributions || prsCount;
      issuesCount = coll.totalIssueContributions || issuesCount;
    }
  }

  // Sync commit counts to show real totals in stats panel
  if (totalContributionsYear > commitsCount) {
    commitsCount = totalContributionsYear;
  }
  const stats = { commits: commitsCount, prs: prsCount, issues: issuesCount, stars: starsCount };
  
  // Overwrite totals in streaks block
  streakData.totalContributions = commitsCount;

  // Write static visual assets
  writeFileSync(join(ASSETS_DIR, "hero-banner.svg"), drawHeroBanner(name, bio), "utf8");
  writeFileSync(join(ASSETS_DIR, "streak-stats.svg"), drawStreakStats(streakData), "utf8");
  writeFileSync(join(ASSETS_DIR, "language-galaxy.svg"), drawLanguageGalaxy(languages), "utf8");
  writeFileSync(join(ASSETS_DIR, "github-stats.svg"), drawGithubStats(stats), "utf8");
  writeFileSync(join(ASSETS_DIR, "contribution-graph.svg"), drawContributionGraph(USERNAME, days), "utf8");

  console.log("Static space-themed SVG cards generated successfully.");

  // Build standard GFM Markdown Table for Currently Building (fully supported, has borders, 100% clickable)
  let currentlyBuildingHTML = "";
  if (activeRepos && activeRepos.length > 0) {
    const headers = activeRepos.map(r => `🌐 [**${r.name}**](https://github.com/${USERNAME}/${r.name})`).join(" | ");
    const underlines = activeRepos.map(() => "---").join(" | ");
    const contents = activeRepos.map(repo => {
      const commitMsg = repo.latestCommit.length > 60 ? repo.latestCommit.slice(0, 57) + "..." : repo.latestCommit;
      const langColor = repo.primaryLanguage?.color || "#38BDF8";
      const langName = repo.primaryLanguage?.name || "—";
      return `${repo.description}<br/><br/>**Latest Commit:** \`${commitMsg}\`<br/><br/><span style="display: inline-flex; align-items: center;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${langColor}; margin-right: 4px;"></span>${langName}</span> · ⏱ ${repo.pushedAgo} · ★ ${repo.stars}`;
    }).join(" | ");
    currentlyBuildingHTML = `| ${headers} |\n| ${underlines} |\n| ${contents} |`;
  }

  // Flagship projects GFM Table
  const flagshipProjectsHTML = `| 🧠 [**Pravaha**](https://github.com/Eternalcodertanishq3/Pravaha) | 🔬 [**miniGrad**](https://github.com/Eternalcodertanishq3/miniGrad) | ♟️ [**Axiorynth**](https://github.com/Eternalcodertanishq3/Axiorynth) |
| --- | --- | --- |
| LLM inference engine featuring a 51-agent swarm architecture and a full RAG pipeline built from first principles.<br/><br/>\`Python\` · \`AI Swarms\` | Deep learning framework built from scratch in NumPy — gradients verified against PyTorch to 1e-6. Published to PyPI.<br/><br/>\`Python\` · \`Autodiff\` | A chess engine written in Rust, built for speed and board representation correctness from the ground up.<br/><br/>\`Rust\` · \`Systems\` |`;

  // Assemble the spacious markdown content, embedding the customized live-updating Vercel URLs
  const mdContent = `<div align="center">

<!-- COCKPIT SPACE DASHBOARD - UNIFIED GRID (SPACIOUS LAYOUT) -->

<p align="center">
  <img src="${VERCEL_URL}/api/banner" width="100%" alt="Space HUD Banner" />
</p>

<p align="center">
  <img src="${VERCEL_URL}/api/graph" width="100%" alt="Contribution Graph" />
</p>

<p align="center">
  <img src="${VERCEL_URL}/api/streak" width="49.5%" alt="Contribution Streaks" />
  <img src="${VERCEL_URL}/api/galaxy" width="49.5%" alt="Language Distribution" />
</p>

<p align="center">
  <img src="${VERCEL_URL}/api/stats" width="100%" alt="GitHub Profile Statistics" />
</p>

</div>

<br/>

---

<br/>

## 🔴 Currently Building — *live from GitHub*

<!--START_SECTION:currently-building-->
${currentlyBuildingHTML}
<!--END_SECTION:currently-building-->

<sub style="display: block; text-align: center; margin-top: 5px; color: #64748B; font-family: ui-monospace, monospace;">🔄 Auto-synced from live GitHub activity — updates every 6 hours</sub>

<br/>

---

## ✦ Flagship Projects

${flagshipProjectsHTML}

<br/>

---

## 🦾 Tech Arsenal

<div align="center" style="margin: 20px 0; padding: 25px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 12px;">
  <div style="margin-bottom: 16px;">
    <img src="https://skillicons.dev/icons?i=py,js,ts,cpp,rust,go,react,nextjs,tailwind,nodejs&amp;perline=10" alt="Tech Stack" style="max-width: 100%; height: auto;"/>
  </div>
  <div>
    <img src="https://skillicons.dev/icons?i=fastapi,firebase,postgres,mongodb,docker,redis,pytorch,git,linux,vscode&amp;perline=10" alt="Tech Stack 2" style="max-width: 100%; height: auto;"/>
  </div>
  <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748B; font-style: italic; font-family: ui-monospace, monospace;">Orchestrating production-grade tools across the cosmic software stack</p>
</div>

<br/>

---

## ⚡ Live Contribution Heatmap

<div align="center" style="margin: 20px 0; padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 12px;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${USERNAME}/${USERNAME}/output/github-contribution-grid-snake-dark.svg">
    <img src="https://raw.githubusercontent.com/${USERNAME}/${USERNAME}/output/github-contribution-grid-snake.svg" alt="Contribution Heatmap" style="max-width: 100%; height: auto; border-radius: 8px;"/>
  </picture>
  <sub style="display: block; text-align: center; margin-top: 15px; color: #64748B; font-family: ui-monospace, monospace;">⚡ Contribution snake generated every 12 hours</sub>
</div>

<br/>

---

## ✦ Connect & Collaborate

<div align="center" style="padding: 20px 0;">

<a href="https://tanishq-creates.netlify.app" target="_blank" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Portfolio-0F172A?style=for-the-badge&logo=firefox&logoColor=FF7139" alt="Portfolio"/>
</a>
<a href="mailto:tanishqmangal3@gmail.com" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Email-0F172A?style=for-the-badge&logo=gmail&logoColor=D14836" alt="Email"/>
</a>
<a href="https://www.linkedin.com/in/tanishq-mangal-7a2683254/" target="_blank" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/LinkedIn-0F172A?style=for-the-badge&logo=linkedin&logoColor=0A66C2" alt="LinkedIn"/>
</a>
<a href="https://twitter.com" target="_blank" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Twitter-0F172A?style=for-the-badge&logo=twitter&logoColor=38BDF8" alt="Twitter"/>
</a>

</div>

<br/>

<div align="center" style="padding: 20px; font-size: 13px; color: #64748B; font-family: ui-monospace, monospace;">
  <sub>✨ "Writing code that feels like magic." ✨</sub>
  <br/>
  <sub>Last synced: ${new Date().toISOString().slice(0, 10)}</sub>
</div>
`;

  writeFileSync(README_PATH, mdContent, "utf8");
  console.log("README.md rewritten and dashboard grid assembled.");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith("sync-readme.mjs")) {
  main().catch((err) => {
    console.error("Critical build error:", err);
    process.exit(1);
  });
}
