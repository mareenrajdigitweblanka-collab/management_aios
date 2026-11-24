/* home-greeting.js - presentation-only greeting for the authenticated home
   dashboard. Identity comes from the same verified member-key accessors used
   by the existing header authorization indicator; this module never reads or
   displays the stored token. */

import {
  getStoredMemberKey,
  labelForMemberKey,
  CALENDAR_AUTH_CHANGED_EVENT
} from './calendar/auth.js';

export function getGreetingName(label) {
  if (typeof label !== 'string') { return ''; }
  return label.trim()
    .replace(new RegExp('\\s+' + String.fromCharCode(0x2014) + '\\s+.*$'), '')
    .trim();
}

export function getGreetingPeriod(hour) {
  var localHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : new Date().getHours();
  return localHour >= 5 && localHour < 12 ? 'morning' : localHour >= 12 && localHour < 18 ? 'afternoon' : 'evening';
}

export function getHomeGreeting(displayName, hour) {
  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) { return 'Welcome to Management AIOS'; }
  var period = getGreetingPeriod(hour);
  return 'Good ' + period + ', ' + displayName.trim() + '!';
}

export function getGreetingIconSvg(period) {
  if (period === 'morning') { return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="21" cy="11" r="5" fill="currentColor" stroke="none"/><path d="M21 3v3M21 16v3M13 11h3M26 11h3M15.3 5.3l2.1 2.1M24.6 14.6l2.1 2.1M26.7 5.3l-2.1 2.1"/><path d="M5 22.5a5 5 0 0 1 4.6-5 6.8 6.8 0 0 1 12.8 2.2A4.7 4.7 0 0 1 23 29H8a5 5 0 0 1-3-6.5Z" fill="currentColor" stroke="none"/></svg>'; }
  if (period === 'afternoon') { return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="16" cy="16" r="6" fill="currentColor" stroke="none"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8"/></svg>'; }
  return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24.5 22.5A10 10 0 0 1 11 8a10.5 10.5 0 1 0 13.5 14.5Z" fill="currentColor" stroke="none"/><path d="m24 5 .7 1.8L26.5 7l-1.8.7L24 9.5l-.7-1.8-1.8-.7 1.8-.7L24 5Z" fill="currentColor" stroke="none"/></svg>';
}

var greetingRefreshTimer = null;
function scheduleGreetingRefresh() {
  if (greetingRefreshTimer) { clearTimeout(greetingRefreshTimer); }
  var now = new Date(); var next = new Date(now); var hour = now.getHours();
  var nextHour = hour < 5 ? 5 : hour < 12 ? 12 : hour < 18 ? 18 : 5;
  if (nextHour === 5 && hour >= 18) { next.setDate(next.getDate() + 1); }
  next.setHours(nextHour, 0, 0, 50);
  var delay = Math.max(1000, next.getTime() - now.getTime());
  greetingRefreshTimer = setTimeout(renderHomeGreeting, delay);
  if (greetingRefreshTimer && typeof greetingRefreshTimer.unref === 'function') { greetingRefreshTimer.unref(); }
}

function renderHomeGreeting() {
  var heading = document.getElementById('homeGreeting');
  if (!heading) { return; }
  var memberKey = getStoredMemberKey();
  var displayLabel = memberKey ? labelForMemberKey(memberKey) : null;
  var displayName = getGreetingName(displayLabel);
  var period = getGreetingPeriod();
  heading.textContent = getHomeGreeting(displayName, new Date().getHours());
  var icon = document.getElementById('homeGreetingIcon');
  if (icon) {
    icon.className = 'greeting-panel-icon greeting-panel-icon--' + period;
    icon.innerHTML = getGreetingIconSvg(period);
  }
  scheduleGreetingRefresh();
}

export function initHomeGreeting() {
  renderHomeGreeting();
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, renderHomeGreeting);
}