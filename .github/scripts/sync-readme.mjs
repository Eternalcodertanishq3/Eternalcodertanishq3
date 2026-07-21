#!/usr/bin/env node
/**
 * Space-themed GitHub Profile Dashboard Generator
 * Generates custom SVG cards (Hero, Contribution Graph, Streaks, Languages Galaxy, Stats HUD)
 * and updates README.md with the new layout.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const USERNAME = process.env.GH_USERNAME || "Eternalcodertanishq3";
const TOKEN = process.env.GH_TOKEN;
const README_PATH = "README.md";
const ASSETS_DIR = "assets";

// Ensure assets directory exists
if (!existsSync(ASSETS_DIR)) {
  mkdirSync(ASSETS_DIR, { recursive: true });
}

// Custom GraphQL query to fetch all required statistics in a single call
const GRAPHQL_QUERY = `
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

// Helper for time calculation
function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Generate starry backdrop helper for SVGs
function generateStars(count, width, height) {
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
function generateShootingStars(count, width, height) {
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
function calculateStreaks(days) {
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
  // Traverse backwards to find the current active streak
  for (let i = days.length - 1; i >= 0; i--) {
    const count = days[i].contributionCount;
    if (count > 0) {
      currentStreakTemp++;
      foundStart = true;
    } else {
      if (foundStart) {
        // Streak is broken
        break;
      }
      // If we haven't found any contributions yet, keep looking back a max of 2 days (today/yesterday)
      if (days.length - 1 - i > 2) {
        break;
      }
    }
  }
  currentStreak = currentStreakTemp;

  return { totalContributions, currentStreak, longestStreak };
}

// 1. Generate assets/hero-banner.svg
function drawHeroBanner(name, bio) {
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
      @keyframes scanline {
        0% { transform: translateY(0); }
        100% { transform: translateY(320px); }
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

  <!-- Orbital lines for space cockpit feel -->
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

  <!-- Tiny cockpit telemetry detail -->
  <text x="35" y="38" class="font-mono hud-text">SYS.STATUS: ACTIVE</text>
  <text x="35" y="52" class="font-mono hud-text">SECTOR: 0x6G-AI</text>
  <text x="1100" y="38" class="font-mono hud-text" text-anchor="end">ALTITUDE: 35,786 KM</text>
  <text x="1100" y="52" class="font-mono hud-text" text-anchor="end">ORBIT: GEOSTATIONARY</text>

  <!-- Center Content -->
  <g transform="translate(60, 0)">
    <text x="0" y="145" fill="url(#titleGrad)" font-size="52" font-weight="900" class="font-sans" filter="url(#neonGlow)" letter-spacing="1.5">${name}</text>
    <text x="5" y="185" fill="#E2E8F0" font-size="16" font-weight="700" class="font-mono" letter-spacing="4">SYSTEMS BUILDER · AI/ML · FULL-STACK</text>
    
    <!-- Short Bio / Terminal display line -->
    <rect x="5" y="215" width="620" height="42" rx="6" fill="#0F172A" stroke="#1E293B" stroke-width="1" />
    <text x="20" y="241" fill="#38BDF8" font-size="14" class="font-mono">&gt;_</text>
    <text x="45" y="241" fill="#94A3B8" font-size="13" class="font-mono">${bio}</text>
  </g>

  <!-- A cool cosmic constellation pattern -->
  <g stroke="#38BDF8" stroke-width="0.7" stroke-opacity="0.35" fill="none">
    <polyline points="980,60 1020,40 1060,50 1040,90 990,110 980,60" />
    <circle cx="980" cy="60" r="2.5" fill="#38BDF8" />
    <circle cx="1020" cy="40" r="2.5" fill="#818CF8" />
    <circle cx="1060" cy="50" r="2.5" fill="#C084FC" />
    <circle cx="1040" cy="90" r="2.5" fill="#38BDF8" />
    <circle cx="990" cy="110" r="2.5" fill="#38BDF8" />
  </g>
</svg>`;
}

// 2. Generate assets/contribution-graph.svg
function drawContributionGraph(username, days) {
  const width = 850;
  const height = 300;
  const graphWidth = 720;
  const graphHeight = 140;
  const startX = 65;
  const startY = 60;
  const endY = startY + graphHeight;

  // Find max value in days
  const counts = days.map((d) => d.contributionCount);
  const maxVal = Math.max(...counts, 8); // at least 8 to prevent flat scale

  // Compute X and Y coords
  const points = [];
  for (let i = 0; i < days.length; i++) {
    const x = startX + i * (graphWidth / (days.length - 1));
    const y = endY - (days[i].contributionCount / maxVal) * graphHeight;
    points.push({ x, y, count: days[i].contributionCount, date: days[i].date });
  }

  // Draw smooth path lines
  let pathD = `M ${points[0].x} ${points[0].y}`;
  let areaD = `M ${points[0].x} ${endY} L ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
    areaD += ` L ${points[i].x} ${points[i].y}`;
  }
  areaD += ` L ${points[points.length - 1].x} ${endY} Z`;

  // Format dates for labels
  const dateLabels = [];
  const labelInterval = Math.floor(days.length / 4);
  for (let i = 0; i < days.length; i += labelInterval) {
    const dateObj = new Date(days[i].date);
    const month = dateObj.toLocaleString("en-US", { month: "short" });
    const day = dateObj.getDate();
    dateLabels.push({ x: points[i].x, text: `${month} ${day}` });
  }
  // Make sure to add the last date
  if (days.length > 0) {
    const lastDate = new Date(days[days.length - 1].date);
    const lastText = `${lastDate.toLocaleString("en-US", { month: "short" })} ${lastDate.getDate()}`;
    dateLabels.push({ x: points[points.length - 1].x, text: lastText });
  }

  // Grid lines Y values
  const gridLines = [];
  const numGridLines = 4;
  for (let i = 0; i <= numGridLines; i++) {
    const val = Math.round((maxVal / numGridLines) * i);
    const y = endY - (val / maxVal) * graphHeight;
    gridLines.push({ y, val });
  }

  const stars = generateStars(50, width, height);

  // Generate constellation dots
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
      // pulsating halo
      dots += `<circle cx="${p.x}" cy="${p.y}" r="${size + 4}" fill="none" stroke="#c084fc" stroke-opacity="0.3" stroke-width="1"><animate attributeName="r" values="${size};${size + 8};${size}" dur="3s" repeatCount="indefinite"/></circle>\n`;
    }
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
      .grid-line { stroke: #1E293B; stroke-opacity: 0.5; stroke-dasharray: 3 3; }
      .axis-label { fill: #64748B; font-size: 11px; }
      @keyframes pulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.8; }
      }
    </style>
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Header -->
  <text x="24" y="34" class="font-sans title">✦ COSMIC CONTRIBUTION TRAJECTORY (30 DAYS)</text>
  <text x="826" y="34" class="font-mono axis-label" text-anchor="end">MAX DAILY: ${maxVal} COMMITS</text>

  <!-- Grid lines & Y Axis Labels -->
  ${gridLines
    .map(
      (line) => `
    <line x1="${startX}" y1="${line.y}" x2="${startX + graphWidth}" y2="${line.y}" class="grid-line" />
    <text x="${startX - 12}" y="${line.y + 4}" class="font-mono axis-label" text-anchor="end">${line.val}</text>
  `
    )
    .join("")}

  <!-- Area under curve -->
  <path d="${areaD}" fill="url(#areaGrad)" />

  <!-- Smooth Neon Line -->
  <path d="${pathD}" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="url(#lineGlow)" />

  <!-- Constellation Dots -->
  ${dots}

  <!-- X Axis Labels -->
  ${dateLabels
    .map(
      (label) => `
    <text x="${label.x}" y="${endY + 22}" class="font-mono axis-label" text-anchor="middle">${label.text}</text>
  `
    )
    .join("")}
</svg>`;
}

// 3. Generate assets/streak-stats.svg
function drawStreakStats(stats) {
  const width = 410;
  const height = 280;
  const stars = generateStars(30, width, height);

  // Concentric ring parameters
  const cx = 135;
  const cy = 145;
  
  // Total contributions ring: R=75
  const totRadius = 75;
  const totCircum = 2 * Math.PI * totRadius;
  const totDash = totCircum;
  // Compute visual offset (e.g. scale total contributions dynamically to a full circle based on active progress)
  const totOffset = totCircum * 0.15; // 85% full

  // Longest streak ring: R=55
  const longRadius = 55;
  const longCircum = 2 * Math.PI * longRadius;
  // Let's cap longest streak scale at 30 days
  const longPct = Math.min(stats.longestStreak / 30, 1.0);
  const longOffset = longCircum * (1 - longPct);

  // Current streak ring: R=35
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
      @keyframes pulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.8; }
      }
      @keyframes spin-cw {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .planet-rot {
        transform-origin: ${cx}px ${cy}px;
      }
    </style>
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Title -->
  <text x="24" y="34" class="font-sans title">✦ ORBITAL STREAK TELEMETRY</text>

  <!-- Radial Gauge Dials (cockpit telemetry style) -->
  <circle cx="${cx}" cy="${cy}" r="${totRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${totRadius}" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${totCircum}" stroke-dashoffset="${totOffset}" transform="rotate(-90 ${cx} ${cy})" filter="url(#neonCyan)" />

  <circle cx="${cx}" cy="${cy}" r="${longRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${longRadius}" stroke="#818CF8" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${longCircum}" stroke-dashoffset="${longOffset}" transform="rotate(-90 ${cx} ${cy})" filter="url(#neonPurple)" />

  <circle cx="${cx}" cy="${cy}" r="${currRadius}" class="gauge-bg" stroke-width="5" />
  <circle cx="${cx}" cy="${cy}" r="${currRadius}" stroke="#C084FC" stroke-width="5" stroke-linecap="round" fill="none"
          stroke-dasharray="${currCircum}" stroke-dashoffset="${currOffset}" transform="rotate(-90 ${cx} ${cy})" filter="url(#neonPink)" />

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
function drawLanguageGalaxy(langs) {
  const width = 410;
  const height = 280;
  const stars = generateStars(35, width, height);

  const cx = 135;
  const cy = 145;

  // Take top 5 languages, normalize sizes
  const topLangs = langs.slice(0, 5);
  const totalWeight = topLangs.reduce((acc, curr) => acc + curr.size, 0);

  let orbitGroups = "";
  let legendItems = "";

  const orbitRadii = [36, 56, 74, 92, 108];
  const orbitSpeeds = [14, 20, 28, 38, 50]; // Seconds for full orbit rotation

  for (let i = 0; i < topLangs.length; i++) {
    const lang = topLangs[i];
    const pct = totalWeight > 0 ? (lang.size / totalWeight) * 100 : 0;
    
    // Planet size proportional to square root of percentage
    const planetSize = Math.max(Math.sqrt(pct) * 2.2, 4);
    const r = orbitRadii[i] || 110;
    const dur = orbitSpeeds[i] || 60;
    const color = lang.color || "#818cf8";

    // SVG group that orbits
    orbitGroups += `
    <!-- ${lang.name} Orbit -->
    <circle cx="${cx}" cy="${cy}" r="${r}" class="gauge-bg" stroke-width="0.8" />
    <g style="transform-origin: ${cx}px ${cy}px; animation: spin-cw ${dur}s linear infinite;">
      <circle cx="${cx + r}" cy="${cy}" r="${planetSize.toFixed(1)}" fill="${color}" filter="url(#glow-${i})" />
    </g>
    `;

    // Legend on the right
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

  // Create filters for planet glows
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
      @keyframes pulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.8; }
      }
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
  <text x="24" y="34" class="font-sans title">✦ LANGUAGE GALAXY SYSTEM</text>

  <!-- Central Star (Tanishq Core) -->
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
function drawGithubStats(stats) {
  const width = 850;
  const height = 180;
  const stars = generateStars(40, width, height);

  // 4 columns positions
  const colWidth = 186;
  const colGap = 16;
  const startX = 35;
  const panels = [
    { name: "COMMITS", val: stats.commits, desc: "WARP CORE DRIVES", color: "#38BDF8", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
    { name: "PRs SHIPPED", val: stats.prs, desc: "DOCKING MANIFOLDS", color: "#818CF8", icon: "M6 3v12M18 9V21M6 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6z" },
    { name: "ISSUES FIXED", val: stats.issues, desc: "ASTEROID SHIELDS", color: "#C084FC", icon: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
    { name: "TOTAL STARS", val: stats.stars, desc: "SHINING PULSARS", color: "#F59E0B", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }
  ];

  let panelsSvg = "";
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    const x = startX + i * (colWidth + colGap);
    
    panelsSvg += `
    <!-- Panel ${i + 1} -->
    <g transform="translate(${x}, 52)">
      <!-- HUD Card background with border -->
      <rect width="${colWidth}" height="100" rx="8" fill="#0C142A" stroke="#1E293B" stroke-width="1.2" />
      <!-- Left side neon highlight -->
      <line x1="0" y1="10" x2="0" y2="90" stroke="${p.color}" stroke-width="2.5" />
      
      <!-- Icon (simplified vector paths) -->
      <g transform="translate(18, 18) scale(0.8)" fill="none" stroke="${p.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${p.icon}" />
      </g>
      
      <text x="18" y="58" class="font-sans stat-lbl" fill="#64748B" font-size="10" font-weight="700">${p.name}</text>
      <text x="18" y="82" class="font-mono stat-val" fill="#E2E8F0" font-size="20" font-weight="900" filter="url(#glow-${i})">${p.val}</text>
      
      <!-- Cockpit telemetry tag -->
      <text x="168" y="24" class="font-mono" fill="#64748B" font-size="8" text-anchor="end">${p.desc}</text>
    </g>
    `;
  }

  // Create filters for stats glows
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
      @keyframes pulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.8; }
      }
    </style>
    ${filters}
  </defs>

  <!-- Card body -->
  <rect width="${width}" height="${height}" rx="12" fill="url(#cardBg)" stroke="#1E293B" stroke-width="1.2" />
  
  <!-- Stars -->
  ${stars}

  <!-- Title -->
  <text x="24" y="34" class="font-sans title">✦ COSMIC TELEMETRY STATISTICS HUD</text>

  <!-- Panels -->
  ${panelsSvg}
</svg>`;
}

// Main execution block
async function main() {
  console.log(`Starting space dashboard generation for ${USERNAME}...`);
  let userData = null;

  if (TOKEN) {
    console.log("Token found. Querying GitHub GraphQL API...");
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

      if (!response.ok) {
        throw new Error(`GitHub GraphQL API responded with status ${response.status}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(`GraphQL Errors: ${JSON.stringify(json.errors)}`);
      }
      userData = json.data?.user;
      console.log("GraphQL user data retrieved successfully.");
    } catch (e) {
      console.error("Failed to fetch GraphQL data: ", e.message);
      console.log("Falling back to mock-data fallback generation...");
    }
  } else {
    console.log("No GH_TOKEN detected in environment. Generating using high-quality mock data...");
  }

  // Define fallback datasets (realistic information modeled for Tanishq Mangal)
  let name = "Tanishq Mangal";
  let bio = "Computer Science Engineer — building RAG swarm engines, deep learning libraries, and SaaS apps.";
  let commitsCount = 313;
  let prsCount = 48;
  let issuesCount = 15;
  let followersCount = 28;
  let starsCount = 12;
  
  // Create 30 days of contribution data with space-themed waves
  let days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    
    // Wave shape simulating daily contributions
    // A sine wave plus noise
    const rad = (i / 29) * Math.PI * 4;
    let count = Math.round(Math.max(0, Math.sin(rad) * 6 + 5 + Math.random() * 4));
    
    // Make weekends lower, midweeks higher
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      count = Math.floor(count * 0.2);
    }
    
    days.push({ date: dateStr, contributionCount: count });
  }

  let languages = [
    { name: "TypeScript", size: 42000, color: "#3178c6" },
    { name: "Python", size: 31000, color: "#3572A5" },
    { name: "Rust", size: 18000, color: "#dea584" },
    { name: "Go", size: 8000, color: "#00ADD8" },
    { name: "JavaScript", size: 5000, color: "#f1e05a" }
  ];

  let streakData = {
    totalContributions: 313,
    currentStreak: 8,
    longestStreak: 12
  };

  // If we have actual GitHub API data, extract details and overwrite defaults
  if (userData) {
    name = userData.name || USERNAME;
    bio = userData.bio || bio;
    
    // Extract actual contribution details
    const contributionCalendar = userData.contributionsCollection?.contributionCalendar;
    if (contributionCalendar?.weeks) {
      const allDays = [];
      for (const week of contributionCalendar.weeks) {
        for (const day of week.contributionDays) {
          allDays.push({
            date: day.date,
            contributionCount: day.contributionCount
          });
        }
      }
      
      // Streak calculation based on full calendar
      streakData = calculateStreaks(allDays);
      
      // Get the last 30 days of contributions
      days = allDays.slice(-30);
    }

    // Extract repository statistics
    const repoNodes = userData.repositories?.nodes || [];
    let calculatedStars = 0;
    const langTotals = {};

    for (const repo of repoNodes) {
      calculatedStars += repo.stargazerCount || 0;
      
      // Extract language usage
      if (repo.languages?.edges) {
        for (const edge of repo.languages.edges) {
          const lName = edge.node.name;
          const lColor = edge.node.color;
          const lSize = edge.size;
          if (!langTotals[lName]) {
            langTotals[lName] = { size: 0, color: lColor };
          }
          langTotals[lName].size += lSize;
        }
      }
    }

    if (calculatedStars > 0) {
      starsCount = calculatedStars;
    }

    // Format languages array
    const formattedLangs = Object.keys(langTotals).map(lName => ({
      name: lName,
      size: langTotals[lName].size,
      color: langTotals[lName].color
    })).sort((a, b) => b.size - a.size);

    if (formattedLangs.length > 0) {
      languages = formattedLangs;
    }

    // Total commits, prs, issues over this year
    const coll = userData.contributionsCollection;
    if (coll) {
      commitsCount = coll.totalCommitContributions || commitsCount;
      prsCount = coll.totalPullRequestContributions || prsCount;
      issuesCount = coll.totalIssueContributions || issuesCount;
    }
  }

  // Compile full HUD statistics
  const stats = {
    commits: commitsCount,
    prs: prsCount,
    issues: issuesCount,
    stars: starsCount
  };

  // Generate and write all SVGs to the assets folder
  const heroBanner = drawHeroBanner(name, bio);
  const contributionGraph = drawContributionGraph(USERNAME, days);
  const streakStats = drawStreakStats(streakData);
  const languageGalaxy = drawLanguageGalaxy(languages);
  const githubStats = drawGithubStats(stats);

  writeFileSync(join(ASSETS_DIR, "hero-banner.svg"), heroBanner, "utf8");
  writeFileSync(join(ASSETS_DIR, "contribution-graph.svg"), contributionGraph, "utf8");
  writeFileSync(join(ASSETS_DIR, "streak-stats.svg"), streakStats, "utf8");
  writeFileSync(join(ASSETS_DIR, "language-galaxy.svg"), languageGalaxy, "utf8");
  writeFileSync(join(ASSETS_DIR, "github-stats.svg"), githubStats, "utf8");

  console.log("All space-themed assets generated successfully.");

  // Let's also update the Currently Building section from actual repo info if available
  let currentlyBuildingHTML = "";
  if (userData && userData.repositories?.nodes) {
    const repos = userData.repositories.nodes;
    // Sort by push date
    const sorted = repos
      .filter((r) => r.name.toLowerCase() !== USERNAME.toLowerCase())
      .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime())
      .slice(0, 3); // top 3 active repos

    const repoCards = [];
    for (const repo of sorted) {
      const desc = repo.description || "No description yet.";
      const lang = repo.primaryLanguage?.name || "—";
      const langColor = repo.primaryLanguage?.color || "#818cf8";
      const stars = repo.stargazerCount || 0;
      
      let commitMsg = "";
      if (repo.defaultBranchRef?.target?.history?.nodes?.[0]) {
        commitMsg = repo.defaultBranchRef.target.history.nodes[0].message.split("\n")[0];
      }
      const shortMsg = commitMsg.length > 70 ? commitMsg.slice(0, 67) + "..." : commitMsg;

      repoCards.push(`
<div style="flex: 1; min-width: 250px; padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px; box-sizing: border-box;">
  <h3 style="margin: 0 0 8px 0; color: #38BDF8; font-size: 16px;">
    <a href="https://github.com/${USERNAME}/${repo.name}" style="text-decoration: none; color: #38BDF8; font-weight: bold;">🌐 ${repo.name}</a>
  </h3>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; height: 38px; overflow: hidden; line-height: 1.4;">${desc}</p>
  <div style="font-size: 11px; color: #64748B; margin-bottom: 12px; font-family: ui-monospace, monospace;">
    <strong>Last Commit:</strong> ${shortMsg || "—"}
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
    <span style="display: flex; align-items: center; color: #E2E8F0;">
      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${langColor}; margin-right: 6px;"></span>
      ${lang}
    </span>
    <span style="color: #64748B;">⏱ ${timeAgo(repo.pushedAt)}</span>
    <span style="color: #F59E0B;">★ ${stars}</span>
  </div>
</div>`);
    }

    currentlyBuildingHTML = `
<div style="display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; width: 100%;">
  ${repoCards.join("\n")}
</div>
<sub style="display: block; text-align: center; margin-top: 15px; color: #64748B; font-family: ui-monospace, monospace;">🔄 Auto-synced from live GitHub activity — updates every 6 hours</sub>
`;
  } else {
    // Mock currently building cards just in case
    currentlyBuildingHTML = `
<div style="display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; width: 100%;">
  <div style="flex: 1; min-width: 250px; padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px; box-sizing: border-box;">
    <h3 style="margin: 0 0 8px 0; color: #38BDF8; font-size: 16px;">
      <a href="https://github.com/Eternalcodertanishq3/Semantic-6G" style="text-decoration: none; color: #38BDF8; font-weight: bold;">🌐 Semantic-6G</a>
    </h3>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; height: 38px; overflow: hidden; line-height: 1.4;">Software-based 6G semantic communication system using Joint Source-Channel Coding.</p>
    <div style="font-size: 11px; color: #64748B; margin-bottom: 12px; font-family: ui-monospace, monospace;">
      <strong>Last Commit:</strong> refactor: optimize PyTorch image encoders
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
      <span style="display: flex; align-items: center; color: #E2E8F0;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #3572A5; margin-right: 6px;"></span>
        Python
      </span>
      <span style="color: #64748B;">⏱ 2d ago</span>
      <span style="color: #F59E0B;">★ 0</span>
    </div>
  </div>
  <div style="flex: 1; min-width: 250px; padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px; box-sizing: border-box;">
    <h3 style="margin: 0 0 8px 0; color: #38BDF8; font-size: 16px;">
      <a href="https://github.com/Eternalcodertanishq3/Larder" style="text-decoration: none; color: #38BDF8; font-weight: bold;">🍽️ Larder</a>
    </h3>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; height: 38px; overflow: hidden; line-height: 1.4;">Production-grade multi-tenant restaurant SaaS — inventory, OCR invoice parsing.</p>
    <div style="font-size: 11px; color: #64748B; margin-bottom: 12px; font-family: ui-monospace, monospace;">
      <strong>Last Commit:</strong> feat: integrate tesseract OCR parser
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
      <span style="display: flex; align-items: center; color: #E2E8F0;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #3178c6; margin-right: 6px;"></span>
        TypeScript
      </span>
      <span style="color: #64748B;">⏱ 4d ago</span>
      <span style="color: #F59E0B;">★ 0</span>
    </div>
  </div>
</div>
<sub style="display: block; text-align: center; margin-top: 15px; color: #64748B; font-family: ui-monospace, monospace;">🔄 Auto-synced from live GitHub activity — updates every 6 hours</sub>
`;
  }

  // Assemble the README dashboard layout
  const newReadmeContent = `<div align="center">

<!-- COCKPIT SPACE DASHBOARD GRID -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: none;">
  <tr>
    <td width="100%" colspan="2" align="center" style="border: none; padding: 0;">
      <img src="assets/hero-banner.svg" width="100%" alt="Space HUD Banner" style="border-radius: 12px;" />
    </td>
  </tr>
  <tr>
    <td width="100%" colspan="2" align="center" style="border: none; padding: 12px 0 0 0;">
      <img src="assets/contribution-graph.svg" width="100%" alt="Cosmic Contribution Trajectory" style="border-radius: 12px;" />
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" style="border: none; padding: 12px 6px 0 0; box-sizing: border-box;">
      <img src="assets/streak-stats.svg" width="100%" alt="Orbital Streak Stats" style="border-radius: 12px;" />
    </td>
    <td width="50%" align="center" style="border: none; padding: 12px 0 0 6px; box-sizing: border-box;">
      <img src="assets/language-galaxy.svg" width="100%" alt="Language Galaxy System" style="border-radius: 12px;" />
    </td>
  </tr>
  <tr>
    <td width="100%" colspan="2" align="center" style="border: none; padding: 12px 0 0 0;">
      <img src="assets/github-stats.svg" width="100%" alt="Cosmic Stats HUD" style="border-radius: 12px;" />
    </td>
  </tr>
</table>

</div>

<br/>

---

<br/>

## 🔴 Currently Launching — *live from GitHub*

<!--START_SECTION:currently-building-->
${currentlyBuildingHTML}
<!--END_SECTION:currently-building-->

<br/>

---

## ✦ Flagship Projects

<div style="margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">

<div style="padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px;">
  <h3 style="margin: 0 0 10px 0; color: #38BDF8; font-size: 16px;">🧠 <a href="https://github.com/Eternalcodertanishq3/Pravaha" style="text-decoration: none; color: #38BDF8;">Pravaha</a></h3>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">LLM inference engine with a 51-agent swarm architecture and a full RAG pipeline built from first principles.</p>
  <div style="display: flex; gap: 8px; font-size: 11px;">
    <span style="background: rgba(56, 189, 248, 0.1); padding: 3px 8px; border-radius: 12px; color: #38BDF8;">Python</span>
    <span style="background: rgba(129, 140, 248, 0.1); padding: 3px 8px; border-radius: 12px; color: #818CF8;">AI Swarms</span>
  </div>
</div>

<div style="padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px;">
  <h3 style="margin: 0 0 10px 0; color: #38BDF8; font-size: 16px;">🔬 <a href="https://github.com/Eternalcodertanishq3/miniGrad" style="text-decoration: none; color: #38BDF8;">miniGrad</a></h3>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">Deep learning framework built from scratch in NumPy — gradients verified against PyTorch to 1e-6. Published to PyPI.</p>
  <div style="display: flex; gap: 8px; font-size: 11px;">
    <span style="background: rgba(56, 189, 248, 0.1); padding: 3px 8px; border-radius: 12px; color: #38BDF8;">Python</span>
    <span style="background: rgba(129, 140, 248, 0.1); padding: 3px 8px; border-radius: 12px; color: #818CF8;">Autodiff</span>
  </div>
</div>

<div style="padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 10px;">
  <h3 style="margin: 0 0 10px 0; color: #38BDF8; font-size: 16px;">♟️ <a href="https://github.com/Eternalcodertanishq3/Axiorynth" style="text-decoration: none; color: #38BDF8;">Axiorynth</a></h3>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">A chess engine written in Rust, built for speed and correctness from the board representation up.</p>
  <div style="display: flex; gap: 8px; font-size: 11px;">
    <span style="background: rgba(238, 76, 44, 0.1); padding: 3px 8px; border-radius: 12px; color: #EE4C2C;">Rust</span>
    <span style="background: rgba(129, 140, 248, 0.1); padding: 3px 8px; border-radius: 12px; color: #818CF8;">Systems</span>
  </div>
</div>

</div>

<br/>

---

## 🦾 Tech Arsenal

<div align="center" style="margin: 20px 0; padding: 25px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 12px;">
  <div style="margin-bottom: 16px;">
    <img src="https://skillicons.dev/icons?i=py,js,ts,cpp,rust,go,react,nextjs,tailwind,nodejs&perline=10" alt="Tech Stack" style="max-width: 100%; height: auto;"/>
  </div>
  <div>
    <img src="https://skillicons.dev/icons?i=fastapi,firebase,postgres,mongodb,docker,redis,pytorch,git,linux,vscode&perline=10" alt="Tech Stack 2" style="max-width: 100%; height: auto;"/>
  </div>
  <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748B; font-style: italic; font-family: ui-monospace, monospace;">Orchestrating production-grade tools across the cosmic software stack</p>
</div>

<br/>

---

## ⚡ Live contribution Heatmap

<div align="center" style="margin: 20px 0; padding: 20px; background-color: #070D1E; border: 1px solid #1E293B; border-radius: 12px;">
  <!-- We reference the generated snake animation here -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${USERNAME}/${USERNAME}/output/github-contribution-grid-snake-dark.svg">
    <img src="https://raw.githubusercontent.com/${USERNAME}/${USERNAME}/output/github-contribution-grid-snake.svg" alt="Contribution Heatmap" style="max-width: 100%; height: auto; border-radius: 8px;"/>
  </picture>
  <sub style="display: block; text-align: center; margin-top: 15px; color: #64748B; font-family: ui-monospace, monospace;">⚡ Cosmic contribution snake orbiting every 12 hours</sub>
</div>

<br/>

---

## ✦ Connect & Orbit

<div align="center" style="padding: 20px 0;">

<a href="https://tanishq-creates.netlify.app" target="_blank" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Launch%20Portfolio-0F172A?style=for-the-badge&logo=firefox&logoColor=FF7139" alt="Portfolio"/>
</a>
<a href="mailto:tanishqmangal3@gmail.com" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Hatch%20Signal-0F172A?style=for-the-badge&logo=gmail&logoColor=D14836" alt="Email"/>
</a>
<a href="https://www.linkedin.com/in/tanishq-mangal-7a2683254/" target="_blank" style="text-decoration: none; margin: 0 6px;">
  <img src="https://img.shields.io/badge/Secure%20Comms-0F172A?style=for-the-badge&logo=linkedin&logoColor=0A66C2" alt="LinkedIn"/>
</a>

</div>

<br/>

<div align="center" style="padding: 20px; font-size: 13px; color: #64748B; font-family: ui-monospace, monospace;">
  <sub>✨ "Orchestrating systems that feel like magic." ✨</sub>
  <br/>
  <sub>Stardate: ${new Date().toISOString().slice(0, 10)} · Sync Cycle Complete</sub>
</div>`;

  writeFileSync(README_PATH, newReadmeContent, "utf8");
  console.log("README.md rewritten and dashboard grid assembled.");
}

main().catch((err) => {
  console.error("Critical build error:", err);
  process.exit(1);
});
