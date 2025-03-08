import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
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
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://tech-oidashi.onrender.com'] 
    : ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));

// API Routes
app.use('/api/*', async (c, next) => {
  await next();
});

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
    return c.json({ error: 'Failed to fetch message board' }, 500);
  }
});

// Add a message to a board
app.post('/api/messageboards/:id/messages', async (c) => {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();
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
    return c.json({ ...data, id: result.lastInsertRowid });
  } catch (error) {
    return c.json({ error: 'Failed to add message' }, 500);
  }
});

// Serve static files in production
if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../client/build');
  
  // Serve static files first
  app.use('/*', serveStatic({ root: staticPath }));
  
  // Fallback for client-side routing
  app.get('*', async (c) => {
    if (!c.req.path.startsWith('/api')) {
      const indexPath = path.join(staticPath, 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      return c.html(indexContent);
    }
    return c.next();
  });
}

// Start server
serve({
  port: PORT,
  fetch: app.fetch,
}, (info) => {
  console.log(`Server is running on port ${info.port} in ${NODE_ENV} mode`);
});