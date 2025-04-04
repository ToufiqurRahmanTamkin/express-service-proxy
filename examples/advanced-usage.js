const express = require('express');
const { createServiceProxy } = require('express-service-proxy');

const app = express();
app.use(express.json());

// Create service proxy with global options
const serviceProxy = createServiceProxy({
  // Global proxy options
  changeOrigin: true,
  logLevel: 'debug',
  
  // Custom headers to add to proxied requests
  headers: {
    'X-Proxy-By': 'express-service-proxy'
  }
});

// Register a service with path-specific routing
serviceProxy.registerService('api-service', [
  'http://api-service-1:4000',
  'http://api-service-2:4000'
], {
  // Service-specific options override global options
  pathRewrite: {
    '^/api/v2': '/v2',  // Rewrite path
  },
  responseHeaders: {
    'X-Proxy-Response-Time': Date.now().toString()
  }
});

// Register a service with custom circuit breaker settings
serviceProxy.registerService('payment-service', [
  'http://payment-service-1:5000',
  'http://payment-service-2:5000'
], {
  // More aggressive circuit breaker for critical payment service
  circuitBreaker: {
    failureThreshold: 2,    // Open after just 2 failures
    resetTimeout: 60000,    // Wait 1 minute before trying again
    requestTimeout: 3000    // Short 3 second timeout
  }
});

// Set up route-specific middlewares
app.use('/api', serviceProxy.getServiceMiddleware('api-service', '/'));
app.use('/payments', serviceProxy.getServiceMiddleware('payment-service', '/'));

// Health check with detailed diagnostics
app.use('/health', (req, res, next) => {
  // Add authentication for health check in production
  if (process.env.NODE_ENV === 'production' && !req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized access to health check' });
  }
  next();
}, serviceProxy.getHealthMiddleware());

// Dynamic service registration endpoint (admin only)
app.post('/admin/services', (req, res) => {
  try {
    const { name, targets, options } = req.body;
    
    if (!name || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: 'Invalid service configuration' });
    }
    
    serviceProxy.registerService(name, targets, options || {});
    
    // Mount the service dynamically
    app.use(`/${name}`, serviceProxy.getServiceMiddleware(name, '/'));
    
    res.status(201).json({ message: `Service ${name} registered successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Advanced API Gateway running on port ${port}`);
});