/* auth-test-dom.mjs — minimal, purpose-built DOM/localStorage/fetch stand-in
   for auth.test.mjs. NOT a test file itself (no `.test.` in the name, so
   `node --test *.test.mjs` never picks it up).

   This project has no npm dependencies at all (see web-view/js/calendar/
   package.json) and a real DOM library (jsdom) could not be installed in
   this environment. auth.js was written to build its dialog via
   createElement/appendChild with direct element references (never
   innerHTML + querySelector afterward) specifically so a small hand-rolled
   stand-in like this — supporting only the exact DOM surface auth.js
   actually calls — is enough to exercise its real code paths end-to-end,
   without needing a full HTML parser or CSS selector engine. */

class FakeClassList {
  constructor(el) { this._el = el; }
  add(name) { if (!this._el._classes.includes(name)) { this._el._classes.push(name); } }
  remove(name) { this._el._classes = this._el._classes.filter(function (c) { return c !== name; }); }
  contains(name) { return this._el._classes.indexOf(name) !== -1; }
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
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.name = '';
    this.autocomplete = '';
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

  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  removeAttribute(name) { delete this._attrs[name]; }

  appendChild(child) {
    this._children.push(child);
    if (this._doc) { this._doc._all.push(child); }
    return child;
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

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  focus() {
    if (this._doc) { this._doc.activeElement = this; }
  }
}

function matchesSimpleSelector(el, selector) {
  // Only ever needs to support auth.js's one lookup:
  // '.msc-instance[data-member-key="X"]'
  var m = /^\.([\w-]+)\[([\w-]+)="([^"]*)"\]$/.exec(selector);
  if (!m) { throw new Error('auth-test-dom: unsupported selector "' + selector + '"'); }
  var className = m[1], attrName = m[2], attrValue = m[3];
  return el.classList.contains(className) && el.getAttribute(attrName) === attrValue;
}

export function createFakeDocument() {
  var doc = {
    _byId: {},
    _all: [],
    activeElement: null,
    createElement: function (tag) { return new FakeElement(tag, doc); },
    getElementById: function (id) {
      return Object.prototype.hasOwnProperty.call(doc._byId, id) ? doc._byId[id] : null;
    },
    querySelector: function (selector) {
      for (var i = 0; i < doc._all.length; i++) {
        if (matchesSimpleSelector(doc._all[i], selector)) { return doc._all[i]; }
      }
      return null;
    }
  };
  doc.body = new FakeElement('body', doc);
  doc._all.push(doc.body);
  return doc;
}

export function createFakeLocalStorage() {
  var store = {};
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    _dump: function () { return Object.assign({}, store); }
  };
}

/* Installs fake document/window/localStorage globals for one test, and
   returns a restore() to undo them — every test calls restore() in a
   `finally` so a failure never leaks fake globals into a later test. */
export function installFakeBrowserGlobals() {
  var previous = {
    document: globalThis.document,
    window: globalThis.window,
    fetch: globalThis.fetch
  };
  var fakeDocument = createFakeDocument();
  var fakeLocalStorage = createFakeLocalStorage();
  var fakeWindow = {
    localStorage: fakeLocalStorage,
    location: { hostname: 'localhost' },
    scrollY: 0,
    scrollTo: function () {}
  };

  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;

  return {
    document: fakeDocument,
    localStorage: fakeLocalStorage,
    window: fakeWindow,
    restore: function () {
      globalThis.document = previous.document;
      globalThis.window = previous.window;
      globalThis.fetch = previous.fetch;
    }
  };
}
