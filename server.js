require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Configuración de Express
const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Modelos
const User = mongoose.model('User', {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    online: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', {
    sender: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Rutas de autenticación
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo usuario
        const user = new User({ username, password: hashedPassword });
        await user.save();

        // Generar token JWT
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey');

        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Buscar usuario
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Generar token JWT
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey');

        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Configuración del servidor HTTP y WebSocket
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Conexiones de Socket.io
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.query.token;
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        socket.userId = decoded.userId;

        // Marcar usuario como online
        await User.findByIdAndUpdate(socket.userId, { online: true });
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', async (socket) => {
    console.log('Nuevo usuario conectado:', socket.userId);

    // Enviar mensajes anteriores
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    socket.emit('loadMessages', messages.reverse());

    // Enviar lista de usuarios
    const users = await User.find();
    io.emit('userList', users.map(user => ({
        id: user._id,
        username: user.username,
        online: user.online
    })));

    // Manejar mensajes nuevos
    socket.on('sendMessage', async (messageData) => {
        try {
            const user = await User.findById(socket.userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            const message = new Message({
                sender: user.username,
                content: messageData.content
            });

            await message.save();
            io.emit('message', message);
        } catch (error) {
            console.error('Error al guardar mensaje:', error);
        }
    });

    // Manejar desconexión
    socket.on('disconnect', async () => {
        console.log('Usuario desconectado:', socket.userId);
        await User.findByIdAndUpdate(socket.userId, { online: false });
        
        const users = await User.find();
        io.emit('userList', users.map(user => ({
            id: user._id,
            username: user.username,
            online: user.online
        })));
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
