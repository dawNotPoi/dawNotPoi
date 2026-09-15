#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage/daily-token-usage-breakdown';
const DAY = 86_400_000;
const DAYS_TO_SHOW = 60;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OUTPUT = resolve('assets/codex-token-activity.svg');
const AUTH = resolve(homedir(), '.codex/auth.json');

const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (value, days) => new Date(new Date(`${value}T00:00:00Z`).getTime() + days * DAY);

async function loadAuth() {
  const raw = JSON.parse(await readFile(AUTH, 'utf8'));
  const accessToken = raw?.tokens?.access_token;
  const accountId = raw?.tokens?.account_id;
  if (!accessToken || !accountId) throw new Error(`Missing Codex credentials in ${AUTH}`);
  return { accessToken, accountId };
}

async function fetchRange(start, end, auth) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date', end);
  url.searchParams.set('group_by', 'day');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'ChatGPT-Account-ID': auth.accountId,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Codex usage request failed: HTTP ${response.status}`);
  return response.json();
}

function level(value) {
  if (value <= 0) return 0;
  if (value <= 20) return 1;
  if (value <= 40) return 2;
  if (value <= 60) return 3;
  if (value <= 80) return 4;
  return 5;
}

function render(days, today) {
  const width = 266;
  const height = 230;
  const cols = 9;
  const rows = 7;
  const cell = 18;
  const gap = 5;
  const x0 = 32;
  const y0 = 58;
  const end = addDays(today, 6 - new Date(`${today}T00:00:00Z`).getUTCDay());
  const start = new Date(end.getTime() - (cols * rows - 1) * DAY);
  const visibleStart = iso(addDays(today, -(DAYS_TO_SHOW - 1)));
  const cells = [];
  const monthLabels = [];
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  let peak = 0;
  let peakDate = '';
  let activeDays = 0;
  let heavyDays = 0;
  let shownDays = 0;
  let total = 0;
  let previousMonth = null;

  for (let i = 0; i < cols * rows; i += 1) {
    const date = new Date(start.getTime() + i * DAY);
    const key = iso(date);
    const value = key >= visibleStart && key <= today ? Number(days[key] || 0) : 0;
    const column = Math.floor(i / rows);
    const row = i % rows;
    const x = x0 + column * (cell + gap);
    const y = y0 + row * (cell + gap);

    if (key >= visibleStart && key <= today) {
      // 统计只覆盖实际显示的格子, 与图面一致
      shownDays += 1;
      total += value;
      if (value > peak) {
        peak = value;
        peakDate = key;
      }
      if (value > 0) activeDays += 1;
      if (value >= 50) heavyDays += 1;
      weekdayTotals[date.getUTCDay()] += value;

      const month = date.getUTCMonth();
      if (month !== previousMonth && date.getUTCDate() <= 7) {
        monthLabels.push(
          `<text class="month" x="${x}" y="218">${date.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</text>`,
        );
        previousMonth = month;
      }
    }

    cells.push(
      `<rect class="d l${level(value)}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4"><title>${key}: ${value.toFixed(1)}%</title></rect>`,
    );
  }

  const avg = shownDays ? total / shownDays : 0;
  const busiestDay = WEEKDAYS[weekdayTotals.indexOf(Math.max(...weekdayTotals))];
  const tickerItems = [
    `peak · ${peak.toFixed(0)}% · ${peakDate.slice(5)}`,
    `avg · ${avg.toFixed(1)}% per day`,
    `busiest · ${busiestDay}`,
    `active · ${activeDays} of ${shownDays}d`,
    `${heavyDays} days over 50%`,
  ];
  const ticker = tickerItems.map((t, i) => `<text class="tk t${i}" x="78" y="44">${t}</text>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Codex Token Activity">
<style>
.bg{fill:#0d1117;stroke:#2e343b;stroke-width:1}.title{fill:#e6edf3;font:600 18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sub,.month{fill:#8b949e;font:11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.d{stroke:rgba(240,246,252,.05);stroke-width:1;transition:stroke .12s,filter .12s,transform .12s}.d:hover{stroke:#fff;stroke-width:2;filter:brightness(1.4);transform:scale(1.18);transform-box:fill-box;transform-origin:center}.l0{fill:#21262d}.l1{fill:#0c2d6b}.l2{fill:#1158c7}.l3{fill:#1f6feb}.l4{fill:#388bfd}.l5{fill:#58a6ff}
.tk{fill:#58a6ff;font:600 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;animation:tkf ${tickerItems.length * 3}s infinite}
.t0{animation:tkf0 15s infinite}${tickerItems.slice(1).map((_, i) => `.t${i + 1}{animation-delay:${(i + 1) * 3}s}`).join('')}
@keyframes tkf{0%{opacity:0}1.5%{opacity:1}18.5%{opacity:1}20%{opacity:0}100%{opacity:0}}
@keyframes tkf0{0%{opacity:1}15%{opacity:1}17%{opacity:0}100%{opacity:0}}
</style>
<rect class="bg" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="5"/>
<text class="title" x="24" y="28">Codex Token Activity</text>
<text class="sub" x="24" y="44">${DAYS_TO_SHOW} days</text>
${ticker}
${cells.join('\n')}
${monthLabels.join('\n')}
</svg>`;
}

async function main() {
  const auth = await loadAuth();
  const today = iso(new Date());
  const first = iso(addDays(today, -(DAYS_TO_SHOW - 1)));
  const days = {};
  let cursor = first;

  while (cursor <= today) {
    const chunkEndCandidate = iso(addDays(cursor, 29));
    const chunkEnd = chunkEndCandidate < today ? chunkEndCandidate : today;
    const payload = await fetchRange(cursor, chunkEnd, auth);
    for (const row of payload?.data ?? []) {
      const total = (row.models ?? []).reduce((sum, model) => sum + (Number(model.credits) || 0), 0);
      days[row.date] = Math.max(0, Math.min(100, total));
    }
    cursor = iso(addDays(chunkEnd, 1));
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, render(days, today), 'utf8');
  console.log(`Updated ${OUTPUT} with ${DAYS_TO_SHOW} days of Codex activity`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
