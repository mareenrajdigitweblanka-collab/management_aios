/* navigation-test-dom.mjs — minimal, purpose-built DOM/localStorage stand-in
   for navigation.test.mjs. NOT a test file itself (no `.test.` in the
   name, so `node --test *.test.mjs` never picks it up).

   Same rationale and pattern as calendar/auth-test-dom.mjs and
   review-summaries-test-dom.mjs (this repo has no npm dependencies and
   jsdom could not be installed here) — a small hand-rolled stand-in
   supporting only the exact DOM surface navigation.js and the
   ensureAuthorized() dialog it can trigger (calendar/auth.js) actually
   call. Unlike either of those two existing stand-ins, navigation.js
   needs a REAL document.querySelectorAll('.app-nav-btn' /
   '.tab-panel' / '[data-goto]') to find the sidebar/panel elements a test
   builds — both existing stand-ins either hardcode an empty array or omit
   querySelectorAll entirely, so this file adds real (if simple) support
   for it rather than duplicating one of them with that one gap patched. */

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

function matchesSelector(el, selector) {
  if (!el || !el.classList) { return false; }
  var withAttr = /^\.([\w-]+)\[([\w-]+)="([^"]*)"\]$/.exec(selector);
  if (withAttr) {
    return el.classList.contains(withAttr[1]) && el.getAttribute(withAttr[2]) === withAttr[3];
  }
  var plainClass = /^\.([\w-]+)$/.exec(selector);
  if (plainClass) { return el.classList.contains(plainClass[1]); }
  var bareAttr = /^\[([\w-]+)\]$/.exec(selector);
  if (bareAttr) { return el.getAttribute(bareAttr[1]) !== null; }
  var idSel = /^#([\w-]+)$/.exec(selector);
  if (idSel) { return el.id === idSel[1]; }
  throw new Error('navigation-test-dom: unsupported selector "' + selector + '"');
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
  }

  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  removeAttribute(name) { delete this._attrs[name]; }

  appendChild(child) {
    this._children.push(child);
    if (this._doc && child instanceof FakeElement) { this._doc._all.push(child); }
    return child;
  }

  removeChild(child) {
    this._children = this._children.filter(function (c) { return c !== child; });
    return child;
  }

  insertBefore(child, referenceNode) {
    if (this._doc && child instanceof FakeElement) { this._doc._all.push(child); }
    var idx = referenceNode ? this._children.indexOf(referenceNode) : -1;
    if (idx === -1) { this._children.push(child); }
    else { this._children.splice(idx, 0, child); }
    return child;
  }

  querySelector(selector) {
    var stack = this._children.slice();
    while (stack.length) {
      var candidate = stack.shift();
      if (matchesSelector(candidate, selector)) { return candidate; }
      if (candidate._children && candidate._children.length) { stack = candidate._children.concat(stack); }
    }
    return null;
  }

  querySelectorAll(selector) {
    var matches = [];
    var stack = this._children.slice();
    while (stack.length) {
      var candidate = stack.shift();
      if (matchesSelector(candidate, selector)) { matches.push(candidate); }
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
    return true;
  }

  click() { this.dispatchEvent({ type: 'click', target: this, preventDefault: function () {} }); }
  focus() { if (this._doc) { this._doc.activeElement = this; } }
}

/* NodeList-like wrapper — real DOM's querySelectorAll result supports both
   Array-style access (length/[i]) AND .forEach, which navigation.js relies
   on directly (`sideNavBtns.forEach(...)`). A plain Array already supports
   both, so this is just a thin marker for readability. */
function toNodeList(arr) { return arr; }

export function createFakeDocument() {
  var listeners = {};
  var doc = {
    _byId: {},
    _all: [],
    activeElement: null,
    createElement: function (tag) { return new FakeElement(tag, doc); },
    createTextNode: function (text) { var t = new FakeElement('#text', doc); t.textContent = text; return t; },
    createElementNS: function (_ns, tag) { return new FakeElement(tag, doc); },
    getElementById: function (id) {
      return Object.prototype.hasOwnProperty.call(doc._byId, id) ? doc._byId[id] : null;
    },
    querySelector: function (selector) {
      for (var i = 0; i < doc._all.length; i++) {
        if (matchesSelector(doc._all[i], selector)) { return doc._all[i]; }
      }
      return null;
    },
    querySelectorAll: function (selector) {
      return toNodeList(doc._all.filter(function (el) { return matchesSelector(el, selector); }));
    },
    addEventListener: function (type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    removeEventListener: function (type, handler) {
      if (!listeners[type]) { return; }
      listeners[type] = listeners[type].filter(function (h) { return h !== handler; });
    },
    dispatchEvent: function (event) {
      if (!event.target) {
        try { event.target = doc; } catch (e) { /* real Event — target is read-only, already correct */ }
      }
      (listeners[event.type] || []).slice().forEach(function (handler) { handler(event); });
      return true;
    }
  };
  doc.body = new FakeElement('body', doc);
  doc._all.push(doc.body);
  return doc;
}

export function createFakeLocalStorage(seed) {
  var store = Object.assign({}, seed || {});
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  };
}

/* opts.storedAuth: {token, memberKey} — pre-seeds localStorage with an
   already-verified Calendar token, same shape/key calendar/auth.js reads
   (management_aios_calendar_auth_v1), so isAuthenticated() reflects it
   immediately without ever opening the token dialog. Omit it to start
   fully unauthenticated. */
export function installFakeBrowserGlobals(opts) {
  opts = opts || {};
  var previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  var fakeDocument = createFakeDocument();
  var seed = {};
  if (opts.storedAuth) {
    seed.management_aios_calendar_auth_v1 = JSON.stringify({
      version: 1,
      token: opts.storedAuth.token,
      verifiedMemberKey: opts.storedAuth.memberKey,
      verifiedAt: '2026-08-10T00:00:00.000Z'
    });
  }
  var fakeLocalStorage = createFakeLocalStorage(seed);
  var fakeWindow = {
    localStorage: fakeLocalStorage,
    location: { hostname: 'localhost' },
    scrollTo: function () {},
    requestAnimationFrame: function (cb) { cb(); }
  };
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  if (opts.fetchImpl) { globalThis.fetch = opts.fetchImpl; }
  return {
    document: fakeDocument,
    window: fakeWindow,
    localStorage: fakeLocalStorage,
    restore: function () {
      globalThis.document = previous.document;
      globalThis.window = previous.window;
      globalThis.fetch = previous.fetch;
    }
  };
}

/* Builds one nav button + matching tab panel, registered in the fake
   document exactly like web-view/index.html's real markup (data-tab on
   the button, id="tab-<id>" on the panel) — the two facts navigation.js's
   activatePanel()/applyProtectedNavState() actually read. `active` seeds
   the initial active state (only ever one button in real markup — the
   default root-aios panel). */
export function buildNavButtonAndPanel(doc, tabId, active) {
  var btn = doc.createElement('button');
  btn.className = 'app-nav-btn' + (active ? ' active' : '');
  btn.setAttribute('data-tab', tabId);
  if (active) { btn.setAttribute('aria-current', 'page'); }
  doc.body.appendChild(btn);

  var panel = doc.createElement('div');
  panel.className = 'tab-panel' + (active ? ' active' : '');
  panel.id = 'tab-' + tabId;
  doc.body.appendChild(panel);

  return { btn: btn, panel: panel };
}
