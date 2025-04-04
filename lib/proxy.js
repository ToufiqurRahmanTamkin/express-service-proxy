const { createProxyMiddleware } = require('http-proxy-middleware');
const { LoadBalancer } = require('./loadBalancer');
const { CircuitBreaker } = require('./circuitBreaker');

class ServiceProxy {
  constructor(options = {}) {
    this.services = new Map();
    this.defaultOptions = {
      changeOrigin: true,
      logLevel: 'silent',
      ...options
    };
  }

  /**
   * Register a service with multiple target instances
   * @param {string} serviceName - Name of the service
   * @param {Array<string>} targets - Array of target URLs
   * @param {Object} options - Service specific options
   */
  registerService(serviceName, targets, options = {}) {
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new Error('Targets must be a non-empty array of URLs');
    }

    const serviceOptions = {
      ...this.defaultOptions,
      ...options,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
        requestTimeout: 10000,
        ...(options.circuitBreaker || {})
      }
    };

    // Create load balancer for this service
    const loadBalancer = new LoadBalancer(targets, serviceOptions.loadBalancingStrategy || 'round-robin');
    
    // Create circuit breaker for this service
    const circuitBreaker = new CircuitBreaker(serviceOptions.circuitBreaker);

    this.services.set(serviceName, {
      targets,
      loadBalancer,
      circuitBreaker,
      options: serviceOptions
    });

    return this;
  }

  /**
   * Get middleware for a registered service
   * @param {string} serviceName - Name of the registered service
   * @param {string} pathPattern - URL pattern to match for this service
   * @returns {Function} Express middleware
   */
  getServiceMiddleware(serviceName, pathPattern) {
    const service = this.services.get(serviceName);
    
    if (!service) {
      throw new Error(`Service "${serviceName}" is not registered`);
    }

    // Create proxy middleware with dynamic target resolution
    return createProxyMiddleware(pathPattern, {
      ...service.options,
      router: async (req) => {
        // Check circuit breaker
        if (service.circuitBreaker.isOpen()) {
          const error = new Error('Service is unavailable (circuit open)');
          error.statusCode = 503;
          throw error;
        }

        // Get target from load balancer
        const target = service.loadBalancer.getNextTarget();
        
        return target;
      },
      // Handle errors
      onError: (err, req, res, target) => {
        // Register failure with circuit breaker
        if (target) {
          service.circuitBreaker.recordFailure();
        }

        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: err.message || 'Proxy error'
          });
        }
      },
      // Handle proxy success
      onProxyRes: (proxyRes, req, res) => {
        // Record success with circuit breaker
        if (proxyRes.statusCode < 500) {
          service.circuitBreaker.recordSuccess();
        } else {
          service.circuitBreaker.recordFailure();
        }

        // Add custom headers if specified
        if (service.options.responseHeaders) {
          Object.entries(service.options.responseHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
      }
    });
  }

  /**
   * Get health check middleware for all services
   * @returns {Function} Express middleware for health checks
   */
  getHealthMiddleware() {
    return (req, res) => {
      const health = {
        status: 'UP',
        services: {}
      };

      this.services.forEach((service, name) => {
        health.services[name] = {
          status: service.circuitBreaker.isOpen() ? 'DOWN' : 'UP',
          targets: service.targets,
          circuitState: service.circuitBreaker.getState()
        };
      });

      // If any service is down, the overall status is degraded
      if (Object.values(health.services).some(s => s.status === 'DOWN')) {
        health.status = 'DEGRADED';
      }

      res.json(health);
    };
  }
}

module.exports = { ServiceProxy };