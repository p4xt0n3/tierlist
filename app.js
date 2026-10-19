const STORAGE_KEY = 'tierlist-v1';
const board = document.querySelector('#board');
const pool = document.querySelector('#pool');
const title = document.querySelector('#list-title');
const input = document.querySelector('#item-input');
const pointInput = document.querySelector('#point-input');
const imageInput = document.querySelector('#image-input');
const formStatus = document.querySelector('#form-status');
const uploadLabel = document.querySelector('.upload-button span');
let state = { title: 'My tier list', tiers: ['S', 'A', 'B', 'C', 'D'].map(label => ({ id: label, label })), items: [] };
let draggedId = null;
let draggedTierId = null;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && Array.isArray(saved.items)) {
    state = { ...state, ...saved };
    if (!Array.isArray(state.tiers)) state.tiers = ['S', 'A', 'B', 'C', 'D'].map(label => ({ id: label, label }));
    state.tiers = state.tiers.map(tier => typeof tier === 'string' ? ({ id: tier, label: tier }) : tier);
    state.items.forEach(item => { if (item.tier && !state.tiers.some(tier => tier.id === item.tier)) item.tier = state.tiers.find(tier => tier.label === item.tier)?.id || null; });
  }
} catch {}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.querySelector('#saved-status');
  status.textContent = 'Saved on this device';
}

async function imageDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error('Could not read the pasted image.')),
    'image/webp', 0.8
  ));
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not save the pasted image.'));
    reader.readAsDataURL(blob);
  });
}

function render() {
  title.textContent = state.title || 'My tier list';
  board.replaceChildren();
  state.tiers.forEach((tier, index) => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.dataset.tier = tier.id;
    const label = document.createElement('div');
    label.className = `tier-label tier-color-${index % 5}`;
    label.textContent = tier.label;
    label.draggable = true;
    label.title = 'Drag to reorder · double click to rename';
    label.addEventListener('dblclick', () => {
      const next = window.prompt('Tier name', tier.label)?.trim();
      if (next) { tier.label = next.slice(0, 18); save(); render(); }
    });
    const zone = document.createElement('div');
    zone.className = 'tier-content';
    zone.dataset.dropzone = tier.id;
    const remove = document.createElement('button');
    remove.className = 'remove-tier';
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = `Remove ${tier.label} tier`;
    remove.setAttribute('aria-label', `Remove ${tier.label} tier`);
    remove.addEventListener('click', () => {
      state.items.forEach(item => { if (item.tier === tier.id) item.tier = null; });
      state.tiers = state.tiers.filter(entry => entry.id !== tier.id);
      save(); render();
    });
    row.append(label, zone, remove);
    label.addEventListener('dragstart', event => {
      draggedTierId = tier.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-tier-id', tier.id);
      row.classList.add('is-tier-dragging');
    });
    label.addEventListener('dragend', () => {
      draggedTierId = null;
      document.querySelectorAll('.tier-insert-before,.tier-insert-after,.is-tier-dragging').forEach(node => node.classList.remove('tier-insert-before', 'tier-insert-after', 'is-tier-dragging'));
    });
    row.addEventListener('dragover', event => {
      if (!draggedTierId || row.dataset.tier === draggedTierId) return;
      event.preventDefault();
      document.querySelectorAll('.tier-insert-before,.tier-insert-after').forEach(node => node.classList.remove('tier-insert-before', 'tier-insert-after'));
      row.classList.add(event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2 ? 'tier-insert-before' : 'tier-insert-after');
    });
    row.addEventListener('drop', event => {
      if (!draggedTierId) return;
      event.preventDefault();
      event.stopPropagation();
      if (row.dataset.tier !== draggedTierId) {
        const moving = state.tiers.find(entry => entry.id === draggedTierId);
        state.tiers = state.tiers.filter(entry => entry.id !== draggedTierId);
        const targetIndex = state.tiers.findIndex(entry => entry.id === row.dataset.tier);
        const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
        state.tiers.splice(targetIndex + (before ? 0 : 1), 0, moving);
        save();
        render();
      }
      draggedTierId = null;
    });
    board.append(row);
  });
  pool.replaceChildren();
  state.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item';
    card.draggable = true;
    card.dataset.id = item.id;
    card.title = 'Double click to remove';
    if (item.image) {
      const image = document.createElement('img');
      image.className = 'item-image';
      image.src = item.image;
      image.alt = '';
      card.append(image);
      const shade = document.createElement('span');
      shade.className = 'image-shade';
      card.append(shade);
      const point = document.createElement('span');
      point.className = 'item-point';
      point.textContent = item.points;
      card.append(point);
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      card.append(name);
    } else {
      card.classList.add('text-item');
      card.textContent = item.name;
    }
    card.addEventListener('dragstart', event => {
      draggedId = item.id;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.id);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.drop-before,.drop-after').forEach(node => node.classList.remove('drop-before', 'drop-after'));
      draggedId = null;
    });
    card.addEventListener('dblclick', () => {
      state.items = state.items.filter(entry => entry.id !== item.id);
      save(); render();
    });
    const zone = item.tier ? board.querySelector(`[data-dropzone="${CSS.escape(item.tier)}"]`) : pool;
    zone?.append(card);
  });
  document.querySelector('#pool-count').textContent = `${state.items.filter(item => !item.tier).length} items`;
  wireDropzones();
}

function wireDropzones() {
document.querySelectorAll('[data-dropzone]').forEach(zone => {
  if (zone.dataset.dropWired) return;
  zone.dataset.dropWired = 'true';
  zone.addEventListener('dragover', event => {
    if (draggedTierId) return;
    event.preventDefault();
    zone.classList.add('is-over');
    document.querySelectorAll('.drop-before,.drop-after').forEach(node => node.classList.remove('drop-before', 'drop-after'));
    const targetCard = event.target.closest('.item');
    if (!targetCard || !zone.contains(targetCard) || targetCard.dataset.id === draggedId) return;
    const rect = targetCard.getBoundingClientRect();
    const before = event.clientY < rect.top + 12 ? true : event.clientY > rect.bottom - 12 ? false : event.clientX < rect.left + rect.width / 2;
    targetCard.classList.add(before ? 'drop-before' : 'drop-after');
  });
  zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-over'); });
  zone.addEventListener('drop', event => {
    if (draggedTierId) return;
    event.preventDefault(); zone.classList.remove('is-over');
    const id = event.dataTransfer.getData('text/plain') || draggedId;
    const item = state.items.find(entry => entry.id === id);
    if (!item) return;
    const targetCard = event.target.closest('.item');
    const targetItem = targetCard && targetCard.dataset.id !== id
      ? state.items.find(entry => entry.id === targetCard.dataset.id)
      : null;
    const destination = zone.dataset.dropzone === 'pool' ? null : zone.dataset.dropzone;
    state.items = state.items.filter(entry => entry.id !== id);
    item.tier = destination;
    let insertAt;
    if (targetItem) {
      const targetIndex = state.items.findIndex(entry => entry.id === targetItem.id);
      const rect = targetCard.getBoundingClientRect();
      const before = event.clientY < rect.top + 12 ? true : event.clientY > rect.bottom - 12 ? false : event.clientX < rect.left + rect.width / 2;
      insertAt = targetIndex + (before ? 0 : 1);
    } else {
      let lastInTier = -1;
      state.items.forEach((entry, index) => { if (entry.tier === destination) lastInTier = index; });
      insertAt = lastInTier < 0 ? state.items.length : lastInTier + 1;
    }
    state.items.splice(insertAt, 0, item);
    save(); render();
  });
});
}

document.querySelector('#add-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = input.value.trim();
  const points = pointInput.value.trim();
  const file = imageInput.files[0];
  if (!file || !name || !points) return;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  formStatus.textContent = 'Adding image…';
  try {
    const image = await imageDataUrl(file);
    state.items.push({ id: crypto.randomUUID(), name, points, image, tier: null });
    input.value = '';
    pointInput.value = '';
    imageInput.value = '';
    formStatus.textContent = '';
    save(); render();
  } catch (error) {
    console.error('Image upload failed:', error);
    formStatus.textContent = error?.message || 'Could not add image. Try again.';
  } finally {
    submit.disabled = false;
  }
});

imageInput.addEventListener('change', () => {
  uploadLabel.textContent = imageInput.files[0]?.name || 'Choose image';
});

document.querySelector('#add-tier-button').addEventListener('click', () => {
  const label = window.prompt('Name your tier')?.trim();
  if (!label) return;
  state.tiers.push({ id: crypto.randomUUID(), label: label.slice(0, 18) });
  save(); render();
});

document.querySelector('#export-button').addEventListener('click', () => {
  window.open('export.html', '_blank', 'noopener');
});

document.querySelector('#export-config-button').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(state.title || 'tier-list').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'tier-list'}-config.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector('#import-config-button').addEventListener('click', () => {
  document.querySelector('#config-file').click();
});

document.querySelector('#config-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.querySelector('#saved-status');
  try {
    const imported = JSON.parse(await file.text());
    if (!imported || typeof imported !== 'object' || !Array.isArray(imported.items) || !Array.isArray(imported.tiers)) {
      throw new Error('That file is not a tier list config.');
    }
    const tiers = imported.tiers.map((tier, index) => {
      if (typeof tier === 'string') return { id: tier, label: tier };
      if (!tier || typeof tier !== 'object') throw new Error('A tier in this config is invalid.');
      const label = String(tier.label || '').trim().slice(0, 18);
      return { id: String(tier.id || `tier-${index}`), label: label || `Tier ${index + 1}` };
    });
    const tierIds = new Set(tiers.map(tier => tier.id));
    const tierLabels = new Map(tiers.map(tier => [tier.label, tier.id]));
    const items = imported.items.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('An item in this config is invalid.');
      const image = typeof item.image === 'string' && /^(https:\/\/|data:image\/)/i.test(item.image) ? item.image : '';
      const requestedTier = item.tier == null ? null : String(item.tier);
      return {
        id: String(item.id || `item-${index}-${crypto.randomUUID()}`),
        name: String(item.name || 'Untitled').slice(0, 48),
        points: String(item.points || ''),
        image,
        tier: requestedTier && (tierIds.has(requestedTier) || tierLabels.has(requestedTier))
          ? (tierIds.has(requestedTier) ? requestedTier : tierLabels.get(requestedTier))
          : null
      };
    });
    state = { title: String(imported.title || 'My tier list').slice(0, 48), tiers, items };
    save();
    render();
    status.textContent = 'Config imported';
  } catch (error) {
    status.textContent = error?.message || 'Could not import this config.';
  } finally {
    event.target.value = '';
    window.setTimeout(() => { status.textContent = 'Saved on this device'; }, 3500);
  }
});

document.addEventListener('paste', async event => {
  const clipboardItem = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'));
  const clipboardFile = clipboardItem?.getAsFile();
  if (!clipboardFile) return;
  event.preventDefault();
  const status = document.querySelector('#paste-note');
  status.textContent = 'Adding pasted image…';
  try {
    if (!clipboardFile.size) throw new Error('The clipboard image is empty. Copy the image again and paste it.');
    const image = await imageDataUrl(clipboardFile);
    const name = clipboardFile.name?.replace(/\.[^.]+$/, '').trim() || `Pasted image ${state.items.length + 1}`;
    const newItem = { id: crypto.randomUUID(), name: name.slice(0, 48), points: '0', image, tier: null };
    state.items.push(newItem);
    try {
      save();
    } catch (error) {
      state.items = state.items.filter(item => item.id !== newItem.id);
      throw error;
    }
    render();
  } catch (error) {
    console.error('Clipboard image upload failed:', error);
    status.textContent = error?.message || 'Paste upload failed. Try again.';
  }
  if (status.textContent === 'Adding pasted image…') window.setTimeout(() => { status.textContent = 'Drag images into a tier · Ctrl+V to paste'; }, 3000);
});

title.addEventListener('input', () => { state.title = title.textContent.trim().slice(0, 48) || 'My tier list'; save(); });
title.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); title.blur(); } });
document.querySelector('#reset-button').addEventListener('click', () => {
  state = { title: 'My tier list', tiers: ['S', 'A', 'B', 'C', 'D'].map(label => ({ id: label, label })), items: [] };
  save(); render();
});
render();
