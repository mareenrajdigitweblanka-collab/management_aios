// Unit tests for the APPROVED OCCURRENCE LIMIT (2026-07-27 owner
// approval): "Maximum 30 total Task occurrences per submission after
// time-frame expansion." Frontend surface only — pure, DOM-free coverage
// of the approved title/message text (ui/error-mapper.js KNOWN_ERRORS).
// See backend/tests/test_occurrence_limit.py for the authoritative
// backend enforcement/boundary tests (30 allowed, 31 blocked, zero
// writes, precedence over advisory confirmation) — the backend remains
// authoritative; this file only proves the frontend shows the approved
// wording for the code the backend sends.
//
// Run with: node web-view/js/calendar/occurrence-limit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapApiError } from '../ui/error-mapper.js';

test('14: Single/Edit occurrence-limit mapped message matches the approved wording', () => {
  var mapped = mapApiError({ code: 'too_many_task_occurrences' });
  assert.equal(mapped.title, 'Too many task times');
  assert.equal(
    mapped.message,
    'You can add up to 30 task time frames in one submission. Remove some time frames and try again.'
  );
  assert.equal(mapped.persistent, true);
});

test('occurrence-limit is treated as an error, not a dismissible advisory', () => {
  var mapped = mapApiError({ code: 'too_many_task_occurrences' });
  assert.equal(mapped.type, 'error');
  assert.equal(mapped.persistent, true);
});

test('unknown code never accidentally maps to the occurrence-limit copy', () => {
  var mapped = mapApiError({ code: 'some_other_code' });
  assert.notEqual(mapped.title, 'Too many task times');
});
