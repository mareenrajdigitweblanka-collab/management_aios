import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

var authRecord = null;
var greetingHeading = { textContent: '' };
var authChangeListener = null;
var dash = String.fromCharCode(0x2014);
var memberLabels = { mayurika: 'Mayurika ' + dash + ' HR', suman: 'Suman ' + dash + ' Recruiting Officer' };

globalThis.window = {
  location: { hostname: 'localhost', protocol: 'http:', host: 'localhost' },
  localStorage: {
    getItem: () => authRecord,
    setItem: () => {},
    removeItem: () => { authRecord = null; }
  }
};
globalThis.document = {
  querySelector: (selector) => {
    var key = selector.match(/data-member-key="([^"]+)"/);
    return key && memberLabels[key[1]]
      ? { getAttribute: () => memberLabels[key[1]] }
      : null;
  },
  getElementById: () => greetingHeading,
  addEventListener: (name, callback) => { authChangeListener = callback; }
};

const { getHomeGreeting, getGreetingName, getGreetingPeriod, getGreetingIconSvg, initHomeGreeting } = await import('./home-greeting.js');

test('uses the verified display name for morning, afternoon, and evening greetings', () => {
  assert.equal(getHomeGreeting('Mayurika', 5), 'Good morning, Mayurika!');
  assert.equal(getHomeGreeting('Suman', 12), 'Good afternoon, Suman!');
  assert.equal(getHomeGreeting('Arun', 18), 'Good evening, Arun!');
  assert.equal(getHomeGreeting('Rajiv', 4), 'Good evening, Rajiv!');
});

test('selects all greeting period boundaries and approved icon variants', () => {
  assert.equal(getGreetingPeriod(4), 'evening');
  assert.equal(getGreetingPeriod(5), 'morning');
  assert.equal(getGreetingPeriod(11), 'morning');
  assert.equal(getGreetingPeriod(12), 'afternoon');
  assert.equal(getGreetingPeriod(17), 'afternoon');
  assert.equal(getGreetingPeriod(18), 'evening');
  assert.match(getGreetingIconSvg('morning'), /circle/);
  assert.match(getGreetingIconSvg('afternoon'), /circle/);
  assert.match(getGreetingIconSvg('evening'), /M24/);
});

test('removes only a role suffix from the verified label before greeting', () => {
  var dash = String.fromCharCode(0x2014);
  assert.equal(getGreetingName('Mayurika ' + dash + ' HR'), 'Mayurika');
  assert.equal(getGreetingName('MD ' + dash + ' Read-only'), 'MD');
  assert.equal(getGreetingName('Paraparan'), 'Paraparan');
});

test('falls back to the generic welcome when identity is missing or blank', () => {
  assert.equal(getHomeGreeting(null, 9), 'Welcome to Management AIOS');
  assert.equal(getHomeGreeting('', 14), 'Welcome to Management AIOS');
  assert.equal(getHomeGreeting('   ', 22), 'Welcome to Management AIOS');
});

test('initializes from the verified identity, updates on identity change, and clears on auth loss', () => {
  authRecord = JSON.stringify({ version: 1, token: 'opaque-token', verifiedMemberKey: 'mayurika' });
  initHomeGreeting();
  assert.match(greetingHeading.textContent, /^Good |^Welcome to/);
  var initial = greetingHeading.textContent;
  assert.match(initial, /Mayurika/);
  assert.doesNotMatch(initial, /HR/);

  authRecord = JSON.stringify({ version: 1, token: 'another-opaque-token', verifiedMemberKey: 'suman' });
  authChangeListener();
  assert.match(greetingHeading.textContent, /Suman/);
  assert.doesNotMatch(greetingHeading.textContent, /Recruiting Officer/);

  authRecord = null;
  authChangeListener();
  assert.equal(greetingHeading.textContent, 'Welcome to Management AIOS');
});

test('existing header authorization label remains role-qualified and greeting code does not read raw tokens', () => {
  var authSource = fs.readFileSync(new URL('./calendar/auth.js', import.meta.url), 'utf8');
  assert.match(authSource, /Authorized as:.*labelForMemberKey/);
  var index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  var css = fs.readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
  assert.match(index, /class="root-dashboard-intro greeting-panel"/);
  assert.ok(index.indexOf('class="module-card-section"') > index.indexOf('class="root-dashboard-intro greeting-panel"'));
  assert.match(css, /greeting-panel[\s\S]*var\(--sidebar-bg\)/);
  assert.match(index, /WELCOME TO MANAGEMENT AIOS/);
  assert.match(index, /homeGreetingIcon/);
  assert.match(index, /Choose a workspace to get started with your management activities\./);
});

test('greeting integration listens for the existing authorization lifecycle and never reads raw tokens', () => {
  var source = fs.readFileSync(new URL('./home-greeting.js', import.meta.url), 'utf8');
  assert.match(source, /CALENDAR_AUTH_CHANGED_EVENT/);
  assert.match(source, /setTimeout/);
  assert.match(source, /getGreetingIconSvg/);
  assert.match(source, /getStoredMemberKey/);
  assert.doesNotMatch(source, /getStoredToken|localStorage|Authorization|Bearer/);
});
