require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME;

if (!TOKEN || !USERNAME) {
  console.error("Missing ENV variables");
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "User-Agent": "smc-api"
};

// 🔹 GraphQL: Commits (Current Year)
async function getCommits() {
  const currentYear = new Date().getFullYear();
  const query = {
    query: `
    {
      user(login: "${USERNAME}") {
        contributionsCollection(from: "${currentYear}-01-01T00:00:00Z", to: "${currentYear}-12-31T23:59:59Z") {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }`
  };

  const res = await axios.post(
    "https://api.github.com/graphql",
    query,
    { headers }
  );

  return res.data?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0;
}


async function getRepos() {
  const res = await axios.get(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100`,
    { headers }
  );
  return res.data || [];
}


async function getPRs() {
  const res = await axios.get(
    `https://api.github.com/search/issues?q=author:${USERNAME}+type:pr`,
    { headers }
  );

  return res.data?.total_count || 0;
}


async function getIssues() {
  const res = await axios.get(
    `https://api.github.com/search/issues?q=author:${USERNAME}+type:issue`,
    { headers }
  );

  return res.data?.total_count || 0;
}


app.get("/card", async (req, res) => {
  try {
    const repos = await getRepos();

    let stars = 0;
    let forks = 0;
    const orgs = new Set();

    repos.forEach(r => {
      stars += r.stargazers_count || 0;
      forks += r.forks_count || 0;

      if (r.owner?.login && r.owner.login !== USERNAME) {
        orgs.add(r.owner.login);
      }
    });

    const commits = await getCommits();
    const prs = await getPRs();
    const issues = await getIssues();
    const currentYear = new Date().getFullYear();

    const svg = `
    <svg width="600" height="340" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0D1117;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#161B22;stop-opacity:1" />
        </linearGradient>

        <symbol id="icon-star" viewBox="0 0 16 16">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 11.997l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
        </symbol>

        <symbol id="icon-clock" viewBox="0 0 16 16">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.75.75 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
        </symbol>

        <symbol id="icon-pr" viewBox="0 0 16 16">
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/>
        </symbol>

        <symbol id="icon-issue" viewBox="0 0 16 16">
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>
        </symbol>

        <symbol id="icon-contrib" viewBox="0 0 16 16">
          <path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.457 1.457 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.457 1.457 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 1 1 1.06-1.06l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25v-5.5Z"/>
        </symbol>
      </defs>

      <style>
        .title { font: 700 28px 'Segoe UI', sans-serif; fill: #58A6FF; }
        .label { font: 700 20px 'Segoe UI', sans-serif; fill: #79C0FF; }
        .value { font: 600 20px 'Segoe UI', sans-serif; fill: #79C0FF; }
        .bg { fill: url(#bgGradient); }
        .icon { fill: #d000ffff; }
      </style>

      <rect width="100%" height="100%" class="bg" rx="16"/>
      <rect width="100%" height="100%" class="bg" rx="16" fill="none" stroke="#30363D" stroke-width="2"/>

      <!-- Title -->
      <text x="30" y="55" class="title">Siratim Mustakim Chowdhury's GitHub Stats</text>

      <!-- Stats Section -->
      <g>
        <!-- Total Stars -->
        <g transform="translate(30, 80)">
          <use href="#icon-star" x="0" y="0" width="18" height="18" class="icon"/>
          <text x="28" y="14" class="label">Total Stars:</text>
          <text x="270" y="14" class="value">${stars}</text>
        </g>

        <!-- Total Commits -->
        <g transform="translate(30, 130)">
          <use href="#icon-clock" x="0" y="0" width="18" height="18" class="icon"/>
          <text x="28" y="14" class="label">Total Commits (${currentYear}):</text>
          <text x="270" y="14" class="value">${commits}</text>
        </g>

        <!-- Total PRs -->
        <g transform="translate(30, 180)">
          <use href="#icon-pr" x="0" y="0" width="18" height="18" class="icon"/>
          <text x="28" y="14" class="label">Total PRs:</text>
          <text x="270" y="14" class="value">${prs}</text>
        </g>

        <!-- Total Issues -->
        <g transform="translate(30, 230)">
          <use href="#icon-issue" x="0" y="0" width="18" height="18" class="icon"/>
          <text x="28" y="14" class="label">Total Issues:</text>
          <text x="270" y="14" class="value">${issues}</text>
        </g>

        <!-- Contributed to -->
        <g transform="translate(30, 280)">
          <use href="#icon-contrib" x="0" y="0" width="18" height="18" class="icon"/>
          <text x="28" y="14" class="label">Contributed to:</text>
          <text x="270" y="14" class="value">${orgs.size}</text>
        </g>
      </g>
    </svg>
    `;



    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=0");
    res.send(svg);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("SMC API Error");
  }
});


app.get("/", (req, res) => {
  res.json({ status: "SMC API Running 🚀" });
});

app.get("/debug", (req, res) => {
  res.json({
    token: TOKEN ? "✅ Set" : "❌ Missing",
    username: USERNAME ? `✅ ${USERNAME}` : "❌ Missing",
    env: process.env.NODE_ENV
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SMC API running on ${PORT}`);
});