const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Статические файлы
app.use(express.static(path.join(__dirname)));

// Хранилище комнат в памяти
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Присоединение к комнате
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    
    // Отправляем текущие темы
    if (rooms[roomId]) {
      socket.emit('topics', rooms[roomId].topics);
    } else {
      rooms[roomId] = { topics: [] };
      socket.emit('topics', []);
    }
    
    // Уведомляем других о новом пользователе
    socket.to(roomId).emit('user-joined', socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Новая тема
  socket.on('new-topic', (data) => {
    const { roomId, topic } = data;
    if (!rooms[roomId]) {
      rooms[roomId] = { topics: [] };
    }
    
    topic.id = Date.now().toString();
    topic.date = new Date().toLocaleString('ru-RU');
    rooms[roomId].topics.unshift(topic);
    
    // Отправляем всем в комнате
    io.to(roomId).emit('new-topic', topic);
    console.log(`New topic in room ${roomId}:`, topic.title);
  });

  // Удаление темы
  socket.on('delete-topic', (data) => {
    const { roomId, topicId } = data;
    if (rooms[roomId]) {
      rooms[roomId].topics = rooms[roomId].topics.filter(t => t.id !== topicId);
      io.to(roomId).emit('delete-topic', topicId);
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});