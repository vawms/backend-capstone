#!/usr/bin/env node

/**
 * Simple WebSocket test client for Socket.IO
 * 
 * Usage:
 *   node test-websocket.js [companyId]
 * 
 * Example:
 *   node test-websocket.js 123e4567-e89b-12d3-a456-426614174000
 */

const { io } = require('socket.io-client');

// Get company ID from command line argument or use a default
const companyId = process.argv[2] || 'test-company-id';
const serverUrl = process.env.WEBSOCKET_URL || 'http://localhost:3000';

console.log('Connecting to WebSocket server...');
console.log(`Server: ${serverUrl}`);
console.log(`Company ID: ${companyId}\n`);

const socket = io(serverUrl, {
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  console.log(`Socket ID: ${socket.id}\n`);
  
  // Join the company room
  const room = `company:${companyId}`;
  console.log(`Joining room: ${room}`);
  socket.emit('joinRoom', room, (response) => {
    console.log('Join response:', response);
    console.log('\nNow listening for service-request.updated events...\n');
  });
});

socket.on('disconnect', (reason) => {
  console.log('\nDisconnected from WebSocket server');
  console.log(`Reason: ${reason}\n`);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Listen for service request updates
socket.on('service-request.updated', (data) => {
  console.log('------------------------');
  console.log('Service Request Updated!');
  console.log('------------------------');
  console.log(JSON.stringify(data, null, 2));
  console.log('------------------------\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  socket.disconnect();
  process.exit(0);
});

console.log('Tip: Trigger a service request update in another terminal to see events');
console.log('Press Ctrl+C to exit\n');
