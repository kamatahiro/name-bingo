// ─── 状態管理 ────────────────────────────────────────────────
const state = {
  playerName: '',
  cells: Array.from({ length: 9 }, () => ({ name: '', hobby: '' })),
  marked: Array(9).fill(false),
};

// ─── ビンゴ判定ライン (縦3・横3・斜め2) ─────────────────────
const BINGO_LINES = [
  [0, 1, 2], // 1行目
  [3, 4, 5], // 2行目
  [6, 7, 8], // 3行目
  [0, 3, 6], // 1列目
  [1, 4, 7], // 2列目
  [2, 5, 8], // 3列目
  [0, 4, 8], // 左上→右下
  [2, 4, 6], // 右上→左下
];

// ─── 画面切り替え ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ─── 画面1: 名前登録 → 画面2 ──────────────────────────────────
document.getElementById('btn-to-card').addEventListener('click', goToCardInput);
document.getElementById('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') goToCardInput();
});

function goToCardInput() {
  const input = document.getElementById('player-name');
  const error = document.getElementById('error-register');
  const name = input.value.trim();

  if (!name) {
    error.classList.remove('hidden');
    input.focus();
    return;
  }

  error.classList.add('hidden');
  state.playerName = name;
  buildInputScreen();
  showScreen('screen-input');
}

// ─── 画面2: カード入力欄を生成 ────────────────────────────────
function buildInputScreen() {
  document.getElementById('input-subtitle').textContent =
    `${state.playerName} さんのカード — 交流した9人を入力`;

  const list = document.getElementById('cell-list');
  list.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const div = document.createElement('div');
    div.className = 'cell-card';
    div.innerHTML = `
      <div class="cell-number">${i + 1}</div>
      <input class="cell-input" type="text" placeholder="名前"
             maxlength="10" data-index="${i}" data-type="name">
      <input class="cell-input" type="text" placeholder="趣味（任意）"
             maxlength="15" data-index="${i}" data-type="hobby">
    `;
    list.appendChild(div);
  }

  // 入力値を state に同期
  list.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', e => {
      const idx = Number(e.target.dataset.index);
      const type = e.target.dataset.type;
      state.cells[idx][type] = e.target.value;
    });
  });
}

// ─── 画面2 → 画面3 ────────────────────────────────────────────
document.getElementById('btn-to-game').addEventListener('click', () => {
  const error = document.getElementById('error-input');
  const allFilled = state.cells.every(c => c.name.trim() !== '');

  if (!allFilled) {
    error.classList.remove('hidden');
    return;
  }

  error.classList.add('hidden');
  state.marked = Array(9).fill(false);
  buildGameScreen();
  showScreen('screen-game');
});

// ─── 画面3: ゲーム画面を生成 ───────────────────────────────────
function buildGameScreen() {
  // カードのマスをシャッフル (Fisher-Yates)
  for (let i = state.cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.cells[i], state.cells[j]] = [state.cells[j], state.cells[i]];
  }

  document.getElementById('player-badge').textContent =
    `👤 ${state.playerName}`;

  const grid = document.getElementById('bingo-card');
  grid.innerHTML = '';

  state.cells.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'bingo-cell';
    div.dataset.index = i;
    div.innerHTML = `
      <span class="cell-name">${escapeHtml(cell.name.trim())}</span>
      <span class="cell-hobby">${escapeHtml(cell.hobby.trim() || '—')}</span>
    `;
    div.addEventListener('click', () => toggleCell(i));
    grid.appendChild(div);
  });

  document.getElementById('bingo-message').classList.add('hidden');
  updateBingoCount();
}

// ─── マスのON/OFF切り替え ──────────────────────────────────────
function toggleCell(index) {
  state.marked[index] = !state.marked[index];

  const cell = document.querySelector(`.bingo-cell[data-index="${index}"]`);
  cell.classList.toggle('marked', state.marked[index]);

  updateBingoCount();
  updateStatus();
}

// ─── ビンゴ数を更新 ────────────────────────────────────────────
function updateBingoCount() {
  const count = BINGO_LINES.filter(
    line => line.every(i => state.marked[i])
  ).length;
  document.getElementById('bingo-count').textContent = `ビンゴ: ${count} 列`;
}

// ─── ビンゴ／リーチ判定 ────────────────────────────────────────
function updateStatus() {
  const hasBingo = BINGO_LINES.some(
    line => line.every(i => state.marked[i])
  );

  // リーチ: 2マスが開いていて、残り1マスが未開放
  const hasReach = BINGO_LINES.some(line => {
    const markedCount   = line.filter(i =>  state.marked[i]).length;
    const unmarkedCount = line.filter(i => !state.marked[i]).length;
    return markedCount === 2 && unmarkedCount === 1;
  });

  const msg = document.getElementById('bingo-message');
  const txt = msg.querySelector('.bingo-text');

  if (hasBingo) {
    txt.textContent = 'BINGO!';
    msg.className = 'bingo-message';
    msg.classList.remove('hidden');
  } else if (hasReach) {
    txt.textContent = 'リーチ！';
    msg.className = 'bingo-message reach';
    msg.classList.remove('hidden');
  } else {
    msg.classList.add('hidden');
  }
}

// ─── リセット ──────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  state.playerName = '';
  state.cells = Array.from({ length: 9 }, () => ({ name: '', hobby: '' }));
  state.marked = Array(9).fill(false);
  document.getElementById('player-name').value = '';
  showScreen('screen-register');
});

// ─── XSS対策: HTML特殊文字をエスケープ ──────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
