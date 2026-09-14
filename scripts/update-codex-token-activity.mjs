#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage/daily-token-usage-breakdown';
const DAY = 86_400_000;
const DAYS_TO_SHOW = 60;
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
  const width = 430;
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
  let peak = 0;
  let activeDays = 0;
  let previousMonth = null;

  for (const [date, raw] of Object.entries(days)) {
    if (date < visibleStart || date > today) continue;
    const value = Number(raw) || 0;
    peak = Math.max(peak, value);
    if (value > 0) activeDays += 1;
  }

  for (let i = 0; i < cols * rows; i += 1) {
    const date = new Date(start.getTime() + i * DAY);
    const key = iso(date);
    const value = key >= visibleStart && key <= today ? Number(days[key] || 0) : 0;
    const column = Math.floor(i / rows);
    const row = i % rows;
    const x = x0 + column * (cell + gap);
    const y = y0 + row * (cell + gap);

    if (key >= visibleStart && key <= today) {
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Codex Token Activity">
<style>
.bg{fill:#fff}.title{fill:#24292f;font:600 16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sub,.month{fill:#6e7781;font:11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.d{stroke:rgba(27,31,36,.05);stroke-width:1}.l0{fill:#f3f4f6}.l1{fill:#dbeafe}.l2{fill:#bfdbfe}.l3{fill:#93c5fd}.l4{fill:#60a5fa}.l5{fill:#2563eb}
@media(prefers-color-scheme:dark){.bg{fill:#0d1117}.title{fill:#e6edf3}.sub,.month{fill:#8b949e}.d{stroke:rgba(240,246,252,.05)}.l0{fill:#21262d}.l1{fill:#0c2d6b}.l2{fill:#1158c7}.l3{fill:#1f6feb}.l4{fill:#388bfd}.l5{fill:#58a6ff}}
</style>
<rect class="bg" width="${width}" height="${height}" rx="14"/>
<text class="title" x="24" y="28">Codex Token Activity</text>
<text class="sub" x="24" y="44">last ${DAYS_TO_SHOW} days · peak ${peak.toFixed(1)}% · active ${activeDays}d</text>
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
