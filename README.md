# Street Soccer 3D — Online Multiplayer

This project packages the existing Street Soccer 3D game with the Socket.IO room server its Online Multiplayer menu expects. Players can host a room, share its four-letter code, and have friends join from their own devices.

## Run it on your computer

1. Install **Node.js 18 or newer** from https://nodejs.org/.
2. Extract this ZIP.
3. Open a terminal in the extracted `StreetSoccer3D-Online-Multiplayer` folder.
4. Run:

   ```bash
   npm install
   npm start
   ```

5. Open http://localhost:3000 in your browser.
6. Choose Online Multiplayer, create a room, and send the four-letter code to your friends.

For friends on the same Wi-Fi, they can open `http://YOUR-COMPUTER-LAN-IP:3000` (allow Node through your computer's firewall if prompted).

## Put it online so friends can join from anywhere

Deploy this folder to a Node.js hosting service that supports persistent web processes and WebSockets (for example, Render, Railway, or a VPS):

- Build/install command: `npm install`
- Start command: `npm start`
- Runtime: Node.js 18+
- The host should provide the `PORT` environment variable; this server reads it automatically.

After deployment, open the HTTPS URL supplied by your host. The game automatically connects to the same origin for Socket.IO. Share that URL and the in-game room code with friends. Use a host that supports WebSocket connections; a static-only website host will not run this server.

Optional environment variables:

- `PORT` — server port (default `3000`).
- `MAX_PLAYERS` — maximum players in a lobby (default `8`, maximum `16`).
- `CORS_ORIGIN` — comma-separated allowed browser origins. Leave unset for the default permissive setting; set it to your deployed site origin(s) if you host the game separately.

## Project layout

- `public/index.html` — the Street Soccer 3D game.
- `server.js` — Express web server and Socket.IO room/lobby relay.
- `test/server.test.js` — basic server helper tests.

## Test

```bash
npm test
```

## Important

The server handles room creation, joining, player presence, and relaying game messages. Keep the server running while anyone is playing. This ZIP does not itself publish the game to the internet; you must deploy it to a Node.js host and use the hosted URL for worldwide multiplayer.
