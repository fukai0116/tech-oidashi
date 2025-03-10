import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'shikishi.db');

// Initialize Hono app
const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: ['https://tech-oidashi-1.onrender.com', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Requested-With']
}));

// Initialize SQLite database
const db = new Database(DB_PATH);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS message_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    recipient TEXT NOT NULL,
    backgroundColor TEXT DEFAULT '#F5F5F5',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boardId INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    positionX REAL NOT NULL,
    positionY REAL NOT NULL,
    color TEXT DEFAULT '#000000',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boardId) REFERENCES message_boards(id)
  );
`);

// Get list of message boards
app.get('/api/messageboards', async (c) => {
  try {
    const messageBoards = db.prepare('SELECT * FROM message_boards ORDER BY createdAt DESC').all();
    return c.json(messageBoards);
  } catch (error) {
    console.error('Error fetching message boards:', error);
    return c.json({ error: 'Failed to fetch message boards' }, 500);
  }
});

// Create a new message board
app.post('/api/messageboards', async (c) => {
  try {
    const data = await c.req.json();
    const stmt = db.prepare('INSERT INTO message_boards (title, recipient, backgroundColor) VALUES (?, ?, ?)');
    const result = stmt.run(data.title, data.recipient, data.backgroundColor);
    return c.json({ ...data, id: result.lastInsertRowid }, 201);
  } catch (error) {
    console.error('Error creating message board:', error);
    return c.json({ error: 'Failed to create message board' }, 500);
  }
});

// Get a specific message board with its messages
app.get('/api/messageboards/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const messageBoard = db.prepare('SELECT * FROM message_boards WHERE id = ?').get(id);
    if (!messageBoard) {
      return c.json({ error: 'Message board not found' }, 404);
    }
    const messages = db.prepare('SELECT * FROM messages WHERE boardId = ? ORDER BY createdAt').all(id);
    return c.json({
      ...messageBoard,
      messages: messages.map(msg => ({
        ...msg,
        position: { x: msg.positionX, y: msg.positionY }
      }))
    });
  } catch (error) {
    console.error('Error fetching message board:', error);
    return c.json({ error: 'Failed to fetch message board' }, 500);
  }
});

// Add a message to a board
app.post('/api/messageboards/:id/messages', async (c) => {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();
    
    // Verify the board exists
    const board = db.prepare('SELECT id FROM message_boards WHERE id = ?').get(id);
    if (!board) {
      return c.json({ error: 'Message board not found' }, 404);
    }

    const stmt = db.prepare(`
      INSERT INTO messages (boardId, author, content, positionX, positionY, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      id,
      data.author,
      data.content,
      data.position.x,
      data.position.y,
      data.color
    );
    
    return c.json({ 
      id: result.lastInsertRowid,
      ...data,
      boardId: id
    }, 201);
  } catch (error) {
    console.error('Error adding message:', error);
    return c.json({ error: 'Failed to add message' }, 500);
  }
});

// Delete a message
app.delete('/api/messageboards/:boardId/messages/:messageId', async (c) => {
  try {
    const { boardId, messageId } = c.req.param();
    
    // メッセージの存在確認
    const message = db.prepare('SELECT * FROM messages WHERE id = ? AND boardId = ?').get(messageId, boardId);
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // メッセージの削除
    db.prepare('DELETE FROM messages WHERE id = ? AND boardId = ?').run(messageId, boardId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

// Serve static files in production
if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../client/build');
  
  // Serve manifest.json and other static files
  app.get('/manifest.json', async (c) => {
    const manifestPath = path.join(staticPath, 'manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return c.json(JSON.parse(content));
  });

  app.get('/static/*', async (c) => {
    const filePath = path.join(staticPath, c.req.path);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const type = c.req.path.endsWith('.js') ? 'application/javascript' :
                   c.req.path.endsWith('.css') ? 'text/css' :
                   'application/octet-stream';
      return new Response(content, {
        headers: { 'Content-Type': type }
      });
    }
    return c.notFound();
  });

  // Serve index.html for all other routes
  app.get('*', async (c) => {
    if (!c.req.path.startsWith('/api')) {
      const indexPath = path.join(staticPath, 'index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');
      return c.html(content);
    }
    return c.notFound();
  });
}

// Start server
serve({
  port: PORT,
  fetch: app.fetch,
}, (info) => {
  console.log(`Server is running on port ${info.port} in ${NODE_ENV} mode`);
});