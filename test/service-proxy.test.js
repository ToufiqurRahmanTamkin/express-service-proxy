const express = require('express');
const request = require('supertest');
const { createServiceProxy } = require('../index');

// Import mock services
const service1 = require('./mock-services/service1');
const service2 = require('./mock-services/service2');

describe('ServiceProxy', () => {
  let app;
  let service1Url;
  let service2Url;
  
  beforeAll(() => {
    // Get URLs of the started mock services
    const service1Port = service1.server.address().port;
    const service2Port = service2.server.address().port;
    service1Url = `http://localhost:${service1Port}`;
    service2Url = `http://localhost:${service2Port}`;
  });
  
  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
  });
  
  afterAll(async () => {
    // Clean up servers
    await new Promise(resolve => service1.server.close(resolve));
    await new Promise(resolve => service2.server.close(resolve));
  });

  test('Should route requests to a single service', async () => {
    // Arrange
    const serviceProxy = createServiceProxy();
    serviceProxy.registerService('service1', [service1Url]);
    app.use('/service1', serviceProxy.getServiceMiddleware('service1', '/'));
    
    // Act & Assert
    const response = await request(app).get('/service1/api/success');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Success from service1');
  });

  test('Should load balance between multiple instances', async () => {
    // Arrange
    const serviceProxy = createServiceProxy();
    serviceProxy.registerService('balanced', [service1Url, service2Url]);
    app.use('/balanced', serviceProxy.getServiceMiddleware('balanced', '/'));
    
    // Act & Assert
    // First request should go to service1 (round-robin)
    const response1 = await request(app).get('/balanced/echo/test');
    expect(response1.body.service).toBe('service1');
    
    // Second request should go to service2 (round-robin)
    const response2 = await request(app).get('/balanced/echo/test');
    expect(response2.body.service).toBe('service2');
    
    // Third request should go to service1 again (round-robin)
    const response3 = await request(app).get('/balanced/echo/test');
    expect(response3.body.service).toBe('service1');
  });

  test('Should handle health check endpoint', async () => {
    // Arrange
    const serviceProxy = createServiceProxy();
    serviceProxy.registerService('service1', [service1Url]);
    serviceProxy.registerService('service2', [service2Url]);
    app.use('/health', serviceProxy.getHealthMiddleware());
    
    // Act
    const response = await request(app).get('/health');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('services.service1.status', 'UP');
    expect(response.body).toHaveProperty('services.service2.status', 'UP');
  });

  test('Should handle errors from services', async () => {
    // Arrange
    const serviceProxy = createServiceProxy();
    serviceProxy.registerService('service1', [service1Url]);
    app.use('/service1', serviceProxy.getServiceMiddleware('service1', '/'));
    
    // Act
    const response = await request(app).get('/service1/api/error');
    
    // Assert - proxy should pass through the 500 status
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal error from service1');
  });

  test('Should support different load balancing strategies', async () => {
    // Arrange - using random strategy
    const serviceProxy = createServiceProxy();
    serviceProxy.registerService('random', [service1Url, service2Url], {
      loadBalancingStrategy: 'random'
    });
    app.use('/random', serviceProxy.getServiceMiddleware('random', '/'));
    
    // Act
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const response = await request(app).get('/random/echo/test');
      responses.push(response.body.service);
    }
    
    // Assert - with random strategy, we expect a mix of services
    // Note: This is a probabilistic test, could theoretically fail
    const service1Count = responses.filter(s => s === 'service1').length;
    const service2Count = responses.filter(s => s === 'service2').length;
    
    expect(service1Count + service2Count).toBe(10);
    // We expect some variation in a random distribution
    expect(service1Count).toBeGreaterThan(0);
    expect(service2Count).toBeGreaterThan(0);
  });
});