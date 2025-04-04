const express = require('express');
const app = express();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service2' });
});

// Echo request details endpoint
app.all('/echo/*', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
    service: 'service2'
  });
});

// Success endpoint
app.get('/api/success', (req, res) => {
  res.json({ message: 'Success from service2' });
});

// Delay endpoint to test timeouts
app.get('/api/delay', (req, res) => {
  const delay = parseInt(req.query.delay || '100', 10);
  setTimeout(() => {
    res.json({ message: `Delayed response (${delay}ms) from service2` });
  }, delay);
});

// Error endpoint
app.get('/api/error', (req, res) => {
  res.status(500).json({ error: 'Internal error from service2' });
});

// Start the server on a random port or specified port
const port = process.env.PORT || 3002;
const server = app.listen(port, () => {
  console.log(`Service2 mock running on port ${port}`);
});

module.exports = { app, server };