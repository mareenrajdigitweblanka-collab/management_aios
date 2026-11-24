import test from 'node:test';
import assert from 'node:assert/strict';
import { createPanelLazyInitializer } from './panel-lazy-init.js';

function makePanel(id, active, items) {
  return {
    id: 'tab-' + id,
    classList: { contains: function (name) { return name === 'active' && !!active; } },
    querySelectorAll: function () { return items || []; }
  };
}
function makeDocument(panels) {
  var listeners = {};
  return {
    addEventListener: function (type, listener) { listeners[type] = listener; },
    getElementById: function (id) { return panels.filter(function (panel) { return panel.id === id; })[0] || null; },
    querySelectorAll: function () { return panels; },
    activate: function (targetId) { listeners['aios:panel-activated']({ detail: { targetId: targetId } }); }
  };
}
function calendarContainer() { return {}; }

test('startup on Root AIOS does not initialize inactive member calendars', function () {
  var root = makePanel('root-aios', true, []);
  var members = ['mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked', 'paraparan'];
  var panels = [root].concat(members.map(function (id) { return makePanel(id, false, [calendarContainer()]); }));
  var doc = makeDocument(panels);
  var requests = [];
  var lazy = createPanelLazyInitializer(doc, {
    selector: '.msc-instance',
    initialize: function (container) {
      for (var i = 0; i < 5; i += 1) { requests.push(container); }
    }
  });

  lazy.initActivePanel();
  assert.equal(requests.length, 0);
});

test('opening one authorized calendar initializes only that panel and repeated navigation does not duplicate requests', function () {
  var root = makePanel('root-aios', true, []);
  var member = makePanel('mayurika-hr', false, [calendarContainer()]);
  var other = makePanel('suman-recruitment', false, [calendarContainer()]);
  var paraparan = makePanel('paraparan', false, [calendarContainer()]);
  var doc = makeDocument([root, member, other, paraparan]);
  var requests = [];
  createPanelLazyInitializer(doc, {
    selector: '.msc-instance',
    initialize: function (container) {
      /* One schedule, three summaries, one leave request, all mocked. */
      for (var i = 0; i < 5; i += 1) { requests.push(container); }
    }
  });

  doc.activate('mayurika-hr');
  doc.activate('mayurika-hr');
  assert.equal(requests.length, 5);
  assert.equal(requests.every(function (container) { return container === member.querySelectorAll()[0]; }), true);
  assert.equal(other.querySelectorAll()[0] === requests[0], false);
  assert.equal(paraparan.querySelectorAll()[0] === requests[0], false);
});

test('restored active member panels initialize once, including direct panel activation paths', function () {
  var member = makePanel('arun-implementation', true, [calendarContainer()]);
  var doc = makeDocument([member]);
  var mounts = 0;
  var lazy = createPanelLazyInitializer(doc, { selector: '.msc-instance', initialize: function () { mounts += 1; } });
  lazy.initActivePanel();
  doc.activate('arun-implementation');
  assert.equal(mounts, 1);
});

test('a synchronous initialization failure can be retried on a later activation', function () {
  var item = calendarContainer();
  var panel = makePanel('rajiv-blocked', false, [item]);
  var doc = makeDocument([panel]);
  var attempts = 0;
  createPanelLazyInitializer(doc, {
    selector: '.msc-instance',
    initialize: function () { attempts += 1; if (attempts === 1) { throw new Error('mock mount failure'); } }
  });
  doc.activate('rajiv-blocked');
  doc.activate('rajiv-blocked');
  doc.activate('rajiv-blocked');
  assert.equal(attempts, 2);
});
