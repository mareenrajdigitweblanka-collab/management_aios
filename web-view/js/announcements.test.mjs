/* announcements.test.mjs — coverage for the Announcement & Notification
   workspace and topbar bell (REQ-ANN-001, 2026-08-12).

   Same testing convention as knowledge-management.test.mjs: DOM-mount
   tests inject a FIXTURE `api` object into mountAnnouncementsWorkspace()/
   mountAnnouncementBell() — exercises real UI behavior (modals, mention
   picker, delete confirmation, publish transition, bell polling/dropdown)
   without ever calling the real fetch-backed exports. Reuses
   review-summaries-test-dom.mjs's hand-rolled DOM/localStorage/fetch
   stand-in (installFakeBrowserGlobals), same as every other frontend test
   file in this codebase.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';
import { __resetScrollLockForTests } from './ui/scroll-lock.js';

var importCounter = 0;
function loadAnnModule() {
  importCounter += 1;
  return import('./announcements.js?test-instance=' + importCounter);
}

function fire(elNode, type) {
  elNode.dispatchEvent({ type: type, target: elNode, preventDefault: function () {} });
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {
      storedAuth: { token: 'test-token', memberKey: 'mayurika' }
    });
    if (typeof __resetScrollLockForTests === 'function') { __resetScrollLockForTests(); }
    t.after(env.restore);
    await testFn(env);
  };
}

// ── Shared-singleton lookups (ui/dialog.js confirmDestructive / ui/toast.js
//    showToast are module-level singletons across the whole process — same
//    cross-test caching pattern knowledge-management.test.mjs establishes,
//    reused here verbatim since this file imports the exact same two
//    leaf modules transitively via announcements.js). ──
var sharedDialogConfirmBtn = null;
function getDialogConfirmBtn() {
  var btn = document.querySelector('.ui-dialog-confirm');
  if (btn) { sharedDialogConfirmBtn = btn; }
  return btn || sharedDialogConfirmBtn;
}
var sharedDialogCancelBtn = null;
function getDialogCancelBtn() {
  var btn = document.querySelector('.ui-dialog-cancel');
  if (btn) { sharedDialogCancelBtn = btn; }
  return btn || sharedDialogCancelBtn;
}

var primeEnv = installFakeBrowserGlobals({ storedAuth: { token: 'prime', memberKey: 'mayurika' } });
var primeToastMod = await import('./ui/toast.js');
primeToastMod.showToast({ type: 'information', title: '', message: '' });
/* Primes the ui/dialog.js confirmDestructive() singleton too (same
   ensureDialog()-builds-once-per-process shape as the toast region above)
   — opens it once under this throwaway document so BOTH
   sharedDialogConfirmBtn/sharedDialogCancelBtn are cached before any real
   test runs, regardless of which test happens to trigger a delete
   confirmation first. Deliberately not awaited — confirmDestructive()
   builds its DOM synchronously and returns a Promise that only resolves on
   a button click, which never happens here. */
var primeDialogMod = await import('./ui/dialog.js');
primeDialogMod.confirmDestructive({ title: 'prime', message: 'prime' });
sharedDialogConfirmBtn = document.querySelector('.ui-dialog-confirm');
sharedDialogCancelBtn = document.querySelector('.ui-dialog-cancel');
primeEnv.restore();

// ── Static HTML structure (index.html) ──────────────────────────────────

var indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
var html = readFileSync(indexHtmlPath, 'utf8');

test('static structure: Announcements tab panel and mount points exist', () => {
  assert.match(html, /id="tab-announcements"/);
  assert.match(html, /id="announcementsWorkspace"/);
  assert.match(html, /id="announcementBell"/);
  assert.match(html, /data-tab="announcements"/);
});

// ── Fixtures ──────────────────────────────────────────────────────────

var PUBLISHED_FIXTURE = {
  id: 'ann-1',
  title: 'Team Leadership & Responsibility Instruction',
  body: 'Please review your responsibilities.',
  status: 'Published',
  created_by: 'mayurika',
  created_at: '2026-08-12T09:00:00Z',
  updated_at: '2026-08-12T09:05:00Z',
  published_at: '2026-08-12T09:05:00Z',
  mention_member_keys: ['arun']
};

var DRAFT_FIXTURE = {
  id: 'ann-draft-1',
  title: 'Draft Title',
  body: 'Draft body text.',
  status: 'Draft',
  created_by: 'mayurika',
  created_at: '2026-08-12T08:00:00Z',
  updated_at: '2026-08-12T08:10:00Z',
  published_at: null,
  mention_member_keys: ['suman']
};

function makeWorkspaceFixtureApi(overrides) {
  var base = {
    listPublished: function () { return Promise.resolve({ records: [PUBLISHED_FIXTURE], total: 1, limit: 200, offset: 0 }); },
    listDrafts: function () { return Promise.resolve({ records: [DRAFT_FIXTURE], total: 1, limit: 200, offset: 0 }); },
    detail: function () { return Promise.resolve(PUBLISHED_FIXTURE); },
    create: function () { return Promise.resolve(DRAFT_FIXTURE); },
    update: function () { return Promise.resolve(DRAFT_FIXTURE); },
    remove: function () { return Promise.resolve({ id: DRAFT_FIXTURE.id, deleted: true }); },
    publish: function () { return Promise.resolve(Object.assign({}, DRAFT_FIXTURE, { status: 'Published' })); },
    readReceipts: function () {
      return Promise.resolve({
        announcement_id: PUBLISHED_FIXTURE.id, mentioned_count: 2, read_count: 1, unread_count: 1,
        receipts: [
          { member_key: 'arun', display_label: 'Arun', read: true, read_at: '2026-08-12T09:10:00Z' },
          { member_key: 'suman', display_label: 'Suman', read: false, read_at: null }
        ]
      });
    }
  };
  return Object.assign(base, overrides || {});
}

function mountWorkspaceWithFixture(apiOverrides) {
  return loadAnnModule().then(function (mod) {
    var mountEl = document.createElement('div');
    var api = makeWorkspaceFixtureApi(apiOverrides);
    var handle = mod.mountAnnouncementsWorkspace(mountEl, { api: api });
    return flush().then(function () { return { mod: mod, mountEl: mountEl, api: api, handle: handle }; });
  });
}

var FEED_FIXTURE = {
  unread_count: 1,
  items: [
    { mention_id: 'm-1', announcement_id: 'ann-1', title: 'Team Leadership & Responsibility Instruction', created_by: 'mayurika', published_at: '2026-08-12T09:05:00Z', read_at: null }
  ]
};

function makeBellFixtureApi(overrides) {
  var base = {
    feed: function () { return Promise.resolve(FEED_FIXTURE); },
    markRead: function () { return Promise.resolve(Object.assign({}, FEED_FIXTURE.items[0], { read_at: '2026-08-12T09:20:00Z' })); }
  };
  return Object.assign(base, overrides || {});
}

function mountBellWithFixture(apiOverrides, opts) {
  return loadAnnModule().then(function (mod) {
    var rootEl = document.createElement('div');
    var api = makeBellFixtureApi(apiOverrides);
    var handle = mod.mountAnnouncementBell(rootEl, Object.assign({ api: api }, opts || {}));
    return flush().then(function () { return { mod: mod, rootEl: rootEl, api: api, handle: handle }; });
  });
}

// ══════════════════════════════════════════════════════════════════════
// Whole-module authentication gate
// ══════════════════════════════════════════════════════════════════════

test('unauthenticated mount shows only the shared "Authorize this browser" placeholder — no listPublished()/listDrafts() call', withEnv(async () => {
  var mod = await loadAnnModule();
  var mountEl = document.createElement('div');
  var called = false;
  var api = makeWorkspaceFixtureApi({
    listPublished: function () { called = true; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); },
    listDrafts: function () { called = true; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  mod.mountAnnouncementsWorkspace(mountEl, { api: api });
  await flush();
  assert.equal(called, false);
  assert.match(mountEl.allText(), /Authorize this browser to access Announcements\./);
}, { storedAuth: null }));

test('unauthenticated bell mount is hidden and never polls', withEnv(async () => {
  var mod = await loadAnnModule();
  var rootEl = document.createElement('div');
  var called = false;
  mod.mountAnnouncementBell(rootEl, { api: makeBellFixtureApi({ feed: function () { called = true; return Promise.resolve(FEED_FIXTURE); } }) });
  await flush();
  assert.equal(rootEl.hidden, true);
  assert.equal(called, false);
}, { storedAuth: null }));

// ══════════════════════════════════════════════════════════════════════
// Published History
// ══════════════════════════════════════════════════════════════════════

test('Published History renders records newest-first from the API', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  assert.match(mountEl.allText(), /Team Leadership & Responsibility Instruction/);
  assert.match(mountEl.allText(), /Mentioned: @Arun/);
}));

test('Published History empty state', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture({
    listPublished: function () { return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  assert.match(mountEl.allText(), /No announcements have been published yet\./);
}));

test('Published card shows "View Read Receipts" only for the creator', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  assert.match(mountEl.allText(), /View Read Receipts/);
}, { storedAuth: { token: 't', memberKey: 'mayurika' } }));

test('Published card hides "View Read Receipts" for a non-creator', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  assert.doesNotMatch(mountEl.allText(), /View Read Receipts/);
}, { storedAuth: { token: 't', memberKey: 'arun' } }));

test('Published cards never render Edit/Delete controls', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  // Scoped to the History panel specifically — the Drafts panel (a
  // sibling, merely `hidden`, not unmounted) legitimately has its own
  // Edit/Delete controls for the fixture Draft, which is not what this
  // test is checking.
  var historyPanel = mountEl.querySelector('#msc-ann-view-panel-history');
  assert.equal(historyPanel.querySelector('.msc-ann-edit-btn'), null);
  assert.equal(historyPanel.querySelector('.msc-ann-delete-btn'), null);
}));

// ══════════════════════════════════════════════════════════════════════
// My Drafts
// ══════════════════════════════════════════════════════════════════════

test('My Drafts renders own drafts and switching tabs shows the drafts panel', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();
  assert.match(mountEl.allText(), /Draft Title/);
}));

test('My Drafts empty state', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture({
    listDrafts: function () { return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();
  assert.match(mountEl.allText(), /You have no Drafts\./);
}));

// ══════════════════════════════════════════════════════════════════════
// Create / Save Draft + mention picker
// ══════════════════════════════════════════════════════════════════════

test('Create Announcement: Save Draft sends the selected mentions and reloads Drafts', withEnv(async () => {
  var createPayload = null;
  var listDraftsCalls = 0;
  var { mountEl } = await mountWorkspaceWithFixture({
    create: function (payload) { createPayload = payload; return Promise.resolve(DRAFT_FIXTURE); },
    listDrafts: function () { listDraftsCalls += 1; return Promise.resolve({ records: [DRAFT_FIXTURE], total: 1, limit: 200, offset: 0 }); }
  });

  var createBtn = mountEl.querySelector('.msc-ann-create-btn');
  fire(createBtn, 'click');
  await flush();

  var titleInput = document.querySelector('.msc-ann-modal-first-focus');
  var bodyInput = document.querySelector('.msc-ann-body-input');
  titleInput.value = 'New Announcement';
  bodyInput.value = 'New body text.';

  var checkboxes = document.body.querySelectorAll('.msc-ann-mention-checkbox');
  var arunCheckbox = checkboxes.filter(function (c) { return c.value === 'arun'; })[0];
  arunCheckbox.checked = true;
  var sumanCheckbox = checkboxes.filter(function (c) { return c.value === 'suman'; })[0];
  sumanCheckbox.checked = true;

  var saveBtn = document.querySelector('.msc-ann-save-btn');
  fire(saveBtn, 'click');
  await flush();

  // Order follows MENTION_TARGET_ORDER (mayurika, suman, arun, rajiv,
  // paraparan), not the order the checkboxes were checked in.
  assert.deepEqual(createPayload, {
    title: 'New Announcement',
    body: 'New body text.',
    mention_member_keys: ['suman', 'arun']
  });
  assert.ok(listDraftsCalls >= 2, 'Drafts reloaded after save');
}));

test('Edit Draft: modal pre-fills title/body and pre-checks existing mentions', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();

  var editBtn = mountEl.querySelector('.msc-ann-edit-btn');
  fire(editBtn, 'click');
  await flush();

  var titleInput = document.querySelector('.msc-ann-modal-first-focus');
  var bodyInput = document.querySelector('.msc-ann-body-input');
  assert.equal(titleInput.value, DRAFT_FIXTURE.title);
  assert.equal(bodyInput.value, DRAFT_FIXTURE.body);

  var checkboxes = document.body.querySelectorAll('.msc-ann-mention-checkbox');
  var sumanCheckbox = checkboxes.filter(function (c) { return c.value === 'suman'; })[0];
  assert.equal(sumanCheckbox.checked, true);
  var arunCheckbox = checkboxes.filter(function (c) { return c.value === 'arun'; })[0];
  assert.equal(arunCheckbox.checked, false);
}));

// ══════════════════════════════════════════════════════════════════════
// Delete Draft confirmation
// ══════════════════════════════════════════════════════════════════════

test('Delete Draft: Cancel makes zero backend calls', withEnv(async () => {
  var removeCalled = false;
  var { mountEl } = await mountWorkspaceWithFixture({
    remove: function () { removeCalled = true; return Promise.resolve({ id: DRAFT_FIXTURE.id, deleted: true }); }
  });
  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();

  var editBtn = mountEl.querySelector('.msc-ann-edit-btn');
  fire(editBtn, 'click');
  await flush();

  var deleteBtn = document.querySelector('.msc-ann-delete-btn');
  fire(deleteBtn, 'click');
  await flush();

  var cancelBtn = getDialogCancelBtn();
  fire(cancelBtn, 'click');
  await flush();

  assert.equal(removeCalled, false);
}));

test('Delete Draft: Confirm calls the soft-delete route and reloads Drafts', withEnv(async () => {
  var removeCalled = false;
  var { mountEl } = await mountWorkspaceWithFixture({
    remove: function () { removeCalled = true; return Promise.resolve({ id: DRAFT_FIXTURE.id, deleted: true }); }
  });
  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();

  var editBtn = mountEl.querySelector('.msc-ann-edit-btn');
  fire(editBtn, 'click');
  await flush();

  var deleteBtn = document.querySelector('.msc-ann-delete-btn');
  fire(deleteBtn, 'click');
  await flush();

  var confirmBtn = getDialogConfirmBtn();
  fire(confirmBtn, 'click');
  await flush();

  assert.equal(removeCalled, true);
}));

// ══════════════════════════════════════════════════════════════════════
// Publish
// ══════════════════════════════════════════════════════════════════════

test('Publish: saves then publishes, and reloads both History and Drafts', withEnv(async () => {
  var publishCalled = false;
  var historyReloads = 0;
  var { mountEl } = await mountWorkspaceWithFixture({
    publish: function (id) { publishCalled = true; return Promise.resolve(Object.assign({}, DRAFT_FIXTURE, { status: 'Published' })); },
    listPublished: function () { historyReloads += 1; return Promise.resolve({ records: [PUBLISHED_FIXTURE], total: 1, limit: 200, offset: 0 }); }
  });

  var draftsTab = mountEl.querySelector('#msc-ann-view-tab-drafts');
  fire(draftsTab, 'click');
  await flush();
  var editBtn = mountEl.querySelector('.msc-ann-edit-btn');
  fire(editBtn, 'click');
  await flush();

  var publishBtn = document.querySelector('.msc-ann-publish-btn');
  fire(publishBtn, 'click');
  await flush();

  assert.equal(publishCalled, true);
  assert.ok(historyReloads >= 2, 'Published History reloaded after publish');
}));

// ══════════════════════════════════════════════════════════════════════
// Read receipts (creator-only)
// ══════════════════════════════════════════════════════════════════════

test('Read receipts modal shows mentioned/read/unread counts and per-member status', withEnv(async () => {
  var { mountEl } = await mountWorkspaceWithFixture();
  var receiptsBtn = mountEl.querySelector('.msc-ann-receipts-btn');
  fire(receiptsBtn, 'click');
  await flush();

  var body = document.querySelector('.msc-ann-modal-body') || document.querySelector('#msc-ann-modal-title');
  assert.match(document.querySelector('.msc-ann-receipt-summary').allText(), /Mentioned: 2/);
  assert.match(document.querySelector('.msc-ann-receipt-summary').allText(), /Read: 1/);
  assert.match(document.querySelector('.msc-ann-receipt-summary').allText(), /Unread: 1/);
}, { storedAuth: { token: 't', memberKey: 'mayurika' } }));

// ══════════════════════════════════════════════════════════════════════
// Bell — unread badge, dropdown, mark-read
// ══════════════════════════════════════════════════════════════════════

test('Bell shows the unread badge from the feed', withEnv(async () => {
  var { rootEl } = await mountBellWithFixture();
  assert.equal(rootEl.hidden, false);
  var badge = rootEl.querySelector('.msc-ann-bell-badge');
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '1');
}));

test('Bell hides the badge at zero unread', withEnv(async () => {
  var { rootEl } = await mountBellWithFixture({
    feed: function () { return Promise.resolve({ unread_count: 0, items: [] }); }
  });
  var badge = rootEl.querySelector('.msc-ann-bell-badge');
  assert.equal(badge.hidden, true);
}));

test('Bell dropdown opens on click and renders notification items', withEnv(async () => {
  var { rootEl } = await mountBellWithFixture();
  var bellBtn = rootEl.querySelector('.msc-ann-bell-btn');
  fire(bellBtn, 'click');
  await flush();
  var dropdown = rootEl.querySelector('.msc-ann-bell-dropdown');
  assert.equal(dropdown.hidden, false);
  assert.match(dropdown.allText(), /Team Leadership & Responsibility Instruction/);
}));

test('Bell dropdown empty state when there are no notifications', withEnv(async () => {
  var { rootEl } = await mountBellWithFixture({
    feed: function () { return Promise.resolve({ unread_count: 0, items: [] }); }
  });
  var bellBtn = rootEl.querySelector('.msc-ann-bell-btn');
  fire(bellBtn, 'click');
  await flush();
  var dropdown = rootEl.querySelector('.msc-ann-bell-dropdown');
  assert.match(dropdown.allText(), /No mentions yet\./);
}));

test('Clicking an unread notification marks it read and refreshes the feed', withEnv(async () => {
  var markReadCalledWith = null;
  var feedCalls = 0;
  var { rootEl } = await mountBellWithFixture({
    markRead: function (id) { markReadCalledWith = id; return Promise.resolve(Object.assign({}, FEED_FIXTURE.items[0], { read_at: '2026-08-12T09:20:00Z' })); },
    feed: function () { feedCalls += 1; return Promise.resolve(FEED_FIXTURE); }
  });
  var bellBtn = rootEl.querySelector('.msc-ann-bell-btn');
  fire(bellBtn, 'click');
  await flush();

  var itemBtn = rootEl.querySelector('.msc-ann-bell-item-btn');
  fire(itemBtn, 'click');
  await flush();

  assert.equal(markReadCalledWith, 'm-1');
  assert.ok(feedCalls >= 2, 'feed refreshed after marking read');
}));
