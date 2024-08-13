// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// Store sessions
const sessions = {};
const wss = new WebSocket.Server({ port: 8080 });

let rooms = {}; // { roomId: { clients: [], state: { playing, time } } }

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Handle room creation, join, play, pause, etc.
        if (data.type === 'createRoom') {
            const roomId = generateRoomId();
            rooms[roomId] = { clients: [ws], state: { playing: false, time: 0 } };
            ws.roomId = roomId;
            ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
        }

        if (data.type === 'joinRoom') {
            const room = rooms[data.roomId];
            if (room) {
                room.clients.push(ws);
                ws.roomId = data.roomId;
                // Sync the new client
                ws.send(JSON.stringify({ type: 'sync', state: room.state }));
            }
        }

        // Sync events
        if (data.type === 'play' || data.type === 'pause' || data.type === 'seek') {
            const room = rooms[ws.roomId];
            if (room) {
                room.state = { playing: data.playing, time: data.time };
                room.clients.forEach(client => {
                    if (client !== ws) {
                        client.send(JSON.stringify({ type: data.type, time: data.time }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        const roomId = ws.roomId;
        if (roomId) {
            rooms[roomId].clients = rooms[roomId].clients.filter(client => client !== ws);
        }
    });
});

// Serve the client files (your React app)
app.use(express.static('client'));

// Start the server
server.listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${server.address().port}`);
});
