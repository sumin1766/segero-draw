import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../api/_data.js';

test('fixture has 2027 year and no real names', () => {
  assert.equal(seed.year, 2027);
  assert.equal(seed.schema, 3);
  for (const stage of seed.stages)
    for (const person of stage.people)
      assert.match(person.name, /^예시 /);
});

test('stage IDs and participant IDs are unique', () => {
  const stageIds = seed.stages.map(s => s.id);
  assert.equal(new Set(stageIds).size, stageIds.length);
  const personIds = seed.stages.flatMap(s => s.people.map(p => p.id));
  assert.equal(new Set(personIds).size, personIds.length);
});

test('ticket range can contain everyone in each fixture stage', () => {
  for (const stage of seed.stages) {
    assert.ok(stage.ticketEnd >= stage.ticketStart);
    assert.ok(stage.ticketEnd-stage.ticketStart+1 >= stage.people.length);
  }
});

test('historical stage sizes are preserved as placeholders only', () => {
  assert.deepEqual(seed.stages.map(s => s.people.length), [10,4,20,46,69,25,10]);
  assert.equal(Object.keys(seed.results).length,0);
});
