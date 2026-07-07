import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('Connected to socket server');
  socket.emit('join:channel', 'jentrena');
  setTimeout(() => {
    console.log('Emitting test chat:message...');
    // We can't emit chat:message from client to client easily, 
    // because chat:message is emitted by the SERVER to the clients.
    // Let's emit a 'chat:send' which the server handles and broadcasts.
    socket.emit('chat:send', { channel: 'jentrena', text: 'This is a test message from diagnostic script!' });
  }, 1000);
});

socket.on('chat:message', (msg) => {
  console.log('Received chat:message:', msg);
  setTimeout(() => process.exit(0), 1000);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
});
