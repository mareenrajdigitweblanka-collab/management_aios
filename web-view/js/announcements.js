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

import { ANNOUNCEMENTS_API_BASE, ANNOUNCEMENTS_WS_BASE } from './config.js';
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
export var EMPTY_NOTIFICATIONS_TEXT = 'You have no notifications yet.';
export var LOADING_TEXT = 'Loading announcements...';
export var ERROR_TEXT = 'Unable to load announcements.';

/* GET /api/announcements/notifications caps `limit` at 100
   (backend/routers/announcements.py: Query(default=20, ge=1, le=100)) —
   unlike listPublished/listDrafts, which allow up to 500. The
   Notification History tab requests the endpoint's actual maximum, not
   the 200 those other lists use. */
var NOTIFICATION_HISTORY_LIMIT = 100;

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

/* REQ-ANN-001 Stage B (2026-08-12) — issues a short-lived (<=60s) signed
   ticket for the realtime WebSocket. Goes through the exact same
   authenticated request path (annProtectedRequest -> ensureAuthorized ->
   Authorization: Bearer <token>) as every other call in this file — the
   long-lived member token never leaves this one place; only the returned
   ticket is ever used to open the socket (mountAnnouncementBell below). */
export function getWsTicket() {
  return annProtectedRequest('/ws-ticket', { method: 'POST' });
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
    readReceipts: getReadReceipts,
    notifications: getNotificationFeed,
    markRead: markNotificationRead
  };
  var onChanged = typeof opts.onChanged === 'function' ? opts.onChanged : function () {};

  var state = {
    view: 'history', // 'history' | 'drafts' | 'notifications'
    historyStatus: 'loading', // 'loading' | 'data' | 'empty' | 'error'
    historyRecords: [],
    historyErrorMessage: null,
    historyRequestId: 0,
    draftsStatus: 'loading',
    draftRecords: [],
    draftsErrorMessage: null,
    draftsRequestId: 0,
    notificationsStatus: 'loading',
    notificationItems: [],
    notificationsErrorMessage: null,
    notificationsRequestId: 0
  };

  mountEl.textContent = '';

  function isAuthorized() { return !!getStoredMemberKey(); }

  if (!isAuthorized()) {
    mountEl.appendChild(buildAuthRequiredNotice('announcements'));
    return { getState: function () { return state; }, reload: function () {}, showNotificationHistory: function () {} };
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

  var notificationsTabBtn = el('button', 'msc-ann-view-tab');
  notificationsTabBtn.type = 'button';
  notificationsTabBtn.id = 'msc-ann-view-tab-notifications';
  notificationsTabBtn.setAttribute('role', 'tab');
  notificationsTabBtn.setAttribute('aria-controls', 'msc-ann-view-panel-notifications');
  notificationsTabBtn.textContent = 'Notification History';

  viewTabs.appendChild(historyTabBtn);
  viewTabs.appendChild(draftsTabBtn);
  viewTabs.appendChild(notificationsTabBtn);
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

  var notificationsPanel = el('div', 'msc-ann-view-panel');
  notificationsPanel.id = 'msc-ann-view-panel-notifications';
  notificationsPanel.setAttribute('role', 'tabpanel');
  notificationsPanel.setAttribute('aria-labelledby', 'msc-ann-view-tab-notifications');
  notificationsPanel.hidden = true;
  mountEl.appendChild(notificationsPanel);

  function setView(view) {
    state.view = view;
    historyTabBtn.classList.toggle('msc-ann-view-tab-active', view === 'history');
    draftsTabBtn.classList.toggle('msc-ann-view-tab-active', view === 'drafts');
    notificationsTabBtn.classList.toggle('msc-ann-view-tab-active', view === 'notifications');
    historyTabBtn.setAttribute('aria-selected', view === 'history' ? 'true' : 'false');
    draftsTabBtn.setAttribute('aria-selected', view === 'drafts' ? 'true' : 'false');
    notificationsTabBtn.setAttribute('aria-selected', view === 'notifications' ? 'true' : 'false');
    historyPanel.hidden = view !== 'history';
    draftsPanel.hidden = view !== 'drafts';
    notificationsPanel.hidden = view !== 'notifications';
    // Switching TO Notification History is a plain tab switch, not a read
    // action — it must never mark anything read (REQ-ANN-001 Stage A §10).
    // Only the per-item click handler in openNotificationItem() below ever
    // calls api.markRead.
  }
  historyTabBtn.addEventListener('click', function () { setView('history'); });
  draftsTabBtn.addEventListener('click', function () { setView('drafts'); });
  notificationsTabBtn.addEventListener('click', function () { setView('notifications'); });
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

    // A member cannot mention themselves (REQ-ANN-001 Stage A). Filters the
    // one existing target list — no second member source — against the
    // currently authenticated member, so the option is never offered.
    var currentMemberKey = getStoredMemberKey();
    var pickerTargets = MENTION_TARGET_ORDER.filter(function (key) { return key !== currentMemberKey; });

    pickerTargets.forEach(function (key) {
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

  // ── Notification History (current member only) ──────────────────────
  //
  // Scoped entirely by the existing GET /api/announcements/notifications
  // route (acting_member is always server-derived — never another
  // member's feed). Newest-notified-first is already the API's own order
  // (notified_at DESC — see backend/routers/announcements.py
  // _notification_query); this view renders that order verbatim, no
  // client-side re-sort.

  function openNotificationItem(item, trigger) {
    function showAnnouncement() {
      ensureModal().open(item.title, function (bodyEl) {
        bodyEl.appendChild(textEl('p', 'msc-ann-loading', 'Loading announcement…'));
        api.detail(item.announcement_id).then(function (record) {
          bodyEl.textContent = '';
          bodyEl.appendChild(textEl(
            'p', 'msc-ann-card-meta',
            '@' + displayName(record.created_by) + ' · ' + formatTimestamp(record.published_at)
          ));
          bodyEl.appendChild(textEl('p', 'msc-ann-card-body', record.body));
        }, function (err) {
          bodyEl.textContent = '';
          bodyEl.appendChild(textEl('p', 'msc-ann-error', mapApiError(err).message));
        });
      }, trigger);
    }

    // Idempotent by construction: an already-read item never calls
    // api.markRead again — it just opens the announcement. Only an unread
    // item's click marks THAT ONE mention read; every other item's
    // read/unread state (this member's other notifications, and every
    // other member's own notification list) is untouched.
    if (item.read_at) {
      showAnnouncement();
      return;
    }
    api.markRead(item.mention_id).then(function (updated) {
      item.read_at = updated.read_at;
      renderNotificationHistory();
      onChanged(); // refreshes the bell's unread badge
      showAnnouncement();
    }, function () {
      // Non-fatal — the member can still view the announcement even if the
      // read-marking call failed; the item just stays visually unread
      // until the next successful mark/poll.
      showAnnouncement();
    });
  }

  function renderNotificationHistory() {
    notificationsPanel.textContent = '';

    if (state.notificationsStatus === 'loading') {
      notificationsPanel.appendChild(textEl('div', 'msc-ann-loading', LOADING_TEXT));
      return;
    }
    if (state.notificationsStatus === 'error') {
      var errWrap = el('div', 'msc-ann-error-state');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.notificationsErrorMessage || ERROR_TEXT));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', loadNotificationHistory);
      errWrap.appendChild(retryBtn);
      notificationsPanel.appendChild(errWrap);
      return;
    }
    if (!state.notificationItems.length) {
      notificationsPanel.appendChild(textEl('div', 'msc-ann-empty-state', EMPTY_NOTIFICATIONS_TEXT));
      return;
    }

    var list = el('ul', 'msc-ann-notification-list');
    state.notificationItems.forEach(function (item) {
      var li = el('li', 'msc-ann-notification-item' + (item.read_at ? '' : ' msc-ann-notification-item-unread'));
      var btn = el('button', 'msc-ann-notification-item-btn');
      btn.type = 'button';
      btn.appendChild(textEl('span', 'msc-ann-notification-item-title', item.title));
      btn.appendChild(textEl(
        'span', 'msc-ann-notification-item-meta',
        '@' + displayName(item.created_by) + ' · ' + formatTimestamp(item.published_at)
      ));
      if (item.body_preview) {
        btn.appendChild(textEl('span', 'msc-ann-notification-item-preview', item.body_preview));
      }
      btn.appendChild(textEl(
        'span',
        item.read_at ? 'msc-ann-notification-item-read' : 'msc-ann-notification-item-unread-label',
        item.read_at ? 'Read' : 'Unread'
      ));
      btn.addEventListener('click', function () { openNotificationItem(item, btn); });
      li.appendChild(btn);
      list.appendChild(li);
    });
    notificationsPanel.appendChild(list);
  }

  function loadNotificationHistory() {
    state.notificationsStatus = 'loading';
    state.notificationsErrorMessage = null;
    renderNotificationHistory();
    var requestId = ++state.notificationsRequestId;
    api.notifications(NOTIFICATION_HISTORY_LIMIT).then(function (result) {
      if (requestId !== state.notificationsRequestId) { return; }
      state.notificationItems = result.items || [];
      state.notificationsStatus = 'data';
      renderNotificationHistory();
    }, function (err) {
      if (requestId !== state.notificationsRequestId) { return; }
      state.notificationsStatus = 'error';
      state.notificationsErrorMessage = mapApiError(err).message || ERROR_TEXT;
      renderNotificationHistory();
    });
  }

  createBtn.addEventListener('click', function () { openDraftEditor(null, createBtn); });

  loadHistory();
  loadDrafts();
  loadNotificationHistory();

  return {
    getState: function () { return state; },
    reload: function () { loadHistory(); loadDrafts(); loadNotificationHistory(); },
    showNotificationHistory: function () { setView('notifications'); }
  };
}

// ── Bell (topbar unread-count indicator) ─────────────────────────────────

var POLL_INTERVAL_MS = 30000;

/* REQ-ANN-001 Stage B — bounded reconnect backoff (ms), capped at 30s, per
   opts.onOpenHistory-style explicit design. Reset to the first entry on
   every stable connection (see connectRealtimeSocket's onopen below), so a
   brief outage never leaves a socket waiting the full 30s to try again
   after recovering. */
var WS_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

/* Mounted exactly once (initAnnouncements below), inside the topbar
   #announcementBell region (web-view/index.html). Independent of the
   Announcements tab panel — the bell is visible from every tab once
   authenticated, matching #calendarAuthIndicator's own always-in-topbar
   convention. opts.api lets tests inject fixture request functions.

   REQ-ANN-001 Stage A §12: the bell is a navigation trigger, not a
   popover. It no longer owns a dropdown or any mark-read logic — clicking
   it opens the Announcements module's Notification History tab (the one
   persistent, primary destination for notifications; see
   mountAnnouncementsWorkspace's notifications view above), which owns all
   per-item rendering and read-marking. This removes the previous
   dropdown's separate, parallel notification-item rendering entirely
   rather than maintaining two implementations that could drift.

   REQ-ANN-001 Stage B (2026-08-12) — this is also the ONE lifecycle owner
   for the realtime WebSocket fast path (never scattered across app.js/
   auth-gate.js/navigation.js/individual tabs). The socket carries exactly
   one signal, {"type":"announcement_notification_changed"}; on receipt
   this module does nothing but call the SAME refresh() the 30s poll
   already uses, plus opts.onRealtimeSignal() so the Notification History
   tab (if mounted) can reload too — PostgreSQL via the existing HTTP API
   remains the only source of truth either way. Polling and the visibility
   refresh are both left completely unchanged and keep running regardless
   of socket state — this is a latency optimization only, never a
   replacement (see backend/routers/announcements.py's module docstring
   for the explicit single-instance/best-effort delivery limitation). */
export function mountAnnouncementBell(rootEl, opts) {
  if (!rootEl) { return null; }
  opts = opts || {};
  var api = opts.api || { feed: getNotificationFeed, wsTicket: getWsTicket };
  var WebSocketImpl = opts.WebSocketImpl || (typeof window !== 'undefined' ? window.WebSocket : undefined);

  var pollTimer = null;
  var state = { unreadCount: 0 };

  rootEl.textContent = '';

  function isAuthorized() { return !!getStoredMemberKey(); }

  if (!isAuthorized()) {
    rootEl.hidden = true;
    return { refresh: function () {}, stop: function () {} };
  }
  rootEl.hidden = false;

  var bellBtn = el('button', 'msc-ann-bell-btn');
  bellBtn.type = 'button';
  bellBtn.setAttribute('aria-label', 'Open notification history');
  var bellIcon = textEl('span', 'msc-ann-bell-icon', '🔔');
  bellIcon.setAttribute('aria-hidden', 'true');
  var badge = textEl('span', 'msc-ann-bell-badge', '0');
  badge.hidden = true;
  bellBtn.appendChild(bellIcon);
  bellBtn.appendChild(badge);
  rootEl.appendChild(bellBtn);

  function renderBadge() {
    if (state.unreadCount > 0) {
      badge.hidden = false;
      badge.textContent = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
    } else {
      badge.hidden = true;
    }
  }

  bellBtn.addEventListener('click', function () {
    refresh();
    if (typeof opts.onOpenHistory === 'function') { opts.onOpenHistory(); }
  });

  function refresh() {
    return api.feed(20).then(function (result) {
      state.unreadCount = result.unread_count || 0;
      renderBadge();
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

  /* REQ-ANN-001 Stage A §13: the one polling UX fix in scope for this
     stage — the interval itself stays 30s, but the badge no longer waits
     up to a full tick after the tab regains focus. Removed on stop() so a
     remounted bell (auth-change) never accumulates a second listener. */
  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && isAuthorized()) { refresh(); }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ── Realtime WebSocket fast path (REQ-ANN-001 Stage B) ────────────────

  var wsSocket = null;
  var wsConnecting = false;
  var wsReconnectTimer = null;
  var wsReconnectAttempt = 0;
  var wsStopped = false;

  function clearWsReconnectTimer() {
    if (wsReconnectTimer) { window.clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  }

  // Never a duplicate pending reconnect (the wsReconnectTimer guard) —
  // bounded at WS_RECONNECT_DELAYS_MS's last entry (30s), never an
  // infinite rapid-retry loop.
  function scheduleWsReconnect() {
    if (wsStopped || wsReconnectTimer) { return; }
    var delay = WS_RECONNECT_DELAYS_MS[Math.min(wsReconnectAttempt, WS_RECONNECT_DELAYS_MS.length - 1)];
    wsReconnectAttempt += 1;
    wsReconnectTimer = window.setTimeout(function () {
      wsReconnectTimer = null;
      connectRealtimeSocket();
    }, delay);
  }

  // One socket only: guarded by wsSocket (already open/connected) AND
  // wsConnecting (a ticket request already in flight, before wsSocket is
  // assigned) — closes the race window where two calls could each fetch
  // their own ticket and open two sockets.
  function connectRealtimeSocket() {
    if (wsStopped || !isAuthorized() || !WebSocketImpl || wsSocket || wsConnecting) { return; }
    if (typeof api.wsTicket !== 'function') { return; } // no ticket source configured — polling-only, no error
    wsConnecting = true;
    api.wsTicket().then(function (result) {
      wsConnecting = false;
      if (wsStopped || !isAuthorized()) { return; } // auth changed while the ticket request was in flight
      var socket = new WebSocketImpl(ANNOUNCEMENTS_WS_BASE + '/ws?ticket=' + encodeURIComponent(result.ticket));
      wsSocket = socket;
      socket.onopen = function () {
        wsReconnectAttempt = 0; // stable connection — reset backoff
        refresh(); // immediate HTTP refresh on (re)connect, same as tab-visibility return
      };
      socket.onmessage = function (event) {
        var payload;
        try { payload = JSON.parse(event.data); } catch (e) { return; }
        // The ONLY event this protocol defines. Content is never trusted —
        // it only tells this client to re-fetch authoritative state.
        if (payload && payload.type === 'announcement_notification_changed') {
          refresh();
          if (typeof opts.onRealtimeSignal === 'function') { opts.onRealtimeSignal(); }
        }
      };
      socket.onclose = function () {
        if (wsSocket === socket) { wsSocket = null; }
        if (!wsStopped) { scheduleWsReconnect(); }
      };
      socket.onerror = function () {
        // A WebSocket always fires close after error — reconnect is
        // scheduled from onclose only, never duplicated here.
      };
    }, function () {
      // Ticket request failed (feature unavailable, network blip, auth
      // lost mid-flight) — polling remains the correctness fallback;
      // retry with the same bounded backoff as a dropped connection.
      wsConnecting = false;
      if (!wsStopped) { scheduleWsReconnect(); }
    });
  }

  function stopRealtimeSocket() {
    wsStopped = true;
    clearWsReconnectTimer();
    if (wsSocket) {
      var socket = wsSocket;
      wsSocket = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
  }

  refresh();
  startPolling();
  connectRealtimeSocket();

  return {
    refresh: refresh,
    stop: function () {
      stopPolling();
      stopRealtimeSocket();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

// ── Wiring ────────────────────────────────────────────────────────────

export function initAnnouncements() {
  var mountEl = document.getElementById('announcementsWorkspace');
  var bellRootEl = document.getElementById('announcementBell');

  /* Bell click → primary destination (REQ-ANN-001 Stage A §12): activate
     the Announcements sidebar tab via its own real nav button (reuses
     navigation.js's existing activatePanel gating verbatim — same
     technique as the member snapshot cards' [data-goto] jump — no new
     panel-switching code path), then switch the workspace's own view to
     Notification History. currentWorkspace is read at call time (bell
     clicks always happen after both mounts have run), same lazy-closure
     convention onChanged already uses below for currentBell. */
  function openAnnouncementsNotificationHistory() {
    var navBtn = document.querySelector('.app-nav-btn[data-tab="announcements"]');
    if (navBtn) { navBtn.click(); }
    if (currentWorkspace && typeof currentWorkspace.showNotificationHistory === 'function') {
      currentWorkspace.showNotificationHistory();
    }
  }

  /* REQ-ANN-001 Stage B — the realtime signal's only job is "reload
     whatever the workspace is currently showing," reusing the workspace's
     own existing reload() (History + Drafts + Notification History)
     verbatim rather than adding a narrower, second reload path. */
  function reloadWorkspaceOnRealtimeSignal() {
    if (currentWorkspace && typeof currentWorkspace.reload === 'function') { currentWorkspace.reload(); }
  }

  var currentWorkspace = mountEl
    ? mountAnnouncementsWorkspace(mountEl, { onChanged: function () { if (currentBell) { currentBell.refresh(); } } })
    : null;
  var currentBell = bellRootEl
    ? mountAnnouncementBell(bellRootEl, {
        onOpenHistory: openAnnouncementsNotificationHistory,
        onRealtimeSignal: reloadWorkspaceOnRealtimeSignal
      })
    : null;

  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, function () {
    if (currentBell) { currentBell.stop(); }
    if (mountEl) {
      currentWorkspace = mountAnnouncementsWorkspace(mountEl, {
        onChanged: function () { if (currentBell) { currentBell.refresh(); } }
      });
    }
    if (bellRootEl) {
      currentBell = mountAnnouncementBell(bellRootEl, {
        onOpenHistory: openAnnouncementsNotificationHistory,
        onRealtimeSignal: reloadWorkspaceOnRealtimeSignal
      });
    }
  });

  return { workspace: currentWorkspace, bell: currentBell };
}
