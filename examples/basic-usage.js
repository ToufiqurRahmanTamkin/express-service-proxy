const express = require('express');
const { createServiceProxy } = require('express-service-proxy');

const app = express();

// Create service proxy instance
const serviceProxy = createServiceProxy();

// Register services with their target instances
serviceProxy.registerService('auth-service', [
  'http://auth-service-1:3001',
  'http://auth-service-2:3001'
]);

serviceProxy.registerService('user-service', [
  'http://user-service-1:3002',
  'http://user-service-2:3002',
  'http://user-service-3:3002'
], {
  loadBalancingStrategy: 'round-robin'  // 'round-robin', 'random', or 'least-connections'
});

serviceProxy.registerService('product-service', [
  'http://product-service-1:3003',
  'http://product-service-2:3003'
], {
  circuitBreaker: {
    failureThreshold: 3,     // Number of failures before opening circuit
    resetTimeout: 10000,     // Wait 10 seconds before trying again
    requestTimeout: 5000     // 5 second timeout for requests
  }
});

// Set up proxy middleware for each service
app.use('/auth', serviceProxy.getServiceMiddleware('auth-service', '/'));
app.use('/users', serviceProxy.getServiceMiddleware('user-service', '/'));
app.use('/products', serviceProxy.getServiceMiddleware('product-service', '/'));

// Health check endpoint
app.use('/health', serviceProxy.getHealthMiddleware());

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});