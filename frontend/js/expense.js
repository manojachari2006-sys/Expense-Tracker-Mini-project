(function () {
  const PAGE_SIZE = 10;
  const state = {
    allExpenses: [],
    page: 0,
    filters: { category: '', startDate: '', endDate: '', sortBy: '', direction: 'desc' },
    callbacks: null,
    expenseBeingEdited: null,
    loading: false,
    focusReturnElement: null
  };

  const dialog = () => document.getElementById('expense-dialog');
  const form = () => document.getElementById('expense-form');

  function hasFilters(filters = state.filters) {
    return Boolean(filters.category || filters.startDate || filters.endDate || filters.sortBy);
  }

  function activeFilterCount(filters = state.filters) {
    return Number(Boolean(filters.category))
      + Number(Boolean(filters.startDate && filters.endDate))
      + Number(Boolean(filters.sortBy));
  }

  function currentFilters() {
    return {
      category: document.getElementById('category-filter').value,
      startDate: document.getElementById('start-date-filter').value,
      endDate: document.getElementById('end-date-filter').value,
      sortBy: document.getElementById('sort-filter').value,
      direction: document.getElementById('sort-direction').value
    };
  }

  function setLoading(loading, message) {
    state.loading = loading;
    state.callbacks.onLoading(loading, message);
    document.querySelectorAll('[data-action="edit"], [data-action="delete"]').forEach(button => {
      button.disabled = loading;
    });
    document.getElementById('previous-page').disabled = loading || state.page <= 0;
    document.getElementById('next-page').disabled = loading;
    document.getElementById('reset-filters').disabled = loading;
  }

  function createMetadata(overrides = {}) {
    const totalRecords = state.allExpenses.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    const filtersActive = hasFilters();
    return {
      loading: false,
      page: state.page,
      totalPages,
      totalRecords,
      startItem: totalRecords ? state.page * PAGE_SIZE + 1 : 0,
      endItem: Math.min((state.page + 1) * PAGE_SIZE, totalRecords),
      serverPaged: !filtersActive,
      hasAnyExpenses: totalRecords > 0,
      activeFilterCount: activeFilterCount(),
      note: '',
      ...overrides
    };
  }

  function showFieldErrors(errors = {}) {
    ['amount', 'category', 'description', 'date'].forEach(field => {
      const errorElement = document.querySelector(`[data-error-for="${field}"]`);
      errorElement.textContent = typeof errors[field] === 'string' ? errors[field] : '';
      form().elements[field].setAttribute('aria-invalid', String(Boolean(errors[field])));
    });
  }

  function clearFormErrors() {
    showFieldErrors({});
    const errorSummary = document.getElementById('expense-form-error');
    errorSummary.textContent = '';
    errorSummary.hidden = true;
  }

  function showFormError(message) {
    const errorSummary = document.getElementById('expense-form-error');
    errorSummary.textContent = message;
    errorSummary.hidden = false;
  }

  function requestErrorMessage(error, fallback) {
    if (error.status === 404) return 'This expense could not be found. It may have been removed.';
    if (error.status === 400) return error.message || 'Please check the highlighted fields.';
    if (error.status === 0) return 'Could not reach the server. Check that the backend is running.';
    if (error.status >= 500) return 'The server could not complete the request. Please try again.';
    return error.message || fallback;
  }

  function sortLocally(expenses, field, direction) {
    const multiplier = direction === 'desc' ? -1 : 1;
    return [...expenses].sort((first, second) => {
      const firstValue = first[field];
      const secondValue = second[field];
      if (field === 'amount' || field === 'id') return (Number(firstValue) - Number(secondValue)) * multiplier;
      return String(firstValue || '').localeCompare(String(secondValue || ''), undefined, { sensitivity: 'base' }) * multiplier;
    });
  }

  async function getFilteredExpenses(filters) {
    const requests = [];
    if (filters.category) requests.push(window.ExpenseApi.getExpensesByCategory(filters.category));
    if (filters.startDate && filters.endDate) {
      requests.push(window.ExpenseApi.getExpensesByDateRange(filters.startDate, filters.endDate));
    }
    const resultSets = await Promise.all(requests);
    if (!resultSets.length) return [];
    if (resultSets.length === 1) return resultSets[0];

    const matchingIds = new Set(resultSets[0].map(expense => expense.id));
    resultSets.slice(1).forEach(expenses => {
      const currentIds = new Set(expenses.map(expense => expense.id));
      matchingIds.forEach(id => { if (!currentIds.has(id)) matchingIds.delete(id); });
    });
    const fullRecordsById = new Map(state.allExpenses.map(expense => [expense.id, expense]));
    return [...matchingIds].map(id => fullRecordsById.get(id)).filter(Boolean);
  }

  async function loadCurrentView() {
    const filters = state.filters;
    const filterMode = Boolean(filters.category || filters.startDate || filters.endDate);
    const sortMode = Boolean(filters.sortBy);
    let failureMessage = '';
    setLoading(true);

    try {
      let visibleExpenses;
      let metadata;

      if (!filterMode && !sortMode) {
        let totalPages = Math.max(1, Math.ceil(state.allExpenses.length / PAGE_SIZE));
        if (state.page >= totalPages) state.page = totalPages - 1;
        visibleExpenses = await window.ExpenseApi.getExpensesPage(state.page, PAGE_SIZE);
        metadata = createMetadata({ totalPages, totalRecords: state.allExpenses.length });
      } else if (sortMode && !filterMode) {
        visibleExpenses = await window.ExpenseApi.getExpensesSortedBy(filters.sortBy, filters.direction);
        metadata = createMetadata({
          totalRecords: visibleExpenses.length,
          totalPages: 1,
          serverPaged: false,
          note: 'The backend sort route returns the full sorted list. Clear sorting to use server pagination.'
        });
      } else {
        visibleExpenses = await getFilteredExpenses(filters);
        if (sortMode) visibleExpenses = sortLocally(visibleExpenses, filters.sortBy, filters.direction);
        const note = sortMode
          ? 'The backend has separate filter and sort routes, so sorting is applied to the filtered results here. Clear filters to use server pagination.'
          : 'The backend filter routes return all matching records and do not accept page parameters. Clear filters to use server pagination.';
        metadata = createMetadata({
          totalRecords: visibleExpenses.length,
          totalPages: 1,
          serverPaged: false,
          hasAnyExpenses: state.allExpenses.length > 0,
          note
        });
      }

      state.callbacks.onRender(visibleExpenses, metadata);
    } catch (error) {
      if (error.status !== 401) {
        failureMessage = requestErrorMessage(error, 'Unable to load expenses. Please try again.');
        state.callbacks.onRender([], createMetadata({
          loading: false,
          serverPaged: false,
          message: failureMessage
        }));
        state.callbacks.onNotify(failureMessage, 'error');
      }
    } finally {
      setLoading(false, failureMessage);
    }
  }

  async function refreshAllExpenses({ added = false } = {}) {
    let failureMessage = '';
    setLoading(true);
    try {
      state.allExpenses = await window.ExpenseApi.getExpenses();
      state.callbacks.onSummary(state.allExpenses);
      state.callbacks.onCategories(state.allExpenses);

      if (added && !hasFilters()) {
        state.page = Math.max(0, Math.ceil(state.allExpenses.length / PAGE_SIZE) - 1);
      }
      await loadCurrentView();
    } catch (error) {
      if (error.status !== 401) {
        failureMessage = requestErrorMessage(error, 'Unable to refresh expenses. Please try again.');
        state.callbacks.onNotify(failureMessage, 'error');
        state.callbacks.onRender([], createMetadata({ loading: false, message: failureMessage }));
      }
    } finally {
      setLoading(false, failureMessage);
    }
  }

  function resetExpenseForm() {
    form().reset();
    state.expenseBeingEdited = null;
    clearFormErrors();
    document.getElementById('expense-dialog-title').textContent = 'Add expense';
    document.getElementById('dialog-eyebrow').textContent = 'NEW TRANSACTION';
    document.getElementById('save-expense-label').textContent = 'Save expense';
  }

  function openCreate() {
    state.focusReturnElement = document.activeElement;
    resetExpenseForm();
    const now = new Date();
    form().elements.date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dialog().showModal();
    form().elements.amount.focus();
  }

  async function openEdit(id) {
    state.focusReturnElement = document.activeElement;
    clearFormErrors();
    try {
      const expense = await window.ExpenseApi.getExpenseById(id);
      resetExpenseForm();
      state.expenseBeingEdited = expense.id;
      form().elements.amount.value = expense.amount;
      form().elements.category.value = expense.category;
      form().elements.description.value = expense.description;
      form().elements.date.value = expense.date;
      document.getElementById('expense-dialog-title').textContent = 'Edit expense';
      document.getElementById('dialog-eyebrow').textContent = `EDIT TRANSACTION · #${expense.id}`;
      document.getElementById('save-expense-label').textContent = 'Save changes';
      dialog().showModal();
      form().elements.amount.focus();
    } catch (error) {
      if (error.status !== 401) state.callbacks.onNotify(requestErrorMessage(error, 'Unable to open this expense.'), 'error');
    }
  }

  function setSaving(saving) {
    const button = document.getElementById('save-expense-button');
    button.disabled = saving;
    button.classList.toggle('is-saving', saving);
    button.setAttribute('aria-busy', String(saving));
    document.getElementById('save-expense-label').textContent = saving
      ? (state.expenseBeingEdited ? 'Saving…' : 'Adding…')
      : (state.expenseBeingEdited ? 'Save changes' : 'Save expense');
  }

  function formRequestBody() {
    const data = new FormData(form());
    return {
      amount: Number(data.get('amount')),
      category: String(data.get('category') || '').trim(),
      description: String(data.get('description') || '').trim(),
      date: String(data.get('date') || '')
    };
  }

  function validateExpense(expense) {
    const errors = {};
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) errors.amount = 'Enter an amount greater than zero.';
    if (!expense.category) errors.category = 'Enter a category.';
    if (!expense.description) errors.description = 'Enter a description.';
    if (!expense.date) errors.date = 'Choose a date.';
    showFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveExpense(event) {
    event.preventDefault();
    clearFormErrors();
    const expense = formRequestBody();
    if (!validateExpense(expense)) return;

    const wasEditing = Boolean(state.expenseBeingEdited);
    setSaving(true);
    try {
      if (wasEditing) await window.ExpenseApi.updateExpense(state.expenseBeingEdited, expense);
      else await window.ExpenseApi.createExpense(expense);
      dialog().close();
      resetExpenseForm();
      if (!wasEditing) state.page = 0;
      await refreshAllExpenses({ added: !wasEditing });
      state.callbacks.onNotify(wasEditing ? 'Expense updated successfully.' : 'Expense added successfully.', 'success');
    } catch (error) {
      if (error.status === 400 && error.fieldErrors) {
        showFieldErrors(error.fieldErrors);
        showFormError('Please review the highlighted fields and try again.');
      } else if (error.status !== 401) {
        showFormError(requestErrorMessage(error, 'Unable to save this expense. Please try again.'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id, button) {
    state.focusReturnElement = button;
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Deleting…';
    try {
      await window.ExpenseApi.deleteExpense(id);
      await refreshAllExpenses();
      state.callbacks.onNotify('Expense deleted successfully.', 'success');
    } catch (error) {
      if (error.status !== 401) state.callbacks.onNotify(requestErrorMessage(error, 'Unable to delete this expense.'), 'error');
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = 'Delete';
      }
    }
  }

  function confirmDelete() {
    const deleteDialog = document.getElementById('delete-dialog');
    return new Promise(resolve => {
      deleteDialog.returnValue = '';
      deleteDialog.addEventListener('close', () => {
        const confirmed = deleteDialog.returnValue === 'delete';
        resolve(confirmed);
        if (state.focusReturnElement?.isConnected) state.focusReturnElement.focus();
      }, { once: true });
      deleteDialog.showModal();
      document.getElementById('cancel-delete').focus();
    });
  }

  function applyFilters(event) {
    event.preventDefault();
    const filters = currentFilters();
    if (Boolean(filters.startDate) !== Boolean(filters.endDate)) {
      state.callbacks.onNotify('Choose both a start and end date to filter by date range.', 'warning');
      return;
    }
    if (filters.startDate && filters.startDate > filters.endDate) {
      state.callbacks.onNotify('The start date must be on or before the end date.', 'warning');
      return;
    }
    state.filters = filters;
    state.page = 0;
    loadCurrentView();
  }

  function resetFilters() {
    document.getElementById('filter-form').reset();
    document.getElementById('sort-direction').value = 'desc';
    state.filters = { category: '', startDate: '', endDate: '', sortBy: '', direction: 'desc' };
    state.page = 0;
    loadCurrentView();
  }

  function bindEvents() {
    document.getElementById('filter-form').addEventListener('submit', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    document.getElementById('previous-page').addEventListener('click', () => {
      if (state.page > 0 && !hasFilters() && !state.loading) {
        state.page -= 1;
        loadCurrentView();
      }
    });
    document.getElementById('next-page').addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(state.allExpenses.length / PAGE_SIZE));
      if (state.page + 1 < totalPages && !hasFilters() && !state.loading) {
        state.page += 1;
        loadCurrentView();
      }
    });
    document.getElementById('expense-table-body').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button || state.loading) return;
      if (button.dataset.action === 'edit') {
        button.disabled = true;
        openEdit(button.dataset.id).finally(() => { if (button.isConnected) button.disabled = false; });
      }
      if (button.dataset.action === 'delete') deleteExpense(button.dataset.id, button);
    });

    document.getElementById('expense-form').addEventListener('submit', saveExpense);
    document.getElementById('close-expense-dialog').addEventListener('click', () => dialog().close());
    document.getElementById('cancel-expense').addEventListener('click', () => dialog().close());
    dialog().addEventListener('close', () => {
      resetExpenseForm();
      if (state.focusReturnElement?.isConnected) state.focusReturnElement.focus();
    });
    dialog().addEventListener('click', event => {
      if (event.target === dialog()) dialog().close();
    });
    document.getElementById('cancel-delete').addEventListener('click', () => {
      document.getElementById('delete-dialog').close('cancel');
    });
    document.getElementById('confirm-delete').addEventListener('click', () => {
      document.getElementById('delete-dialog').close('delete');
    });
  }

  async function initialize(callbacks) {
    state.callbacks = callbacks;
    bindEvents();
    let failureMessage = '';
    state.callbacks.onSummaryLoading(true);
    setLoading(true);
    try {
      state.allExpenses = await window.ExpenseApi.getExpenses();
      state.callbacks.onSummary(state.allExpenses);
      state.callbacks.onCategories(state.allExpenses);
      await loadCurrentView();
    } catch (error) {
      if (error.status !== 401) {
        failureMessage = requestErrorMessage(error, 'Unable to load expenses. Please try again.');
        state.callbacks.onRender([], createMetadata({ loading: false, serverPaged: false, message: failureMessage }));
        state.callbacks.onNotify(failureMessage, 'error');
      }
    } finally {
      state.callbacks.onSummaryLoading(false);
      setLoading(false, failureMessage);
    }
  }

  window.ExpenseManager = { initialize, openCreate };
})();
