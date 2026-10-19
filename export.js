const status = document.querySelector('#status');
let saved;
try { saved = JSON.parse(localStorage.getItem('tierlist-v1')); } catch {}
saved ||= { title: 'My tier list', tiers: [], items: [] };
const tiers = (saved.tiers || []).map(tier => typeof tier === 'string' ? { id: tier, label: tier } : tier);
const sheet = document.querySelector('#image-sheet');

function createTile(item) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  if (item.image) {
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = '';
    tile.append(img);
  }
  const shade = document.createElement('span');
  shade.className = 'shade';
  const points = document.createElement('span');
  points.className = 'points';
  points.textContent = item.points || '—';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = item.name || 'Untitled';
  tile.append(shade, points, name);
  return tile;
}

const heading = document.createElement('h1');
heading.textContent = saved.title || 'My tier list';
sheet.append(heading);
tiers.forEach((tier, index) => {
  const row = document.createElement('section');
  row.className = 'tier-row';
  const label = document.createElement('div');
  label.className = `tier-label color-${index % 5}`;
  label.textContent = tier.label;
  const content = document.createElement('div');
  content.className = 'tier-content';
  saved.items.filter(item => item.tier === tier.id || item.tier === tier.label).forEach(item => content.append(createTile(item)));
  row.append(label, content);
  sheet.append(row);
});
const unranked = saved.items.filter(item => !item.tier || !tiers.some(tier => tier.id === item.tier || tier.label === item.tier));
if (unranked.length) {
  const label = document.createElement('h2');
  label.textContent = 'Unranked';
  const row = document.createElement('div');
  row.className = 'unranked';
  unranked.forEach(item => row.append(createTile(item)));
  sheet.append(label, row);
}

async function makePng() {
  status.textContent = 'Preparing PNG…';
  try {
    await Promise.all([...sheet.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
    const canvas = await window.html2canvas(sheet, { scale: 2, backgroundColor: '#fffdf9', useCORS: true, logging: false });
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create PNG')), 'image/png'));
    return blob;
  } catch (error) {
    console.error('PNG export failed:', error);
    status.textContent = 'Could not make the PNG. Try again.';
    throw error;
  }
}

document.querySelector('#download-button').addEventListener('click', async () => {
  try {
    const blob = await makePng();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(saved.title || 'tier-list').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'tier-list'}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
    status.textContent = 'PNG downloaded';
  } catch {}
});

document.querySelector('#copy-button').addEventListener('click', async () => {
  try {
    const blob = await makePng();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    status.textContent = 'PNG copied to clipboard';
  } catch (error) {
    if (error?.name === 'NotAllowedError') status.textContent = 'Clipboard access was blocked by the browser.';
  }
});
