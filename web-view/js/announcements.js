/* announcements.js — Management AIOS Announcement & Notification workspace
   (REQ-ANN-001, 2026-08-12).

   Reuses the existing Calendar member-token authorization system verbatim
   (web-view/js/calendar/auth.js) — no new login system, no new token type.
   Whole-module-gated, same convention as Staff Data/Issues/Knowledge
   Management (REQ-AUTH-MODULES-007): mountAnnouncementsWorkspace() renders
   auth-gate.js's shared "Authorize this browser" placeholder INSTEAD OF the
   workspace while unauthenticated, and no request is ever attempted without
   a stored token.

   API contract (read from backend/routers/announcements.py,
   backend/schemas.py — never guessed):
     GET    /api/announcements                              auth -> {records, total, limit, offset} (Published only)
     GET    /api/announcements/drafts                        auth -> {records, total, limit, offset} (own Drafts only)
     GET    /api/announcements/{id}                          auth -> AnnouncementOut (Published: any member; Draft: creator only)
     POST   /api/announcements                                auth, {title, body, mention_member_keys} -> 201 AnnouncementOut (always Draft)
     PATCH  /api/announcements/{id}                          auth, {title?, body?, mention_member_keys?} -> AnnouncementOut (Draft, creator only)
     DELETE /api/announcements/{id}                          auth -> {id, deleted:true} (Draft, creator only, soft delete)
     POST   /api/announcements/{id}/publish                   auth -> AnnouncementOut (Draft, creator only, one-way)
     GET    /api/announcements/notifications                  auth, ?limit= -> {unread_count, items[]} (current member only)
     POST   /api/announcements/notifications/{mention_id}/read auth -> AnnouncementMentionNotificationOut (idempotent)
     GET    /api/announcements/{id}/read-receipts              auth -> {announcement_id, mentioned_count, read_count, unread_count, receipts[]} (Published creator only)

   Two independent mount points, both wired once by initAnnouncements():
     - mountAnnouncementsWorkspace(): the #tab-announcements panel
       (Published History / My Drafts / Create / Edit / Delete / Publish /
       read receipts).
     - mountAnnouncementBell(): the topbar bell (#announcementBell), which
       polls the unread-count feed every 30s while authenticated and the
       tab is visible, refreshing immediately on key interactions.

   Built via createElement/appendChild with textContent for every
   user-authored field (never innerHTML for untrusted text) — same
   convention as knowledge-management.js/issues.js/review-summaries.js. */

import { ANNOUNCEMENTS_API_BASE } from './config.js';
import {
  CALENDAR_AUTH_CHANGED_EVENT,
  ensureAuthorized,
  getStoredMemberKey,
  handleUnauthorizedResponse
} from './calendar/auth.js';
import { MD_MEMBER_KEY, MEMBER_REGISTRY } from './member-registry.js';
import { buildAuthRequiredNotice } from './auth-gate.js';
import { confirmDestructive } from './ui/dialog.js';
import { showToast } from './ui/toast.js';
import { setButtonBusy } from './ui/loading.js';
import { mapApiError, classifyHttpStatus } from './ui/error-mapper.js';
import { trapTab, returnFocus } from './ui/popup.js';
import { lockBodyScroll, unlockBodyScroll } from './ui/scroll-lock.js';

export var EMPTY_HISTORY_TEXT = 'No announcements have been published yet.';
export var EMPTY_DRAFTS_TEXT = 'You have no Drafts.';
export var LOADING_TEXT = 'Loading announcements...';
export var ERROR_TEXT = 'Unable to load announcements.';

/* The exact 5-member mention target pool — the same ASSIGNEE_ORDER
   convention issues.js already established for its own single-select
   assignee dropdown (discovery report §N direct precedent), extended here
   to a multi-select checkbox picker. MD is excluded: mention_member_keys
   is validated server-side against VALID_MEMBER_KEYS, which does not
   include "md" — a self-consistent exclusion, not a separate rule
   invented here. */
export var MENTION_TARGET_ORDER = ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan'];

// ── API client (the ONE place every request is built) ───────────────────

function parseJsonSafely(res) {
  return res.text().then(function (text) {
    if (!text) { return null; }
    try { return JSON.parse(text); } catch (e) { return null; }
  });
}

/* Every route in this file goes through this one function — same shape as
   knowledge-management.js's kmProtectedRequest, reused conceptually (not
   imported — that module is scoped to its own API base) so this module has
   no cross-domain dependency. ensureAuthorized() opens the existing
   "Authorize this browser" dialog if no token is stored yet; in normal
   operation this is never seen here because mountAnnouncementsWorkspace()/
   mountAnnouncementBell() never call it while unauthenticated — defense in
   depth for the mid-session token-loss case. */
function annProtectedRequest(pathAndQuery, options) {
  options = options || {};
  return ensureAuthorized().then(function (token) {
    var headers = { 'Authorization': 'Bearer ' + token };
    if (options.body !== undefined) { headers['Content-Type'] = 'application/json'; }
    return fetch(ANNOUNCEMENTS_API_BASE + pathAndQuery, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      return parseJsonSafely(res).then(function (body) {
        if (res.status === 401) {
          handleUnauthorizedResponse();
          var authErr = new Error('Authorization expired.');
          authErr.code = 'auth_required';
          authErr.status = 401;
          throw authErr;
        }
        if (!res.ok) {
          var err = new Error((body && body.message) || 'Request failed.');
          err.status = res.status;
          err.code = (body && body.error) || classifyHttpStatus(res.status);
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }, function (err) {
    var tagged = (err instanceof Error) ? err : new Error('Authorization cancelled.');
    tagged.code = tagged.code || 'auth_cancelled';
    throw tagged;
  });
}

export function listPublishedAnnouncements() {
  return annProtectedRequest('?limit=200');
}

export function listOwnDrafts() {
  return annProtectedRequest('/drafts?limit=200');
}

export function getAnnouncement(id) {
  return annProtectedRequest('/' + id);
}

export function createAnnouncementDraft(payload) {
  return annProtectedRequest('', { method: 'POST', body: payload });
}

export function updateAnnouncementDraft(id, payload) {
  return annProtectedRequest('/' + id, { method: 'PATCH', body: payload });
}

export function deleteAnnouncementDraft(id) {
  return annProtectedRequest('/' + id, { method: 'DELETE' });
}

export function publishAnnouncementDraft(id) {
  return annProtectedRequest('/' + id + '/publish', { method: 'POST' });
}

export function getNotificationFeed(limit) {
  return annProtectedRequest('/notifications?limit=' + (limit || 20));
}

export function markNotificationRead(mentionId) {
  return annProtectedRequest('/notifications/' + mentionId + '/read', { method: 'POST' });
}

export function getReadReceipts(id) {
  return annProtectedRequest('/' + id + '/read-receipts');
}

// ── DOM helpers ───────────────────────────────────────────────────────

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  return node;
}

function textEl(tag, className, text) {
  var node = el(tag, className);
  node.textContent = text;
  return node;
}

function displayName(memberKey) {
  var entry = MEMBER_REGISTRY[memberKey];
  return entry ? entry.displayName : memberKey;
}

function formatTimestamp(iso) {
  if (!iso) { return '—'; }
  var parsed = new Date(iso);
  if (isNaN(parsed.getTime())) { return iso; }
  return parsed.toLocaleString();
}

// ── Workspace (Published History / My Drafts / Create / Edit) ───────────

/* Mounted exactly once (initAnnouncements below), inside the independent
   #tab-announcements panel. opts.api lets tests inject fixture request
   functions instead of the real fetch-backed exports above — production
   wiring (initAnnouncements) always omits it. */
export function mountAnnouncementsWorkspace(mountEl, opts) {
  if (!mountEl) { return null; }
  opts = opts || {};
  var api = opts.api || {
    listPublished: listPublishedAnnouncements,
    listDrafts: listOwnDrafts,
    detail: getAnnouncement,
    create: createAnnouncementDraft,
    update: updateAnnouncementDraft,
    remove: deleteAnnouncementDraft,
    publish: publishAnnouncementDraft,
    readReceipts: getReadReceipts
  };
  var onChanged = typeof opts.onChanged === 'function' ? opts.onChanged : function () {};

  var state = {
    view: 'history', // 'history' | 'drafts'
    historyStatus: 'loading', // 'loading' | 'data' | 'empty' | 'error'
    historyRecords: [],
    historyErrorMessage: null,
    historyRequestId: 0,
    draftsStatus: 'loading',
    draftRecords: [],
    draftsErrorMessage: null,
    draftsRequestId: 0
  };

  mountEl.textContent = '';

  function isAuthorized() { return !!getStoredMemberKey(); }

  if (!isAuthorized()) {
    mountEl.appendChild(buildAuthRequiredNotice('announcements'));
    return { getState: function () { return state; }, reload: function () {} };
  }

  // ── Header + Create button ──────────────────────────────────────────
  var headerRow = el('div', 'msc-ann-header-row');
  var headerText = el('div', 'msc-ann-header-text');
  headerText.appendChild(textEl('h3', 'msc-ann-section-heading', 'Announcements'));
  headerText.appendChild(textEl(
    'p', 'msc-ann-header-helper',
    'Publish a centralized instruction and optionally notify specific members.'
  ));
  headerRow.appendChild(headerText);
  var createBtn = el('button', 'msc-btn msc-btn-primary msc-ann-create-btn');
  createBtn.type = 'button';
  createBtn.textContent = '+ Create Announcement';
  headerRow.appendChild(createBtn);
  mountEl.appendChild(headerRow);

  // ── View tabs (Published History / My Drafts) ──────────────────────
  var viewTabs = el('div', 'msc-ann-view-tabs');
  viewTabs.setAttribute('role', 'tablist');
  viewTabs.setAttribute('aria-label', 'Announcements views');

  var historyTabBtn = el('button', 'msc-ann-view-tab');
  historyTabBtn.type = 'button';
  historyTabBtn.id = 'msc-ann-view-tab-history';
  historyTabBtn.setAttribute('role', 'tab');
  historyTabBtn.setAttribute('aria-controls', 'msc-ann-view-panel-history');
  historyTabBtn.textContent = 'Published History';

  var draftsTabBtn = el('button', 'msc-ann-view-tab');
  draftsTabBtn.type = 'button';
  draftsTabBtn.id = 'msc-ann-view-tab-drafts';
  draftsTabBtn.setAttribute('role', 'tab');
  draftsTabBtn.setAttribute('aria-controls', 'msc-ann-view-panel-drafts');
  draftsTabBtn.textContent = 'My Drafts';

  viewTabs.appendChild(historyTabBtn);
  viewTabs.appendChild(draftsTabBtn);
  mountEl.appendChild(viewTabs);

  var historyPanel = el('div', 'msc-ann-view-panel');
  historyPanel.id = 'msc-ann-view-panel-history';
  historyPanel.setAttribute('role', 'tabpanel');
  historyPanel.setAttribute('aria-labelledby', 'msc-ann-view-tab-history');
  mountEl.appendChild(historyPanel);

  var draftsPanel = el('div', 'msc-ann-view-panel');
  draftsPanel.id = 'msc-ann-view-panel-drafts';
  draftsPanel.setAttribute('role', 'tabpanel');
  draftsPanel.setAttribute('aria-labelledby', 'msc-ann-view-tab-drafts');
  draftsPanel.hidden = true;
  mountEl.appendChild(draftsPanel);

  function setView(view) {
    state.view = view;
    historyTabBtn.classList.toggle('msc-ann-view-tab-active', view === 'history');
    draftsTabBtn.classList.toggle('msc-ann-view-tab-active', view === 'drafts');
    historyTabBtn.setAttribute('aria-selected', view === 'history' ? 'true' : 'false');
    draftsTabBtn.setAttribute('aria-selected', view === 'drafts' ? 'true' : 'false');
    historyPanel.hidden = view !== 'history';
    draftsPanel.hidden = view !== 'drafts';
  }
  historyTabBtn.addEventListener('click', function () { setView('history'); });
  draftsTabBtn.addEventListener('click', function () { setView('drafts'); });
  setView('history');

  // ── Modal shell — one lazy singleton, reconfigured per open() call,
  //    same pattern as knowledge-management.js's ensureModal() ─────────
  var modal = null;
  function ensureModal() {
    if (modal) { return modal; }
    var overlay = el('div', 'msc-modal-overlay msc-ann-modal-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    var box = el('div', 'msc-modal msc-modal-form msc-ann-modal');
    var head = el('div', 'msc-modal-form-head');
    var titleEl = textEl('h4', '', '');
    titleEl.id = 'msc-ann-modal-title';
    overlay.setAttribute('aria-labelledby', 'msc-ann-modal-title');
    var closeBtn = el('button', 'msc-modal-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    head.appendChild(titleEl);
    head.appendChild(closeBtn);
    var bodyEl = el('div', 'msc-ann-modal-body');
    box.appendChild(head);
    box.appendChild(bodyEl);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var triggerEl = null;

    function close() {
      overlay.classList.remove('show');
      unlockBodyScroll();
      overlay.removeEventListener('keydown', onKeydown);
      bodyEl.textContent = '';
      if (triggerEl) { returnFocus(triggerEl); }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') { trapTab(box, e); }
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });

    function open(title, buildBody, trigger) {
      triggerEl = trigger || document.activeElement;
      titleEl.textContent = title;
      bodyEl.textContent = '';
      buildBody(bodyEl, close);
      overlay.classList.add('show');
      lockBodyScroll();
      overlay.addEventListener('keydown', onKeydown);
      window.requestAnimationFrame(function () {
        var focusable = box.querySelector('.msc-ann-modal-first-focus');
        (focusable || closeBtn).focus();
      });
    }

    modal = { open: open, close: close };
    return modal;
  }

  // ── Mention checkbox picker ──────────────────────────────────────────

  function buildMentionPicker(container, selectedKeys) {
    var wrap = el('div', 'msc-ann-mention-picker');
    wrap.appendChild(textEl('span', 'msc-km-field-label', 'Mention members'));
    var list = el('div', 'msc-ann-mention-list');
    var selected = {};
    (selectedKeys || []).forEach(function (k) { selected[k] = true; });

    MENTION_TARGET_ORDER.forEach(function (key) {
      var row = el('label', 'msc-ann-mention-row');
      var checkbox = el('input', 'msc-ann-mention-checkbox');
      checkbox.type = 'checkbox';
      checkbox.value = key;
      checkbox.checked = !!selected[key];
      row.appendChild(checkbox);
      row.appendChild(document.createTextNode(' @' + displayName(key)));
      list.appendChild(row);
    });
    wrap.appendChild(list);
    container.appendChild(wrap);

    return {
      getSelected: function () {
        return Array.prototype.slice.call(list.querySelectorAll('.msc-ann-mention-checkbox'))
          .filter(function (cb) { return cb.checked; })
          .map(function (cb) { return cb.value; });
      }
    };
  }

  // ── Create / Edit Draft form ──────────────────────────────────────────

  function openDraftEditor(existingRecord, trigger) {
    var isEdit = !!existingRecord;
    ensureModal().open(isEdit ? 'Edit Draft' : 'Create Announcement', function (bodyEl, close) {
      var form = el('div', 'msc-ann-form');

      var titleField = el('div', 'msc-km-field');
      titleField.appendChild(textEl('label', 'msc-km-field-label', 'Title'));
      var titleInput = el('input', 'msc-km-input msc-ann-modal-first-focus');
      titleInput.type = 'text';
      titleInput.maxLength = 200;
      titleInput.value = isEdit ? existingRecord.title : '';
      titleField.appendChild(titleInput);
      form.appendChild(titleField);

      var bodyField = el('div', 'msc-km-field');
      bodyField.appendChild(textEl('label', 'msc-km-field-label', 'Message'));
      var bodyInput = el('textarea', 'msc-km-input msc-ann-body-input');
      bodyInput.maxLength = 10000;
      bodyInput.value = isEdit ? existingRecord.body : '';
      bodyField.appendChild(bodyInput);
      form.appendChild(bodyField);

      var mentionPicker = buildMentionPicker(form, isEdit ? existingRecord.mention_member_keys : []);

      var errorMsg = textEl('p', 'msc-ann-form-error', '');
      errorMsg.hidden = true;
      form.appendChild(errorMsg);

      var actions = el('div', 'msc-form-actions msc-ann-form-actions');

      var deleteBtn = null;
      if (isEdit) {
        deleteBtn = el('button', 'msc-btn msc-btn-danger msc-ann-delete-btn');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete Draft';
        actions.appendChild(deleteBtn);
      }

      var saveBtn = el('button', 'msc-btn msc-btn-ghost msc-ann-save-btn');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save Draft';
      actions.appendChild(saveBtn);

      var publishBtn = el('button', 'msc-btn msc-btn-primary msc-ann-publish-btn');
      publishBtn.type = 'button';
      publishBtn.textContent = 'Publish';
      actions.appendChild(publishBtn);

      form.appendChild(actions);
      bodyEl.appendChild(form);

      function showError(message) {
        errorMsg.textContent = message;
        errorMsg.hidden = false;
      }

      function payload() {
        return {
          title: titleInput.value,
          body: bodyInput.value,
          mention_member_keys: mentionPicker.getSelected()
        };
      }

      function handleFailure(err) {
        var mapped = mapApiError(err);
        showError(mapped.message);
        showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }

      saveBtn.addEventListener('click', function () {
        errorMsg.hidden = true;
        setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });
        var request = isEdit ? api.update(existingRecord.id, payload()) : api.create(payload());
        request.then(function () {
          setButtonBusy(saveBtn, false);
          showToast({ type: 'success', title: isEdit ? 'Draft updated' : 'Draft saved' });
          close();
          loadDrafts();
          onChanged();
        }, function (err) {
          setButtonBusy(saveBtn, false);
          handleFailure(err);
        });
      });

      publishBtn.addEventListener('click', function () {
        errorMsg.hidden = true;
        setButtonBusy(publishBtn, true, { busyLabel: 'Publishing…' });
        var save = isEdit
          ? api.update(existingRecord.id, payload())
          : api.create(payload());
        save.then(function (saved) {
          return api.publish(saved.id);
        }).then(function () {
          setButtonBusy(publishBtn, false);
          showToast({ type: 'success', title: 'Announcement published' });
          close();
          loadDrafts();
          loadHistory();
          onChanged();
        }, function (err) {
          setButtonBusy(publishBtn, false);
          handleFailure(err);
        });
      });

      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          confirmDestructive({
            title: 'Delete this Draft?',
            message: 'This Draft and its mention selections will be permanently deleted. This cannot be undone.',
            confirmLabel: 'Delete Draft',
            cancelLabel: 'Cancel',
            trigger: deleteBtn,
            onConfirm: function () {
              return api.remove(existingRecord.id).then(function () {
                showToast({ type: 'success', title: 'Draft deleted' });
                close();
                loadDrafts();
                onChanged();
              }, function (err) {
                handleFailure(err);
                return false;
              });
            }
          });
        });
      }
    }, trigger);
  }

  // ── Read receipts (creator-only, Published only) ────────────────────

  function openReadReceipts(record, trigger) {
    ensureModal().open('Read Receipts — ' + record.title, function (bodyEl) {
      bodyEl.appendChild(textEl('p', 'msc-ann-loading', 'Loading read receipts…'));
      api.readReceipts(record.id).then(function (data) {
        bodyEl.textContent = '';
        var summary = el('p', 'msc-ann-receipt-summary');
        summary.textContent = 'Mentioned: ' + data.mentioned_count +
          ' · Read: ' + data.read_count + ' · Unread: ' + data.unread_count;
        bodyEl.appendChild(summary);

        if (!data.receipts.length) {
          bodyEl.appendChild(textEl('p', 'msc-ann-empty', 'No members were mentioned in this announcement.'));
          return;
        }
        var list = el('ul', 'msc-ann-receipt-list');
        data.receipts.forEach(function (r) {
          var li = el('li', 'msc-ann-receipt-item');
          li.appendChild(textEl('span', '', '@' + (r.display_label || r.member_key)));
          li.appendChild(textEl(
            'span',
            r.read ? 'msc-ann-receipt-read' : 'msc-ann-receipt-unread',
            r.read ? 'Read' : 'Unread'
          ));
          list.appendChild(li);
        });
        bodyEl.appendChild(list);
      }, function (err) {
        bodyEl.textContent = '';
        bodyEl.appendChild(textEl('p', 'msc-ann-error', mapApiError(err).message));
      });
    }, trigger);
  }

  // ── History list rendering ───────────────────────────────────────────

  function renderHistory() {
    historyPanel.textContent = '';

    if (state.historyStatus === 'loading') {
      historyPanel.appendChild(textEl('div', 'msc-ann-loading', LOADING_TEXT));
      return;
    }
    if (state.historyStatus === 'error') {
      var errWrap = el('div', 'msc-ann-error-state');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.historyErrorMessage || ERROR_TEXT));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', loadHistory);
      errWrap.appendChild(retryBtn);
      historyPanel.appendChild(errWrap);
      return;
    }
    if (!state.historyRecords.length) {
      historyPanel.appendChild(textEl('div', 'msc-ann-empty-state', EMPTY_HISTORY_TEXT));
      return;
    }

    var currentMember = getStoredMemberKey();
    var list = el('div', 'msc-ann-card-list');
    state.historyRecords.forEach(function (record) {
      var card = el('div', 'msc-ann-card');
      var head = el('div', 'msc-ann-card-head');
      head.appendChild(textEl('h4', 'msc-ann-card-title', record.title));
      head.appendChild(textEl(
        'span', 'msc-ann-card-meta',
        '@' + displayName(record.created_by) + ' · ' + formatTimestamp(record.published_at)
      ));
      card.appendChild(head);
      card.appendChild(textEl('p', 'msc-ann-card-body', record.body));

      if (record.mention_member_keys && record.mention_member_keys.length) {
        var mentions = el('p', 'msc-ann-card-mentions');
        mentions.textContent = 'Mentioned: ' + record.mention_member_keys.map(function (k) {
          return '@' + displayName(k);
        }).join(', ');
        card.appendChild(mentions);
      }

      if (record.created_by === currentMember) {
        var receiptsBtn = el('button', 'msc-btn msc-btn-ghost msc-ann-receipts-btn');
        receiptsBtn.type = 'button';
        receiptsBtn.textContent = 'View Read Receipts';
        receiptsBtn.addEventListener('click', function () { openReadReceipts(record, receiptsBtn); });
        card.appendChild(receiptsBtn);
      }

      list.appendChild(card);
    });
    historyPanel.appendChild(list);
  }

  function loadHistory() {
    state.historyStatus = 'loading';
    state.historyErrorMessage = null;
    renderHistory();
    var requestId = ++state.historyRequestId;
    api.listPublished().then(function (result) {
      if (requestId !== state.historyRequestId) { return; }
      state.historyRecords = result.records || [];
      state.historyStatus = 'data';
      renderHistory();
    }, function (err) {
      if (requestId !== state.historyRequestId) { return; }
      state.historyStatus = 'error';
      state.historyErrorMessage = mapApiError(err).message || ERROR_TEXT;
      renderHistory();
    });
  }

  // ── Drafts list rendering ────────────────────────────────────────────

  function renderDrafts() {
    draftsPanel.textContent = '';

    if (state.draftsStatus === 'loading') {
      draftsPanel.appendChild(textEl('div', 'msc-ann-loading', LOADING_TEXT));
      return;
    }
    if (state.draftsStatus === 'error') {
      var errWrap = el('div', 'msc-ann-error-state');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.draftsErrorMessage || ERROR_TEXT));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', loadDrafts);
      errWrap.appendChild(retryBtn);
      draftsPanel.appendChild(errWrap);
      return;
    }
    if (!state.draftRecords.length) {
      draftsPanel.appendChild(textEl('div', 'msc-ann-empty-state', EMPTY_DRAFTS_TEXT));
      return;
    }

    var list = el('div', 'msc-ann-card-list');
    state.draftRecords.forEach(function (record) {
      var card = el('div', 'msc-ann-card msc-ann-card-draft');
      var head = el('div', 'msc-ann-card-head');
      head.appendChild(textEl('h4', 'msc-ann-card-title', record.title || '(untitled)'));
      head.appendChild(textEl('span', 'msc-ann-card-meta', 'Draft · saved ' + formatTimestamp(record.updated_at)));
      card.appendChild(head);
      card.appendChild(textEl('p', 'msc-ann-card-body', record.body || ''));
      var editBtn = el('button', 'msc-btn msc-btn-primary msc-ann-edit-btn');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit Draft';
      editBtn.addEventListener('click', function () { openDraftEditor(record, editBtn); });
      card.appendChild(editBtn);
      list.appendChild(card);
    });
    draftsPanel.appendChild(list);
  }

  function loadDrafts() {
    state.draftsStatus = 'loading';
    state.draftsErrorMessage = null;
    renderDrafts();
    var requestId = ++state.draftsRequestId;
    api.listDrafts().then(function (result) {
      if (requestId !== state.draftsRequestId) { return; }
      state.draftRecords = result.records || [];
      state.draftsStatus = 'data';
      renderDrafts();
    }, function (err) {
      if (requestId !== state.draftsRequestId) { return; }
      state.draftsStatus = 'error';
      state.draftsErrorMessage = mapApiError(err).message || ERROR_TEXT;
      renderDrafts();
    });
  }

  createBtn.addEventListener('click', function () { openDraftEditor(null, createBtn); });

  loadHistory();
  loadDrafts();

  return {
    getState: function () { return state; },
    reload: function () { loadHistory(); loadDrafts(); }
  };
}

// ── Bell (topbar unread notification indicator + dropdown) ──────────────

var POLL_INTERVAL_MS = 30000;

/* Mounted exactly once (initAnnouncements below), inside the topbar
   #announcementBell region (web-view/index.html). Independent of the
   Announcements tab panel — the bell is visible from every tab once
   authenticated, matching #calendarAuthIndicator's own always-in-topbar
   convention. opts.api lets tests inject fixture request functions. */
export function mountAnnouncementBell(rootEl, opts) {
  if (!rootEl) { return null; }
  opts = opts || {};
  var api = opts.api || {
    feed: getNotificationFeed,
    markRead: markNotificationRead
  };

  var pollTimer = null;
  var state = { unreadCount: 0, items: [], open: false };

  rootEl.textContent = '';

  function isAuthorized() { return !!getStoredMemberKey(); }

  if (!isAuthorized()) {
    rootEl.hidden = true;
    return { refresh: function () {}, stop: function () {} };
  }
  rootEl.hidden = false;

  var bellBtn = el('button', 'msc-ann-bell-btn');
  bellBtn.type = 'button';
  bellBtn.setAttribute('aria-haspopup', 'true');
  bellBtn.setAttribute('aria-expanded', 'false');
  bellBtn.setAttribute('aria-label', 'Announcement notifications');
  var bellIcon = textEl('span', 'msc-ann-bell-icon', '🔔');
  bellIcon.setAttribute('aria-hidden', 'true');
  var badge = textEl('span', 'msc-ann-bell-badge', '0');
  badge.hidden = true;
  bellBtn.appendChild(bellIcon);
  bellBtn.appendChild(badge);
  rootEl.appendChild(bellBtn);

  var dropdown = el('div', 'msc-ann-bell-dropdown');
  dropdown.hidden = true;
  dropdown.setAttribute('role', 'menu');
  rootEl.appendChild(dropdown);

  function renderBadge() {
    if (state.unreadCount > 0) {
      badge.hidden = false;
      badge.textContent = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
    } else {
      badge.hidden = true;
    }
  }

  function renderDropdown() {
    dropdown.textContent = '';
    if (!state.items.length) {
      dropdown.appendChild(textEl('p', 'msc-ann-bell-empty', 'No mentions yet.'));
      return;
    }
    var list = el('ul', 'msc-ann-bell-list');
    state.items.forEach(function (item) {
      var li = el('li', 'msc-ann-bell-item' + (item.read_at ? '' : ' msc-ann-bell-item-unread'));
      li.setAttribute('role', 'menuitem');
      var btn = el('button', 'msc-ann-bell-item-btn');
      btn.type = 'button';
      var title = textEl('span', 'msc-ann-bell-item-title', '@You were mentioned — ' + item.title);
      var meta = textEl('span', 'msc-ann-bell-item-meta', formatTimestamp(item.published_at));
      btn.appendChild(title);
      btn.appendChild(meta);
      btn.addEventListener('click', function () {
        if (!item.read_at) {
          api.markRead(item.mention_id).then(function () {
            refresh();
          }, function () {
            // Non-fatal — badge simply stays stale until the next poll.
          });
        }
        closeDropdown();
        if (typeof opts.onOpenAnnouncement === 'function') { opts.onOpenAnnouncement(item.announcement_id); }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    dropdown.appendChild(list);
  }

  function openDropdown() {
    state.open = true;
    dropdown.hidden = false;
    bellBtn.setAttribute('aria-expanded', 'true');
  }
  function closeDropdown() {
    state.open = false;
    dropdown.hidden = true;
    bellBtn.setAttribute('aria-expanded', 'false');
  }

  bellBtn.addEventListener('click', function () {
    if (state.open) { closeDropdown(); return; }
    openDropdown();
    refresh();
  });
  document.addEventListener('click', function (e) {
    if (state.open && !rootEl.contains(e.target)) { closeDropdown(); }
  });

  function refresh() {
    return api.feed(20).then(function (result) {
      state.unreadCount = result.unread_count || 0;
      state.items = result.items || [];
      renderBadge();
      if (state.open) { renderDropdown(); }
    }, function () {
      // Silent — a failed poll must never surface a toast/error UI; the
      // badge simply keeps its last-known value until the next successful poll.
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(function () {
      if (document.visibilityState === 'visible' && isAuthorized()) { refresh(); }
    }, POLL_INTERVAL_MS);
  }
  function stopPolling() {
    if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; }
  }

  refresh();
  startPolling();

  return { refresh: refresh, stop: stopPolling };
}

// ── Wiring ────────────────────────────────────────────────────────────

export function initAnnouncements() {
  var mountEl = document.getElementById('announcementsWorkspace');
  var bellRootEl = document.getElementById('announcementBell');

  var currentWorkspace = mountEl
    ? mountAnnouncementsWorkspace(mountEl, { onChanged: function () { if (currentBell) { currentBell.refresh(); } } })
    : null;
  var currentBell = bellRootEl ? mountAnnouncementBell(bellRootEl) : null;

  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, function () {
    if (currentBell) { currentBell.stop(); }
    if (mountEl) {
      currentWorkspace = mountAnnouncementsWorkspace(mountEl, {
        onChanged: function () { if (currentBell) { currentBell.refresh(); } }
      });
    }
    if (bellRootEl) { currentBell = mountAnnouncementBell(bellRootEl); }
  });

  return { workspace: currentWorkspace, bell: currentBell };
}
