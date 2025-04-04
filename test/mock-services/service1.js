const express = require('express');
const app = express();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service1' });
});

// Echo request details endpoint
app.all('/echo/*', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
    service: 'service1'
  });
});

// Success endpoint
app.get('/api/success', (req, res) => {
  res.json({ message: 'Success from service1' });
});

// Delay endpoint to test timeouts
app.get('/api/delay', (req, res) => {
  const delay = parseInt(req.query.delay || '100', 10);
  setTimeout(() => {
    res.json({ message: `Delayed response (${delay}ms) from service1` });
  }, delay);
});

// Error endpoint
app.get('/api/error', (req, res) => {
  res.status(500).json({ error: 'Internal error from service1' });
});

// Start the server on a random port or specified port
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(`Service1 mock running on port ${port}`);
});

module.exports = { app, server };