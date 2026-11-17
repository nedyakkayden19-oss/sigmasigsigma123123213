const test = require('node:test');
const assert = require('node:assert/strict');
const { makeRoomCode, cleanName, publicLobby } = require('../server');

test('room codes are four characters and avoid confusing letters', () => {
  const code = makeRoomCode();
  assert.match(code, /^[A-HJ-NP-Z]{4}$/);
});

test('player names are trimmed, bounded, and stripped of markup characters', () => {
  assert.equal(cleanName('  Alex<script>  '), 'Alexscript');
  assert.equal(cleanName(''), 'Player');
  assert.equal(cleanName('x'.repeat(30)).length, 20);
});

test('public lobby exposes player IDs and host ID', () => {
  const lobby = { code: 'ABCD', hostId: 'host1', players: new Map([['host1', { name: 'Host' }], ['guest1', { name: 'Guest' }]]) };
  assert.deepEqual(publicLobby(lobby), {
    code: 'ABCD', hostId: 'host1',
    players: [{ id: 'host1', name: 'Host', host: true }, { id: 'guest1', name: 'Guest', host: false }]
  });
});
