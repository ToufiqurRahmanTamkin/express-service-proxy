# express-service-proxy

A smart proxy middleware for Express.js applications with built-in load balancing, fail over, and circuit breaking capabilities.

## Overview

`express-service-proxy` simplifies routing requests from your Express.js application to your microservices. It offers advanced features including:

- **Dynamic service discovery** - Register services manually or integrate with service registries
- **Intelligent load balancing** - Round-robin, weighted, and least connections strategies
- **Automatic fail over** - Redirect requests when services are down
- **Circuit breaking** - Prevent cascading failures by temporarily disabling problematic services
- **Request/response transformation** - Modify requests before forwarding and responses before returning
- **Detailed metrics and monitoring** - Track service health and performance
- **Caching** - Improve performance with configurable response caching
- **Rate limiting** - Protect your services from being overwhelmed

## Installation

```bash
npm install express-service-proxy --save
```

## Quick Start

```javascript
const express = require('express');
const { createServiceProxy } = require('express-service-proxy');

const app = express();

// Create a proxy for a single service
const userServiceProxy = createServiceProxy({
  serviceId: 'user-service',
  targets: [
    'http://user-service-1:3001',
    'http://user-service-2:3001',
    'http://user-service-3:3001'
  ],
  loadBalancing: {
    strategy: 'round-robin'
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 30000 // 30 seconds
  }
});

// Mount the proxy at a specific path
app.use('/api/users', userServiceProxy);

app.listen(3000, () => {
  console.log('Gateway running on port 3000');
});
```

## Configuration Options

### Basic Configuration

```javascript
const proxy = createServiceProxy({
  serviceId: 'my-service',              // Unique identifier for the service
  targets: ['http://service:8080'],     // Array of target URLs
  pathRewrite: {                        // Optional path rewriting
    '^/api/users': '/users'
  },
  preserveHostHeader: true,             // Pass host header to target (default: false)
  timeout: 10000                        // Timeout in milliseconds (default: 30000)
});
```

### Load Balancing

```javascript
const proxy = createServiceProxy({
  // ... other options
  loadBalancing: {
    strategy: 'round-robin',            // 'round-robin', 'weighted', 'least-connections'
    weights: {                          // Only used with 'weighted' strategy
      'http://service-1:8080': 3,
      'http://service-2:8080': 1
    },
    sticky: false                       // Enable sticky sessions (default: false)
  }
});
```

### Circuit Breaker

```javascript
const proxy = createServiceProxy({
  // ... other options
  circuitBreaker: {
    enabled: true,                      // Enable circuit breaker (default: false)
    failureThreshold: 5,                // Number of failures before opening circuit
    successThreshold: 2,                // Successes needed to close circuit
    resetTimeout: 30000,                // Time before attempting to close half-open circuit
    requestTimeout: 5000,               // Request timeout (ms)
    fallbackResponse: {                 // Optional fallback when circuit is open
      status: 503,
      body: { message: 'Service unavailable' }
    }
  }
});
```

### Failover Configuration

```javascript
const proxy = createServiceProxy({
  // ... other options
  failover: {
    enabled: true,                      // Enable failover (default: false)
    retries: 3,                         // Number of retry attempts
    retryDelay: 200,                    // Delay between retries (ms)
    failoverTargets: [                  // Secondary targets to use when primary fails
      'http://backup-service-1:8080',
      'http://backup-service-2:8080'
    ]
  }
});
```

### Caching

```javascript
const proxy = createServiceProxy({
  // ... other options
  cache: {
    enabled: true,                      // Enable caching (default: false)
    ttl: 60,                            // Time-to-live in seconds
    methods: ['GET'],                   // HTTP methods to cache
    maxSize: 100,                       // Maximum cache entries
    keyGenerator: (req) => {            // Custom cache key generator
      return `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    }
  }
});
```

### Request/Response Transformation

```javascript
const proxy = createServiceProxy({
  // ... other options
  transform: {
    request: (req) => {                 // Transform request before forwarding
      req.headers['x-custom-header'] = 'custom-value';
      return req;
    },
    response: (res) => {                // Transform response before returning
      res.body.timestamp = new Date().toISOString();
      return res;
    }
  }
});
```

### Rate Limiting

```javascript
const proxy = createServiceProxy({
  // ... other options
  rateLimit: {
    enabled: true,                      // Enable rate limiting (default: false)
    windowMs: 60000,                    // Time window in milliseconds
    max: 100,                           // Maximum requests per window
    keyGenerator: (req) => {            // Key to identify clients (default: IP)
      return req.headers['x-api-key'] || req.ip;
    },
    handler: (req, res) => {            // Custom rate limit exceeded handler
      res.status(429).json({ message: 'Too many requests' });
    }
  }
});
```

### Service Discovery Integration

```javascript
const proxy = createServiceProxy({
  // ... other options
  discovery: {
    type: 'consul',                     // 'consul', 'eureka', 'kubernetes', or 'manual'
    serviceName: 'user-service',        // Service name in registry
    refreshInterval: 30000,             // How often to refresh service list (ms)
    // Consul-specific options
    consul: {
      host: 'localhost',
      port: 8500
    }
  }
});
```

## Advanced Usage

### Creating a Global Registry

```javascript
const express = require('express');
const { createServiceRegistry } = require('express-service-proxy');

const app = express();

// Create a service registry
const registry = createServiceRegistry();

// Register services
registry.register('user-service', {
  targets: ['http://user-service-1:3001', 'http://user-service-2:3001'],
  loadBalancing: { strategy: 'round-robin' }
});

registry.register('product-service', {
  targets: ['http://product-service:3002'],
  circuitBreaker: { enabled: true }
});

// Use registered services
app.use('/api/users', registry.getProxy('user-service'));
app.use('/api/products', registry.getProxy('product-service'));

app.listen(3000);
```

### Dynamic Service Registration

```javascript
const express = require('express');
const { createServiceRegistry } = require('express-service-proxy');

const app = express();
const registry = createServiceRegistry();

// API endpoint to register services dynamically
app.post('/register-service', (req, res) => {
  const { serviceId, config } = req.body;
  
  try {
    registry.register(serviceId, config);
    res.status(201).json({ message: `Service ${serviceId} registered successfully` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API endpoint to use a service proxy
app.use('/proxy/:serviceId/*', (req, res, next) => {
  const serviceId = req.params.serviceId;
  const path = req.url.replace(`/proxy/${serviceId}`, '');
  
  try {
    const proxy = registry.getProxy(serviceId);
    req.url = path;
    proxy(req, res, next);
  } catch (error) {
    res.status(404).json({ error: `Service ${serviceId} not found` });
  }
});

app.listen(3000);
```

### Health Checking

```javascript
const express = require('express');
const { createServiceProxy, healthMonitor } = require('express-service-proxy');

const app = express();

// Create a proxy with health monitoring
const userServiceProxy = createServiceProxy({
  serviceId: 'user-service',
  targets: ['http://user-service:3001'],
  health: {
    enabled: true,
    path: '/health',                 // Health check endpoint
    interval: 10000,                 // Check every 10 seconds
    timeout: 2000,                   // Timeout for health requests
    unhealthyThreshold: 2,           // Failed checks to mark unhealthy
    healthyThreshold: 2              // Successful checks to mark healthy
  }
});

// Get health status for all services
app.get('/health', (req, res) => {
  res.json(healthMonitor.getStatus());
});

app.use('/api/users', userServiceProxy);

app.listen(3000);
```

## Events

The proxy emits various events that you can listen for:

```javascript
const proxy = createServiceProxy({
  serviceId: 'user-service',
  // ... configuration
});

// Listen for circuit breaker events
proxy.on('circuit-open', (serviceId) => {
  console.log(`Circuit opened for service ${serviceId}`);
});

proxy.on('circuit-close', (serviceId) => {
  console.log(`Circuit closed for service ${serviceId}`);
});

// Listen for failover events
proxy.on('failover', (originalTarget, newTarget) => {
  console.log(`Failover from ${originalTarget} to ${newTarget}`);
});

// Listen for health events
proxy.on('target-unhealthy', (target) => {
  console.log(`Target ${target} marked as unhealthy`);
});

// Listen for request events
proxy.on('request', (req, target) => {
  console.log(`Proxying request to ${target}`);
});

proxy.on('error', (err, req, res) => {
  console.error(`Proxy error: ${err.message}`);
});
```

## Metrics

You can access proxy metrics programmatically:

```javascript
const { metrics } = require('express-service-proxy');

// Get metrics for all services
const allMetrics = metrics.getAll();

// Get metrics for a specific service
const userServiceMetrics = metrics.get('user-service');

// Example: Export metrics to Prometheus
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.formatPrometheus());
});
```

## TypeScript Support

This package includes TypeScript definitions:

```typescript
import { createServiceProxy, ServiceProxyOptions } from 'express-service-proxy';

const options: ServiceProxyOptions = {
  serviceId: 'user-service',
  targets: ['http://localhost:3001']
  // ...other options
};

const proxy = createServiceProxy(options);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.