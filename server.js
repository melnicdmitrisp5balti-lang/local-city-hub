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

// Определяем корректный путь к файлам
const PUBLIC_DIR = path.join(__dirname);
console.log('__dirname:', __dirname);
console.log('PUBLIC_DIR:', PUBLIC_DIR);

// Раздаем статические файлы
app.use(express.static(PUBLIC_DIR));

// Главная страница
app.get('/', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  console.log('Serving index from:', indexPath);
  res.sendFile(indexPath);
});

// Проверка что файлы на месте
const fs = require('fs');
fs.readdir(PUBLIC_DIR, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
  } else {
    console.log('Files in directory:', files);
  }
});

// Хранилище комнат
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    
    if (rooms[roomId]) {
      socket.emit('topics', rooms[roomId].topics);
    } else {
      rooms[roomId] = { topics: [] };
      socket.emit('topics', []);
    }
    
    socket.to(roomId).emit('user-joined', socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('new-topic', (data) => {
    const { roomId, topic } = data;
    if (!rooms[roomId]) {
      rooms[roomId] = { topics: [] };
    }
    
    topic.id = Date.now().toString();
    topic.date = new Date().toLocaleString('ru-RU');
    rooms[roomId].topics.unshift(topic);
    
    io.to(roomId).emit('new-topic', topic);
    console.log(`New topic in room ${roomId}:`, topic.title);
  });

  socket.on('delete-topic', (data) => {
    const { roomId, topicId } = data;
    if (rooms[roomId]) {
      rooms[roomId].topics = rooms[roomId].topics.filter(t => t.id !== topicId);
      io.to(roomId).emit('delete-topic', topicId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
