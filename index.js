const { ServiceProxy } = require('./lib/proxy');
const { LoadBalancer } = require('./lib/loadBalancer');
const { CircuitBreaker } = require('./lib/circuitBreaker');

/**
 * Create an express-service-proxy instance
 * @param {Object} options - Global options for all services
 * @returns {ServiceProxy} A new ServiceProxy instance
 */
function createServiceProxy(options = {}) {
  return new ServiceProxy(options);
}

module.exports = {
  createServiceProxy,
  ServiceProxy,
  LoadBalancer,
  CircuitBreaker
};