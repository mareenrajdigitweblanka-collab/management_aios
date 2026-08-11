/* review-summaries-test-dom.mjs — minimal, purpose-built DOM/fetch stand-in
   for review-summaries.test.mjs. NOT a test file itself (no `.test.` in
   the name, so `node --test *.test.mjs` never picks it up).

   Same rationale as calendar/auth-test-dom.mjs (this repo has no npm
   dependencies and jsdom could not be installed in this environment):
   review-summaries.js is built via createElement/appendChild with direct
   element references (never innerHTML for user-authored text), so a
   small hand-rolled stand-in — supporting only the exact DOM surface
   review-summaries.js AND the ui/* leaf modules it transitively calls
   (ui/toast.js's showToast, which DOES use innerHTML for its own fixed
   template) actually need — is enough to exercise real code paths
   end-to-end. The innerHTML narrow parser and matchesSimpleSelector
   below are adapted from calendar/auth-test-dom.mjs (same proven
   approach, kept as a separate file because this module also needs a
   few primitives auth.js never calls: createTextNode, classList.toggle,
   document.getElementById). */

class FakeClassList {
  constructor(el) { this._el = el; }
  add(name) { if (!this._el._classes.includes(name)) { this._el._classes.push(name); } }
  remove(name) { this._el._classes = this._el._classes.filter(function (c) { return c !== name; }); }
  contains(name) { return this._el._classes.indexOf(name) !== -1; }
  toggle(name, force) {
    var has = this.contains(name);
    var shouldHave = force === undefined ? !has : !!force;
    if (shouldHave && !has) { this.add(name); }
    if (!shouldHave && has) { this.remove(name); }
    return shouldHave;
  }
}

class FakeTextNode {
  constructor(text) { this.nodeType = 3; this.textContent = text; this._children = []; this._classes = []; }
}

function matchesSimpleSelector(el, selector) {
  if (!el || !el.classList) { return false; }
  var withAttr = /^\.([\w-]+)\[([\w-]+)="([^"]*)"\]$/.exec(selector);
  if (withAttr) {
    return el.classList.contains(withAttr[1]) && el.getAttribute(withAttr[2]) === withAttr[3];
  }
  var plain = /^\.([\w-]+)$/.exec(selector);
  if (plain) { return el.classList.contains(plain[1]); }
  /* ui/dialog.js looks up several of its own elements by id
     (#ui-dialog-title, #ui-dialog-message, ...) — supported here so
     confirmDestructive() (used by review-summaries.js's Delete flow)
     can run its real code path against this stand-in. */
  var idSel = /^#([\w-]+)$/.exec(selector);
  if (idSel) { return el.id === idSel[1]; }
  throw new Error('review-summaries-test-dom: unsupported selector "' + selector + '"');
}

class FakeElement {
  constructor(tagName, doc) {
    this.tagName = String(tagName).toUpperCase();
    this._doc = doc;
    this._classes = [];
    this._attrs = {};
    this._listeners = {};
    this._children = [];
    this._id = '';
    this._innerHTML = '';
    this._text = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.rows = 0;
    this.style = {};
    this.classList = new FakeClassList(this);
  }

  get id() { return this._id; }
  set id(value) {
    if (this._id && this._doc) { delete this._doc._byId[this._id]; }
    this._id = value;
    if (value && this._doc) { this._doc._byId[value] = this; }
  }

  get className() { return this._classes.join(' '); }
  set className(value) { this._classes = value ? value.split(/\s+/) : []; }

  /* Matches real DOM semantics (unlike a plain property): setting
     textContent removes every child node and leaves this element with a
     single text value. review-summaries.js relies on this — e.g.
     `historyEl.textContent = ''` before appending fresh cards — so a
     plain-property stand-in would silently leave stale children behind. */
  get textContent() {
    if (!this._children.length) { return this._text; }
    return this._children.map(function (c) { return c.textContent || ''; }).join('');
  }
  set textContent(value) {
    this._text = value == null ? '' : String(value);
    this._children = [];
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    this._children = [];
    var tagRe = /<(\w+)\b([^>]*)>([^<]*)(?=<)/g;
    var m;
    while ((m = tagRe.exec(html))) {
      var tag = m[1], attrs = m[2], text = m[3];
      var classMatch = /class="([^"]*)"/.exec(attrs);
      var idMatch = /\bid="([^"]*)"/.exec(attrs);
      var child = new FakeElement(tag, this._doc);
      if (classMatch) { child.className = classMatch[1]; }
      if (idMatch) { child.id = idMatch[1]; }
      child.textContent = text;
      this._children.push(child);
      if (this._doc) { this._doc._all.push(child); }
    }
  }

  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  removeAttribute(name) { delete this._attrs[name]; }

  appendChild(child) {
    this._children.push(child);
    if (this._doc && child instanceof FakeElement) { this._doc._all.push(child); }
    return child;
  }

  /* REQ-CAL-REV-PDF-003 — the PDF-download temporary <a> element is
     appended then removed (document.body.removeChild(link)), the same
     pattern the existing weekly-schedule .xlsx download already uses
     (calendar/instance.js). */
  removeChild(child) {
    this._children = this._children.filter(function (c) { return c !== child; });
    return child;
  }

  /* Added for staff-data.js's authenticated-module gate
     (REQ-AUTH-MODULES-007, 2026-08-10, setStaffDataAuthGateVisibility) —
     inserts before referenceNode, or appends if referenceNode is falsy/not
     a current child (matches real Node.insertBefore(node, null)
     semantics). Purely additive; every existing caller of this stand-in
     is unaffected. */
  insertBefore(child, referenceNode) {
    if (this._doc && child instanceof FakeElement) { this._doc._all.push(child); }
    var idx = referenceNode ? this._children.indexOf(referenceNode) : -1;
    if (idx === -1) { this._children.push(child); }
    else { this._children.splice(idx, 0, child); }
    return child;
  }

  insertAdjacentElement(_position, node) {
    this._afterend = this._afterend || [];
    this._afterend.push(node);
    if (this._doc && node instanceof FakeElement) { this._doc._all.push(node); }
    return node;
  }

  querySelector(selector) {
    var stack = this._children.slice();
    while (stack.length) {
      var candidate = stack.shift();
      if (matchesSimpleSelector(candidate, selector)) { return candidate; }
      if (candidate._children && candidate._children.length) { stack = candidate._children.concat(stack); }
    }
    return null;
  }

  /* Used by ui/form-feedback.js clearFormErrors(form) —
     form.querySelectorAll('.ui-field-invalid'). Returns a real Array
     (not a NodeList), which is fine: every caller in this codebase only
     ever iterates it. */
  querySelectorAll(selector) {
    var matches = [];
    var stack = this._children.slice();
    while (stack.length) {
      var candidate = stack.shift();
      if (matchesSimpleSelector(candidate, selector)) { matches.push(candidate); }
      if (candidate._children && candidate._children.length) { stack = candidate._children.concat(stack); }
    }
    return matches;
  }

  addEventListener(type, handler) {
    (this._listeners[type] = this._listeners[type] || []).push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) { return; }
    this._listeners[type] = this._listeners[type].filter(function (h) { return h !== handler; });
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    (this._listeners[event.type] || []).slice().forEach(function (handler) { handler(event); });
  }

  click() { this.dispatchEvent({ type: 'click', target: this, preventDefault: function () {} }); }
  focus() { if (this._doc) { this._doc.activeElement = this; } }

  /* Collects every descendant text (own textContent plus every child's,
     recursively) — used by tests to assert what a card actually renders
     without needing a full CSS selector engine. */
  allText() {
    var parts = [this.textContent || ''];
    this._children.forEach(function (child) {
      if (child.allText) { parts.push(child.allText()); }
      else if (child.textContent) { parts.push(child.textContent); }
    });
    return parts.join(' ');
  }
}

export function createFakeDocument() {
  var listeners = {};
  var doc = {
    _byId: {},
    _all: [],
    activeElement: null,
    createElement: function (tag) { return new FakeElement(tag, doc); },
    createTextNode: function (text) { return new FakeTextNode(text); },
    // Entry-auth-gate eye-icon toggle (2026-08-11 follow-up) builds a real
    // SVG via createElementNS — same deliberate, documented alias as
    // calendar/auth-test-dom.mjs already uses for its own show/hide icon:
    // the namespace URI is irrelevant to this fake DOM (no rendering
    // happens here), so this is just createElement under a second name.
    createElementNS: function (_ns, tag) { return new FakeElement(tag, doc); },
    getElementById: function (id) {
      return Object.prototype.hasOwnProperty.call(doc._byId, id) ? doc._byId[id] : null;
    },
    querySelectorAll: function () { return []; },
    querySelector: function (selector) {
      for (var i = 0; i < doc._all.length; i++) {
        if (matchesSimpleSelector(doc._all[i], selector)) { return doc._all[i]; }
      }
      return null;
    },
    // Document-level event bus (2026-08-03 review-summaries authorization
    // fix) — review-summaries.js listens for the shared tab-switch event
    // (navigation.js's 'msc:close-toolbar-popovers') and auth.js's
    // CALENDAR_AUTH_CHANGED_EVENT on `document` directly (never on a
    // specific element), which real browsers support natively; this fake
    // document needs its own listener registry to exercise both paths.
    addEventListener: function (type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    removeEventListener: function (type, handler) {
      if (!listeners[type]) { return; }
      listeners[type] = listeners[type].filter(function (h) { return h !== handler; });
    },
    dispatchEvent: function (event) {
      // event.target is a read-only getter on a real CustomEvent (the
      // kind calendar/auth.js's dispatchAuthChanged() constructs) —
      // assigning to it throws. Plain object-literal fake events (as
      // used elsewhere in this test-dom for element-level dispatch)
      // don't define that getter, so the assignment is safe for those;
      // guard with try/catch rather than a type check so both shapes
      // work without this stand-in needing to know which one it got.
      if (!event.target) {
        try { event.target = doc; } catch (e) { /* real Event — target is read-only, already correct */ }
      }
      (listeners[event.type] || []).slice().forEach(function (handler) { handler(event); });
    }
  };
  doc.body = new FakeElement('body', doc);
  doc._all.push(doc.body);
  return doc;
}

export function createFakeLocalStorage(seed) {
  var store = Object.assign({}, seed || {});
  return {
    _store: store,
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  };
}

/* opts.storedAuth: {token, memberKey} — pre-seeds localStorage with an
   already-verified Calendar token, so ensureAuthorized() resolves
   immediately without ever opening the token dialog (which would need
   trapTab/focus-trap DOM support this stand-in deliberately omits). */
/* REQ-CAL-REV-PDF-003 — Node's built-in global URL class has no
   createObjectURL/revokeObjectURL (those are browser Blob-URL APIs), so
   the PDF download's URL.createObjectURL(blob)/URL.revokeObjectURL(url)
   calls need an explicit stand-in here, tracked so tests can assert a
   created object URL was actually revoked. */
function installFakeObjectUrl() {
  var calls = { created: [], revoked: [] };
  var counter = 0;
  var previousCreate = globalThis.URL && globalThis.URL.createObjectURL;
  var previousRevoke = globalThis.URL && globalThis.URL.revokeObjectURL;
  if (!globalThis.URL) { globalThis.URL = {}; }
  globalThis.URL.createObjectURL = function (blob) {
    counter += 1;
    var url = 'blob:test-object-url-' + counter;
    calls.created.push({ url: url, blob: blob });
    return url;
  };
  globalThis.URL.revokeObjectURL = function (url) {
    calls.revoked.push(url);
  };
  return {
    calls: calls,
    restore: function () {
      if (previousCreate) { globalThis.URL.createObjectURL = previousCreate; }
      else { delete globalThis.URL.createObjectURL; }
      if (previousRevoke) { globalThis.URL.revokeObjectURL = previousRevoke; }
      else { delete globalThis.URL.revokeObjectURL; }
    }
  };
}

export function installFakeBrowserGlobals(opts) {
  opts = opts || {};
  var previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  var fakeDocument = createFakeDocument();
  var fakeObjectUrl = installFakeObjectUrl();
  var seed = {};
  if (opts.storedAuth) {
    seed.management_aios_calendar_auth_v1 = JSON.stringify({
      version: 1,
      token: opts.storedAuth.token,
      verifiedMemberKey: opts.storedAuth.memberKey,
      verifiedAt: '2026-08-03T00:00:00.000Z'
    });
  }
  var fakeLocalStorage = createFakeLocalStorage(seed);
  var fakeWindow = {
    localStorage: fakeLocalStorage,
    location: { hostname: 'localhost' },
    requestAnimationFrame: function (cb) { cb(); }
  };
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  if (opts.fetchImpl) { globalThis.fetch = opts.fetchImpl; }
  return {
    document: fakeDocument,
    window: fakeWindow,
    localStorage: fakeLocalStorage,
    objectUrlCalls: fakeObjectUrl.calls,
    restore: function () {
      globalThis.document = previous.document;
      globalThis.window = previous.window;
      globalThis.fetch = previous.fetch;
      fakeObjectUrl.restore();
    }
  };
}
