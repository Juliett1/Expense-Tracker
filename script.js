(function() {
  const STORAGE_KEY = 'spendly_expenses';

  const createForm   = document.getElementById('createForm');
  const catInput     = document.getElementById('catInput');
  const createError  = document.getElementById('createError');
  const listEl       = document.getElementById('expenseList');
  const emptyState   = document.getElementById('emptyState');
  const countEl      = document.getElementById('expenseCount');
  const totalEl      = document.getElementById('totalDisplay');
  const clearBtn     = document.getElementById('clearAllBtn');

  let expenses = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) expenses = JSON.parse(raw);
    } catch (_) {}
  }

  function migrate() {
    if (expenses.length === 0) {
      try {
        const old = localStorage.getItem('nairatrack_expenses');
        if (old) {
          const parsed = JSON.parse(old);
          if (Array.isArray(parsed) && parsed.length > 0) {
            expenses = parsed.map(e => ({
              ...e,
              items: e.items || []
            }));
            localStorage.removeItem('nairatrack_expenses');
            save();
          }
        }
      } catch (_) {}
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function formatNaira(amount) {
    return Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  const DOT_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#f97316', '#10b981'
  ];

  function getDot(index) {
    return DOT_COLORS[index % DOT_COLORS.length];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function totalItems(exp) {
    return exp.items.length;
  }

  function checkedItems(exp) {
    return exp.items.filter(i => i.checked).length;
  }

  function grandTotal() {
    let sum = 0;
    for (const exp of expenses) {
      for (const item of exp.items) {
        sum += item.amount;
      }
    }
    return sum;
  }

  function render() {
    const cards = listEl.querySelectorAll('.expense-card');
    cards.forEach(el => el.remove());

    if (expenses.length === 0) {
      emptyState.style.display = 'block';
      countEl.textContent = '0';
      totalEl.textContent = '0.00';
      clearBtn.disabled = true;
      return;
    }

    emptyState.style.display = 'none';
    countEl.textContent = expenses.length;
    clearBtn.disabled = false;
    totalEl.textContent = formatNaira(grandTotal());

    const fragment = document.createDocumentFragment();
    const reversed = [...expenses].reverse();

    reversed.forEach((exp, idx) => {
      fragment.appendChild(renderCard(exp, idx));
    });

    listEl.appendChild(fragment);
  }

  function renderCard(exp, idx) {
    const card = document.createElement('div');
    card.className = 'expense-card';
    card.dataset.id = exp.id;

    const t = totalItems(exp);
    const c = checkedItems(exp);
    const expTotal = exp.items.reduce((s, i) => s + i.amount, 0);
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    const allDone = t > 0 && c === t;

    const header = document.createElement('div');
    header.className = 'card-header';

    const dot = document.createElement('span');
    dot.className = 'card-dot';
    dot.style.background = getDot(idx);

    const info = document.createElement('div');
    info.className = 'card-info';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'card-name';
    nameSpan.textContent = exp.name;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    if (t === 0) {
      meta.textContent = 'No items';
    } else if (allDone) {
      meta.innerHTML = '<span class="meta-done">&#10003; All done</span>';
    } else {
      meta.textContent = c + '/' + t + ' done';
    }

    info.appendChild(nameSpan);
    info.appendChild(meta);

    const totalSpan = document.createElement('span');
    totalSpan.className = 'card-total';
    totalSpan.textContent = '\u20A6' + formatNaira(expTotal);

    const chevron = document.createElement('span');
    chevron.className = 'card-chevron';
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    const delBtn = document.createElement('button');
    delBtn.className = 'card-del-btn';
    delBtn.setAttribute('aria-label', 'Delete ' + exp.name);
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

    header.appendChild(dot);
    header.appendChild(info);
    header.appendChild(totalSpan);
    header.appendChild(chevron);
    header.appendChild(delBtn);

    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'card-body-wrap';

    const body = document.createElement('div');
    body.className = 'card-body';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = pct + '%';
    progressTrack.appendChild(progressFill);
    body.appendChild(progressTrack);

    const itemList = document.createElement('ul');
    itemList.className = 'item-list';

    if (t === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'item-empty';
      emptyItem.innerHTML = '<span>&#128221;</span>No items yet. Add one below.';
      itemList.appendChild(emptyItem);
    } else {
      for (const item of exp.items) {
        itemList.appendChild(renderItemRow(exp.id, item));
      }
    }

    body.appendChild(itemList);

    const addForm = document.createElement('form');
    addForm.className = 'add-item-form';
    addForm.dataset.expId = exp.id;

    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.className = 'item-name-input';
    nameIn.placeholder = 'Item name';
    nameIn.autocomplete = 'off';
    nameIn.maxLength = '50';

    const amtIn = document.createElement('input');
    amtIn.type = 'text';
    amtIn.className = 'item-amount-input';
    amtIn.placeholder = '\u20A6 0';
    amtIn.inputMode = 'decimal';
    amtIn.autocomplete = 'off';

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'btn-add-item';
    addBtn.setAttribute('aria-label', 'Add item');
    addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    addForm.appendChild(nameIn);
    addForm.appendChild(amtIn);
    addForm.appendChild(addBtn);
    body.appendChild(addForm);

    bodyWrap.appendChild(body);
    card.appendChild(header);
    card.appendChild(bodyWrap);

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteExpense(exp.id);
    });

    header.addEventListener('click', (e) => {
      if (e.target.closest('.card-del-btn')) return;
      toggleExpand(exp.id);
    });

    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = nameIn.value.trim();
      const raw = amtIn.value.replace(/,/g, '');
      const a = parseFloat(raw);
      if (!n) return;
      if (isNaN(a) || a <= 0) return;
      addItem(exp.id, n, a);
      nameIn.value = '';
      amtIn.value = '';
      nameIn.focus();
      const ew = card.querySelector('.card-body-wrap');
      if (!ew.classList.contains('open')) {
        toggleExpand(exp.id);
      }
    });

    amtIn.addEventListener('input', () => {
      amtIn.value = amtIn.value.replace(/[^0-9.]/g, '');
      const parts = amtIn.value.split('.');
      if (parts.length > 2) {
        amtIn.value = parts[0] + '.' + parts.slice(1).join('');
      }
    });

    return card;
  }

  function renderItemRow(expId, item) {
    const row = document.createElement('li');
    row.className = 'item-row' + (item.checked ? ' checked' : '');
    row.dataset.itemId = item.id;

    const label = document.createElement('label');
    label.className = 'check-label';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.checked;

    const box = document.createElement('span');
    box.className = 'check-box';
    box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    label.appendChild(cb);
    label.appendChild(box);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;

    const amtSpan = document.createElement('span');
    amtSpan.className = 'item-amount';
    amtSpan.textContent = '\u20A6' + formatNaira(item.amount);

    const delBtn = document.createElement('button');
    delBtn.className = 'item-del-btn';
    delBtn.setAttribute('aria-label', 'Delete ' + item.name);
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    row.appendChild(label);
    row.appendChild(nameSpan);
    row.appendChild(amtSpan);
    row.appendChild(delBtn);

    cb.addEventListener('change', () => {
      toggleItem(expId, item.id);
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteItem(expId, item.id);
    });

    return row;
  }

  function toggleExpand(expId) {
    const card = listEl.querySelector(`.expense-card[data-id="${expId}"]`);
    if (!card) return;
    const wrap = card.querySelector('.card-body-wrap');
    const chevron = card.querySelector('.card-chevron');
    wrap.classList.toggle('open');
    chevron.classList.toggle('open');
  }

  function createExpense(name) {
    expenses.push({
      id: uid(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      items: []
    });
    save();
    render();
  }

  function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    save();
    render();
  }

  function addItem(expId, name, amount) {
    const exp = expenses.find(e => e.id === expId);
    if (!exp) return;
    exp.items.push({
      id: uid(),
      name: name,
      amount: amount,
      checked: false
    });
    save();
    render();
  }

  function deleteItem(expId, itemId) {
    const exp = expenses.find(e => e.id === expId);
    if (!exp) return;
    exp.items = exp.items.filter(i => i.id !== itemId);
    save();
    render();
  }

  function toggleItem(expId, itemId) {
    const exp = expenses.find(e => e.id === expId);
    if (!exp) return;
    const item = exp.items.find(i => i.id === itemId);
    if (!item) return;
    item.checked = !item.checked;
    save();
    render();
  }

  function clearAll() {
    if (expenses.length === 0) return;
    expenses = [];
    save();
    render();
  }

  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = catInput.value.trim();
    if (!name) {
      createError.textContent = 'Please enter an expense name.';
      createError.classList.add('visible');
      catInput.classList.add('input-error');
      return;
    }
    createError.classList.remove('visible');
    createError.textContent = '';
    catInput.classList.remove('input-error');
    createExpense(name);
    catInput.value = '';
    catInput.focus();
  });

  catInput.addEventListener('input', () => {
    catInput.classList.remove('input-error');
    createError.classList.remove('visible');
    createError.textContent = '';
  });

  clearBtn.addEventListener('click', clearAll);

  load();
  migrate();
  render();
})();
