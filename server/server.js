const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir 'index.html' cuando se accede a la raíz ('/')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = {}; // { socketId: username }
const socketIdMap = {}; // { username: socketId }

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado:', socket.id);

    socket.on('new-user', (username) => {
        users[socket.id] = username;
        socketIdMap[username] = socket.id;
        io.emit('user-connected', username, socket.id); // Enviar también el socket ID
        io.emit('update-user-list', Object.keys(socketIdMap)); // Enviar solo usernames para la lista
    });

    socket.on('send-message', (message) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        io.emit('receive-message', { username: users[socket.id], text: message, timestamp: timestamp });
    });

    socket.on('send-private-message', (data) => {
        const recipientSocketId = data.recipient;
        const message = data.text;
        const senderUsername = users[socket.id];
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Enviar el mensaje privado solo al destinatario
        io.to(recipientSocketId).emit('receive-private-message', {
            senderUsername: senderUsername,
            text: message,
            timestamp: timestamp
        });

        // Opcionalmente, podrías emitir un evento al remitente para confirmar que el mensaje fue enviado
        socket.emit('private-message-sent', { recipient: users[recipientSocketId], text: message, timestamp: timestamp });
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado:', socket.id);
        const username = users[socket.id];
        delete users[socket.id];
        delete socketIdMap[username];
        io.emit('user-disconnected', username);
        io.emit('update-user-list', Object.keys(socketIdMap));
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://192.168.1.101:${PORT}`);
});