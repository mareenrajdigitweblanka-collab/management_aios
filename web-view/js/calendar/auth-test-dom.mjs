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
    this._innerHTML = '';
    this.textContent = '';
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

  /* auth.js never uses innerHTML (built via createElement/appendChild
     specifically to avoid needing this) — only ui/toast.js does, for its
     fixed showToast() template. This is a deliberately narrow, flat
     parser (no real nesting, no attribute values beyond class) — good
     enough to make ui/toast.js's own el.querySelector('.ui-toast-dismiss')
     lookup succeed and to let tests read back toast title/message text,
     without a real HTML parser. */
  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    this._children = [];
    /* Trailing (?=<) is a zero-width lookahead, not a consumed literal —
       when one tag's content is immediately followed by another opening
       tag with no text between them (e.g. <div class="ui-toast-body">
       immediately followed by <p class="ui-toast-title">...), a consumed
       trailing '<' would swallow that next tag's own opening '<' as part
       of THIS match, so the next exec() never sees it as a fresh match
       start and that whole element is silently skipped. The lookahead
       leaves the '<' at lastIndex for the next exec() call to actually
       match, whether it starts an opening tag (matches next time) or a
       closing tag (fails \w+ after '<', so exec() just scans past it to
       the next real '<'). */
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
    if (this._doc) { this._doc._all.push(child); }
    return child;
  }

  /* Minimal scoped querySelector — searches this element's own
     descendant subtree (never siblings/ancestors, matching real DOM
     semantics). Supports the two selector shapes this codebase's test
     harness ever needs: a plain '.class-name' (ui/toast.js's own
     el.querySelector('.ui-toast-dismiss')) and '.class[attr="value"]'
     (auth.js's .msc-instance[data-member-key="X"] lookup) — see
     matchesSimpleSelector below, shared with document.querySelector.
     Anything more exotic throws loudly rather than silently returning
     null, so a test relying on unsupported selector syntax fails fast. */
  querySelector(selector) {
    var stack = this._children.slice();
    while (stack.length) {
      var el = stack.shift();
      if (matchesSimpleSelector(el, selector)) { return el; }
      if (el._children && el._children.length) { stack = el._children.concat(stack); }
    }
    return null;
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

/* Shared by document.querySelector and FakeElement.querySelector.
   Supports exactly two shapes: '.class-name' (ui/toast.js) and
   '.class[attr="value"]' (auth.js's .msc-instance[data-member-key="X"]
   lookup) — everything either module actually uses. Anything else throws
   loudly rather than silently returning null/false. */
function matchesSimpleSelector(el, selector) {
  var withAttr = /^\.([\w-]+)\[([\w-]+)="([^"]*)"\]$/.exec(selector);
  if (withAttr) {
    var className = withAttr[1], attrName = withAttr[2], attrValue = withAttr[3];
    return el.classList.contains(className) && el.getAttribute(attrName) === attrValue;
  }
  var plain = /^\.([\w-]+)$/.exec(selector);
  if (plain) { return el.classList.contains(plain[1]); }
  throw new Error('auth-test-dom: unsupported selector "' + selector + '"');
}

export function createFakeDocument() {
  var doc = {
    _byId: {},
    _all: [],
    activeElement: null,
    createElement: function (tag) { return new FakeElement(tag, doc); },
    // auth.js's show/hide-token icon (2026-07-31) builds a real SVG via
    // createElementNS — the namespace URI itself is irrelevant to this
    // fake DOM's own behavior (no rendering happens here), so this is a
    // deliberate, documented alias to createElement rather than a
    // separate SVG-aware element type.
    createElementNS: function (ns, tag) { return new FakeElement(tag, doc); },
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
    scrollTo: function () {},
    // Synchronous stand-in — ui/toast.js only uses this to add the
    // 'show' class one tick after mount for a CSS transition; running it
    // immediately is deterministic and sufficient for tests, which never
    // assert on the pre-transition state.
    requestAnimationFrame: function (cb) { cb(); }
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
