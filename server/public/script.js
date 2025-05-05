const socket = io();

const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const userList = document.getElementById('user-list');
const messageContainer = document.getElementById('message-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let username = '';
let recipientSocketId = null;
const socketIdMapClient = {};

loginButton.addEventListener('click', () => {
    const enteredUsername = usernameInput.value.trim();
    if (enteredUsername) {
        username = enteredUsername;
        socket.emit('new-user', username);
        loginModal.style.display = 'none';
    }
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        if (recipientSocketId) {
            socket.emit('send-private-message', { recipient: recipientSocketId, text: message });
            appendMessage(`(Privado a ${socketIdMapClient[recipientSocketId]}) Tú: ${message}`, true);
            recipientSocketId = null; // Reset recipient after sending
            // Remove 'selected' class from all users
            document.querySelectorAll('.user-item').forEach(item => item.classList.remove('selected'));
        } else {
            socket.emit('send-message', message);
        }
        messageInput.value = '';
    }
});

socket.on('user-connected', (newUser, socketId) => {
    console.log(`${newUser} (${socketId}) se ha conectado.`);
    socketIdMapClient[socketId] = newUser;
});

socket.on('user-disconnected', (disconnectedUser) => {
    console.log(`${disconnectedUser} se ha desconectado.`);
    // Remove the user from the client-side map (we don't have socketId here directly)
    for (const id in socketIdMapClient) {
        if (socketIdMapClient[id] === disconnectedUser) {
            delete socketIdMapClient[id];
            break;
        }
    }
    updateUserList(Object.values(socketIdMapClient));
});

socket.on('update-user-list', (usernames) => {
    updateUserList(usernames);
});

function updateUserList(usernames) {
    userList.innerHTML = '';
    usernames.forEach(name => {
        const listItem = document.createElement('li');
        listItem.classList.add('user-item');
        listItem.textContent = name;
        listItem.addEventListener('click', () => {
            // Remove 'selected' class from previously selected user
            document.querySelectorAll('.user-item.selected').forEach(item => item.classList.remove('selected'));
            listItem.classList.add('selected');
            recipientSocketId = Object.keys(socketIdMapClient).find(key => socketIdMapClient[key] === name);
            console.log('Enviando mensaje privado a:', recipientSocketId, name);
        });
        userList.appendChild(listItem);
    });
}

socket.on('receive-message', (data) => {
    appendMessage(`${data.username}: ${data.text} <span class="timestamp">${data.timestamp}</span>`, false);
});

socket.on('receive-private-message', (data) => {
    appendMessage(`<span class="private-message">(Privado de ${data.senderUsername}) ${data.timestamp}: ${data.text}</span>`, false);
});

function appendMessage(message, isSelf) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (isSelf) {
        messageDiv.classList.add('self-message'); // Optional styling for own messages
    }
    messageDiv.innerHTML = message;
    messageContainer.appendChild(messageDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight; // Scroll to bottom
}