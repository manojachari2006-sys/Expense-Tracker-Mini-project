(function () {
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  function formatCurrency(amount) {
    return currencyFormatter.format(Number(amount) || 0);
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }

  function updateSummary(expenses) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const monthTotal = expenses.reduce((sum, expense) => {
      return expense.date && expense.date.startsWith(currentMonth)
        ? sum + Number(expense.amount || 0)
        : sum;
    }, 0);
    const average = expenses.length ? total / expenses.length : 0;

    document.getElementById('total-expenses').textContent = formatCurrency(total);
    document.getElementById('transaction-count').textContent = expenses.length.toLocaleString('en-IN');
    document.getElementById('monthly-expenses').textContent = formatCurrency(monthTotal);
    document.getElementById('average-expense').textContent = formatCurrency(average);
    document.getElementById('current-month-label').textContent = new Intl.DateTimeFormat('en-IN', {
      month: 'long', year: 'numeric'
    }).format(now);
    renderAnalytics(expenses);
  }

  const chartColors = ['category-color-0', 'category-color-1', 'category-color-2', 'category-color-3',
    'category-color-4', 'category-color-5', 'category-color-6', 'category-color-7'];

  function categoryColorIndex(category) {
    let hash = 0;
    for (const character of category.toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) % chartColors.length;
    return hash;
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function renderCategoryChart(expenses) {
    const totals = new Map();
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      totals.set(category, (totals.get(category) || 0) + Number(expense.amount || 0));
    });
    const categories = [...totals].sort((first, second) => second[1] - first[1]);
    const total = categories.reduce((sum, [, amount]) => sum + amount, 0);
    const chart = document.getElementById('category-chart');
    const legend = document.getElementById('category-legend');
    const empty = document.getElementById('category-chart-empty');
    chart.replaceChildren();
    legend.replaceChildren();
    document.getElementById('category-chart-total').textContent = formatCurrency(total);
    empty.hidden = categories.length > 0;
    chart.hidden = categories.length === 0;

    const center = 90;
    const radius = 66;
    const circumference = 2 * Math.PI * radius;
    chart.append(svgElement('circle', { cx: center, cy: center, r: radius, class: 'donut-track' }));
    let offset = 0;
    categories.forEach(([category, amount]) => {
      const arc = total ? (amount / total) * circumference : 0;
      const segment = svgElement('circle', {
        cx: center, cy: center, r: radius,
        class: 'donut-segment ' + chartColors[categoryColorIndex(category)],
        'stroke-dasharray': Math.max(0, arc - 2) + ' ' + circumference,
        'stroke-dashoffset': -offset
      });
      segment.setAttribute('aria-label', category + ': ' + formatCurrency(amount));
      chart.append(segment);
      offset += arc;

      const item = document.createElement('div');
      item.className = 'legend-item';
      const dot = document.createElement('span');
      dot.className = 'legend-dot ' + chartColors[categoryColorIndex(category)];
      dot.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'legend-name';
      name.textContent = category;
      const value = document.createElement('span');
      value.className = 'legend-value';
      value.textContent = formatCurrency(amount);
      item.append(dot, name, value);
      legend.append(item);
    });
    chart.setAttribute('aria-label', categories.length
      ? 'Spending distribution across ' + categories.length + ' categories, total ' + formatCurrency(total)
      : 'No expense data for category spending chart');
  }

  function compactCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1
    }).format(amount);
  }

  function renderTrendChart(expenses) {
    const totals = new Map();
    expenses.forEach(expense => {
      if (!expense.date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(expense.date)) return;
      const month = expense.date.slice(0, 7);
      totals.set(month, (totals.get(month) || 0) + Number(expense.amount || 0));
    });
    const months = [...totals].sort(([first], [second]) => first.localeCompare(second)).slice(-6);
    const svg = document.getElementById('trend-chart');
    const empty = document.getElementById('trend-chart-empty');
    const wrap = document.getElementById('trend-chart-wrap');
    svg.replaceChildren();
    const enoughData = months.length >= 2;
    empty.hidden = enoughData;
    wrap.hidden = !enoughData;
    if (!enoughData) return;

    const left = 48, right = 610, top = 18, bottom = 180;
    const max = Math.max(...months.map(([, value]) => value), 1);
    [max, max / 2, 0].forEach((value, index) => {
      const y = top + index * (bottom - top) / 2;
      svg.append(svgElement('line', { x1: left, x2: right, y1: y, y2: y, class: 'chart-grid-line' }));
      const label = svgElement('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
      label.textContent = compactCurrency(value);
      svg.append(label);
    });

    const points = months.map(([month, amount], index) => ({
      month, amount,
      x: left + index * (right - left) / (months.length - 1),
      y: bottom - (amount / max) * (bottom - top)
    }));
    const linePath = points.map((point, index) => (index ? 'L' : 'M') + ' ' + point.x + ' ' + point.y).join(' ');
    const areaPath = linePath + ' L ' + points.at(-1).x + ' ' + bottom + ' L ' + points[0].x + ' ' + bottom + ' Z';
    svg.append(svgElement('path', { d: areaPath, class: 'chart-area' }));
    svg.append(svgElement('path', { d: linePath, class: 'chart-line' }));
    points.forEach(point => {
      const marker = svgElement('circle', { cx: point.x, cy: point.y, r: 4.5, class: 'chart-point' });
      const title = svgElement('title');
      title.textContent = point.month + ': ' + formatCurrency(point.amount);
      marker.append(title);
      svg.append(marker);
      const [year, month] = point.month.split('-').map(Number);
      const label = svgElement('text', { x: point.x, y: 205, 'text-anchor': 'middle', class: 'chart-axis-label' });
      label.textContent = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      svg.append(label);
    });
    svg.setAttribute('aria-label', 'Monthly spending trend for ' + months.length + ' months, calculated from ' + expenses.length + ' expenses');
  }

  function renderAnalytics(expenses) {
    document.getElementById('analytics-loading').hidden = true;
    document.getElementById('analytics-grid').hidden = false;
    renderCategoryChart(expenses);
    renderTrendChart(expenses);
  }

  function renderCategoryOptions(expenses) {
    const categorySelect = document.getElementById('category-filter');
    const categoryList = document.getElementById('expense-categories');
    const selected = categorySelect.value;
    const categories = [...new Set(expenses.map(expense => expense.category).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second));

    categorySelect.replaceChildren(new Option('All categories', ''));
    categoryList.replaceChildren();
    categories.forEach(category => {
      categorySelect.add(new Option(category, category));
      const option = document.createElement('option');
      option.value = category;
      categoryList.append(option);
    });
    if (categories.includes(selected)) categorySelect.value = selected;
  }

  function makeCell(label, column, content, className = '') {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    cell.dataset.column = column;
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    return cell;
  }

  function renderExpenses(expenses, metadata) {
    const tableWrap = document.getElementById('expense-table-wrap');
    const emptyState = document.getElementById('empty-state');
    const status = document.getElementById('list-status');
    const tableBody = document.getElementById('expense-table-body');
    const pagination = document.getElementById('pagination');
    const filterNote = document.getElementById('filter-note');
    const countLabel = document.getElementById('expense-count-label');
    const filterBadge = document.getElementById('active-filter-badge');
    const emptyClear = document.getElementById('empty-clear-button');
    const emptyAdd = document.getElementById('empty-add-button');

    const failed = Boolean(metadata.message && !metadata.loading);
    status.hidden = !metadata.loading && !failed;
    status.textContent = metadata.message || 'Loading expenses…';
    tableWrap.hidden = metadata.loading || failed || expenses.length === 0;
    emptyState.hidden = metadata.loading || failed || expenses.length > 0;
    pagination.hidden = metadata.loading || !metadata.serverPaged || metadata.totalPages <= 1;
    filterNote.hidden = !metadata.note;
    filterNote.textContent = metadata.note || '';
    filterBadge.hidden = !metadata.activeFilterCount;
    filterBadge.textContent = metadata.activeFilterCount
      ? metadata.activeFilterCount + ' active filter' + (metadata.activeFilterCount === 1 ? '' : 's')
      : '';
    countLabel.textContent = metadata.serverPaged
      ? `${metadata.totalRecords.toLocaleString('en-IN')} ${metadata.totalRecords === 1 ? 'transaction' : 'transactions'}`
      : `${expenses.length.toLocaleString('en-IN')} ${expenses.length === 1 ? 'matching transaction' : 'matching transactions'}`;

    document.getElementById('empty-title').textContent = metadata.hasAnyExpenses ? 'No matching expenses' : 'No expenses yet';
    document.getElementById('empty-description').textContent = metadata.hasAnyExpenses
      ? 'Try changing your filters to see more transactions.'
      : 'Start tracking your spending by adding your first expense.';
    emptyAdd.textContent = metadata.hasAnyExpenses ? 'Add expense' : 'Add your first expense';
    emptyAdd.hidden = metadata.hasAnyExpenses && metadata.activeFilterCount > 0;
    emptyClear.hidden = !metadata.hasAnyExpenses || !metadata.activeFilterCount;

    tableBody.replaceChildren();
    expenses.forEach(expense => {
      const row = document.createElement('tr');
      row.dataset.expenseId = String(expense.id);

      const categoryContent = document.createElement('span');
      categoryContent.className = 'expense-category category-badge';
      const categoryDot = document.createElement('span');
      const categoryName = expense.category || 'Uncategorized';
      categoryDot.className = 'category-dot ' + chartColors[categoryColorIndex(categoryName)];
      categoryDot.setAttribute('aria-hidden', 'true');
      const categoryText = document.createElement('span');
      categoryText.textContent = categoryName;
      categoryContent.append(categoryDot, categoryText);
      row.append(makeCell('Category', 'category', categoryContent));

      const description = document.createElement('span');
      description.className = 'expense-description';
      description.textContent = expense.description || '—';
      row.append(makeCell('Description', 'description', description));
      row.append(makeCell('Date', 'date', formatDate(expense.date), 'expense-date'));
      row.append(makeCell('Amount', 'amount', formatCurrency(expense.amount), 'expense-amount'));

      const actions = document.createElement('div');
      actions.className = 'row-actions';
      actions.append(createActionButton('Edit', 'edit', expense.id));
      actions.append(createActionButton('Delete', 'delete', expense.id, 'row-action-delete'));
      row.append(makeCell('Actions', 'actions', actions));
      tableBody.append(row);
    });

    document.getElementById('pagination-summary').textContent = metadata.totalRecords
      ? `Showing ${metadata.startItem}–${metadata.endItem} of ${metadata.totalRecords}`
      : 'No transactions';
    document.getElementById('page-number').textContent = `Page ${metadata.page + 1} of ${Math.max(metadata.totalPages, 1)}`;
    document.getElementById('previous-page').disabled = metadata.page <= 0 || metadata.loading;
    document.getElementById('next-page').disabled = metadata.page + 1 >= metadata.totalPages || metadata.loading;
  }

  function createActionButton(label, action, id, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `row-action ${extraClass}`.trim();
    button.dataset.action = action;
    button.dataset.id = String(id);
    button.textContent = label;
    button.setAttribute('aria-label', `${label} expense ${id}`);
    return button;
  }

  function showToast(message, type = 'success') {
    const region = document.getElementById('toast-region');
    while (region.children.length >= 3) region.firstElementChild.remove();
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : type === 'warning' ? ' toast-warning' : ''}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4000);
  }

  function setListLoading(loading, message = (loading ? 'Loading expenses…' : '')) {
    const status = document.getElementById('list-status');
    if (loading || message) {
      status.textContent = message;
      status.hidden = false;
      document.getElementById('expense-table-wrap').hidden = true;
      document.getElementById('empty-state').hidden = true;
    } else {
      status.hidden = true;
    }
  }

  function setSummaryLoading(loading) {
    document.querySelector('.summary-grid').classList.toggle('is-loading', loading);
    document.getElementById('analytics-loading').hidden = !loading;
    document.getElementById('analytics-grid').hidden = loading;
  }

  function setupTheme() {
    const themeKey = 'ledgerly.theme';
    const button = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-toggle-icon');
    const label = document.getElementById('theme-toggle-label');
    const setTheme = theme => {
      const dark = theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      icon.textContent = dark ? '☀' : '☾';
      label.textContent = dark ? 'Light' : 'Dark';
    };
    setTheme(localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light');
    button.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(themeKey, nextTheme);
      setTheme(nextTheme);
    });
  }

  function updateNavigation() {
    const expensesSelected = window.location.hash === '#expenses';
    document.querySelectorAll('.side-nav .nav-link').forEach(link => {
      const active = (link.getAttribute('href') === '#expenses') === expensesSelected;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function initializeDashboard() {
    if (!window.ExpenseAuth.isAuthenticated()) {
      window.location.replace('index.html');
      return;
    }

    const user = window.ExpenseAuth.getCurrentUser();
    if (!user) {
      window.ExpenseAuth.clearAuth();
      window.location.replace('index.html');
      return;
    }

    const name = user.name.trim() || 'there';
    document.getElementById('welcome-heading').textContent = `Welcome back, ${name}.`;
    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-email').textContent = user.email || '';
    document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('dashboard-date').textContent = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date()).toUpperCase();

    document.getElementById('logout-button').addEventListener('click', () => {
      window.ExpenseAuth.clearAuth();
      window.location.replace('index.html');
    });

    setupTheme();
    updateNavigation();
    window.addEventListener('hashchange', updateNavigation);
    document.getElementById('empty-clear-button').addEventListener('click', () => {
      document.getElementById('reset-filters').click();
    });

    ['add-expense-button', 'add-expense-secondary', 'empty-add-button'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => window.ExpenseManager.openCreate());
    });

    window.ExpenseManager.initialize({
      onSummary: updateSummary,
      onCategories: renderCategoryOptions,
      onRender: renderExpenses,
      onLoading: setListLoading,
      onSummaryLoading: setSummaryLoading,
      onNotify: showToast
    });
  }

  document.addEventListener('DOMContentLoaded', initializeDashboard);
})();
