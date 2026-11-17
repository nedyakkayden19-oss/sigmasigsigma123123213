'use strict';

const path = require('node:path');
const http = require('node:http');

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = Math.max(2, Math.min(16, Number(process.env.MAX_PLAYERS) || 8));
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O
const lobbies = new Map();
const socketLobby = new Map();

function makeRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (lobbies.has(code));
  return code;
}

function cleanName(value) {
  const name = String(value || 'Player').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20);
  return name || 'Player';
}

function publicLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    players: [...lobby.players].map(([id, player]) => ({ id, name: player.name, host: id === lobby.hostId }))
  };
}

function publishLobby(io, lobby) {
  io.to(lobby.code).emit('lobby-updated', publicLobby(lobby));
}

function leaveLobby(io, socket, { disconnect = false } = {}) {
  const code = socketLobby.get(socket.id);
  const lobby = code && lobbies.get(code);
  socketLobby.delete(socket.id);
  if (code) socket.leave(code);
  if (lobby) {
    if (socket.id === lobby.hostId) {
      io.to(code).emit('lobby-closed', { reason: 'The lobby host left. The room has closed.' });
      for (const id of lobby.players.keys()) socketLobby.delete(id);
      lobbies.delete(code);
    } else {
      lobby.players.delete(socket.id);
      publishLobby(io, lobby);
    }
  }
  if (disconnect && socket.connected) socket.disconnect(true);
}

function createApp() {
  const express = require('express');
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'street-soccer-multiplayer', lobbies: lobbies.size }));
  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  return app;
}

function attachSocketServer(httpServer) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(x => x.trim()) : true },
    maxHttpBufferSize: 1e6,
    pingInterval: 25000,
    pingTimeout: 20000
  });

  io.on('connection', socket => {
    socket.on('create-lobby', (payload = {}, ack = () => {}) => {
      if (socketLobby.has(socket.id)) leaveLobby(io, socket);
      const code = makeRoomCode();
      const lobby = { code, hostId: socket.id, players: new Map([[socket.id, { name: cleanName(payload.name) }]]) };
      lobbies.set(code, lobby);
      socketLobby.set(socket.id, code);
      socket.join(code);
      ack({ ok: true, lobby: publicLobby(lobby) });
      publishLobby(io, lobby);
    });

    socket.on('join-lobby', (payload = {}, ack = () => {}) => {
      const code = String(payload.code || '').toUpperCase().replace(/[^A-Z]/g, '');
      const lobby = lobbies.get(code);
      if (!lobby) return ack({ ok: false, error: 'Room not found. Check the code and try again.' });
      if (lobby.players.size >= MAX_PLAYERS) return ack({ ok: false, error: 'This room is full.' });
      if (socketLobby.has(socket.id)) leaveLobby(io, socket);
      lobby.players.set(socket.id, { name: cleanName(payload.name) });
      socketLobby.set(socket.id, code);
      socket.join(code);
      ack({ ok: true, lobby: publicLobby(lobby) });
      publishLobby(io, lobby);
    });

    socket.on('game-event', packet => {
      const code = socketLobby.get(socket.id);
      const lobby = code && lobbies.get(code);
      if (!lobby || !packet || typeof packet.event !== 'string') return;
      if (packet.event.length > 40) return;
      let size;
      try { size = Buffer.byteLength(JSON.stringify(packet.data ?? null)); } catch { return; }
      if (size > 250000) return;
      // Preserve the sender ID so the existing game can distinguish host and guests.
      socket.to(code).emit('game-event', { event: packet.event, data: packet.data, peer: socket.id });
    });

    socket.on('leave-lobby', ack => {
      leaveLobby(io, socket);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', () => leaveLobby(io, socket));
  });

  return io;
}

if (require.main === module) {
  const app = createApp();
  const server = http.createServer(app);
  attachSocketServer(server);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Street Soccer 3D multiplayer server listening on port ${PORT}`);
  });
}

module.exports = { makeRoomCode, cleanName, publicLobby, createApp, attachSocketServer };
