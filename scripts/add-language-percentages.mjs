import fs from 'node:fs';

const file = 'profile-summary-card-output/github_dark/2-most-commit-language.svg';
const svg = fs.readFileSync(file, 'utf8');

// The summary-card action does not print percentages. Its donut geometry does,
// however, encode the exact share of every language. Read the outer arc of each
// slice and turn its sweep angle back into a percentage so the labels stay in
// sync with every scheduled refresh.
const arcPattern = /<path d="M([^,]+),([^A]+)A[^,]+,[^,]+,0,[01],1,([^,]+),([^L]+)L/g;
const percentages = [];

for (const match of svg.matchAll(arcPattern)) {
  const startX = Number(match[1]);
  const startY = Number(match[2]);
  const endX = Number(match[3]);
  const endY = Number(match[4]);

  let sweep = Math.atan2(endY, endX) - Math.atan2(startY, startX);
  while (sweep < 0) sweep += Math.PI * 2;
  percentages.push((sweep / (Math.PI * 2)) * 100);
}

if (percentages.length === 0) {
  throw new Error(`Could not read donut slices from ${file}`);
}

let index = 0;
const updated = svg.replace(
  /(<text x="16\.8"[^>]*>)([^<]+)(<\/text>)/g,
  (full, open, label, close) => {
    if (index >= percentages.length) return full;
    const cleanLabel = label.replace(/\s+·\s+\d+(?:\.\d+)?%$/, '');
    const percentage = percentages[index++].toFixed(1);
    return `${open}${cleanLabel} · ${percentage}%${close}`;
  },
);

if (index !== percentages.length) {
  throw new Error(`Found ${percentages.length} slices but only ${index} language labels in ${file}`);
}

fs.writeFileSync(file, updated);
console.log(`Added percentages to ${index} language labels`);
