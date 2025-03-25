// Variables globales
let socket;
let currentUser;

// Inicialización del chat
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = user;
    document.getElementById('current-username').textContent = user.username;

    // Conectar con el servidor Socket.io
    socket = io({
        query: { token }
    });

    // Configurar eventos del socket
    setupSocketEvents();
});

// Configurar eventos del socket
function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Conectado al servidor de chat');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor de chat');
    });

    socket.on('message', (message) => {
        addMessageToChat(message);
    });

    socket.on('userList', (users) => {
        updateUserList(users);
    });

    socket.on('error', (error) => {
        console.error('Error en el socket:', error);
        if (error === 'Invalid token') {
            logout();
        }
    });
}

// Añadir mensaje al chat
function addMessageToChat(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    messageElement.innerHTML = `
        <div class="sender">${message.sender}</div>
        <div class="content">${message.content}</div>
        <div class="time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Actualizar lista de usuarios
function updateUserList(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const userElement = document.createElement('li');
        userElement.textContent = user.username;
        if (user.online) {
            userElement.classList.add('online');
        }
        userList.appendChild(userElement);
    });
}

// Enviar mensaje
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (message) {
        socket.emit('sendMessage', {
            sender: currentUser.username,
            content: message
        });
        input.value = '';
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
    window.location.href = 'index.html';
}

// Manejar la tecla Enter para enviar mensajes
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
