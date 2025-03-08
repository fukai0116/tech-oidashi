import { Hono } from 'hono';
import { MessageBoard } from '../models/MessageBoard.js';

const app = new Hono();

// Get all message boards
app.get('/', async (c) => {
  try {
    const messageBoards = await MessageBoard.find().sort({ updatedAt: -1 });
    return c.json(messageBoards);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Get specific message board
app.get('/:id', async (c) => {
  try {
    const messageBoard = await MessageBoard.findById(c.req.param('id'));
    if (!messageBoard) {
      return c.json({ error: 'Message board not found' }, 404);
    }
    return c.json(messageBoard);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Create new message board
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const newMessageBoard = new MessageBoard(body);
    const savedMessageBoard = await newMessageBoard.save();
    return c.json(savedMessageBoard, 201);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Update message board information
app.put('/:id', async (c) => {
  try {
    const body = await c.req.json();
    const updatedMessageBoard = await MessageBoard.findByIdAndUpdate(
      c.req.param('id'),
      body,
      { new: true }
    );
    if (!updatedMessageBoard) {
      return c.json({ error: 'Message board not found' }, 404);
    }
    return c.json(updatedMessageBoard);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Add new message to a message board
app.post('/:id/messages', async (c) => {
  try {
    const messageBoard = await MessageBoard.findById(c.req.param('id'));
    if (!messageBoard) {
      return c.json({ error: 'Message board not found' }, 404);
    }
    
    const message = await c.req.json();
    messageBoard.messages.push(message);
    await messageBoard.save();
    
    return c.json(messageBoard);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete message board
app.delete('/:id', async (c) => {
  try {
    const deletedMessageBoard = await MessageBoard.findByIdAndDelete(c.req.param('id'));
    if (!deletedMessageBoard) {
      return c.json({ error: 'Message board not found' }, 404);
    }
    return c.json({ message: 'Message board deleted successfully' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export const messageboardsRouter = app;