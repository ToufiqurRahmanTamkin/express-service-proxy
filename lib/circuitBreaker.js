/**
 * Circuit breaker implementation to prevent cascading failures
 */
class CircuitBreaker {
    /**
     * Create a new circuit breaker
     * @param {Object} options - Circuit breaker options
     * @param {number} options.failureThreshold - Number of failures before opening the circuit
     * @param {number} options.resetTimeout - Time in ms to wait before attempting to close the circuit
     * @param {number} options.requestTimeout - Request timeout in ms
     */
    constructor(options = {}) {
      this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
      
      // Circuit breaker settings
      this.failureThreshold = options.failureThreshold || 5;
      this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
      this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 3;
      this.requestTimeout = options.requestTimeout || 10000; // 10 seconds
    }
  
    /**
     * Check if the circuit is open (service is considered unavailable)
     * @returns {boolean} True if circuit is open
     */
    isOpen() {
      // If circuit is OPEN, check if it's time to try again
      if (this.state === 'OPEN') {
        const now = Date.now();
        // Check if the reset timeout has elapsed since the last failure
        if ((now - this.lastFailureTime) > this.resetTimeout) {
          this.transitionToHalfOpen();
        }
      }
      
      return this.state === 'OPEN';
    }
  
    /**
     * Record a failed request
     */
    recordFailure() {
      this.lastFailureTime = Date.now();
      this.failureCount++;
      this.successCount = 0; // Reset success count on failure
      
      // Check if we need to open the circuit
      if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
        this.transitionToOpen();
      } else if (this.state === 'HALF_OPEN') {
        // Any failure in half-open state means back to open
        this.transitionToOpen();
      }
    }
  
    /**
     * Record a successful request
     */
    recordSuccess() {
      this.failureCount = 0; // Reset failure count on success
      
      if (this.state === 'HALF_OPEN') {
        // In half-open state, count successes to determine if circuit can close
        this.successCount++;
        
        if (this.successCount >= this.halfOpenSuccessThreshold) {
          this.transitionToClosed();
        }
      }
    }
  
    /**
     * Transition to OPEN state
     */
    transitionToOpen() {
      this.state = 'OPEN';
      this.successCount = 0;
    }
  
    /**
     * Transition to HALF_OPEN state
     */
    transitionToHalfOpen() {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
  
    /**
     * Transition to CLOSED state
     */
    transitionToClosed() {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
    }
  
    /**
     * Reset the circuit breaker to initial state
     */
    reset() {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
    }
  
    /**
     * Get the current state of the circuit breaker
     * @returns {Object} Circuit breaker state information
     */
    getState() {
      return {
        state: this.state,
        failureCount: this.failureCount,
        successCount: this.successCount,
        lastFailureTime: this.lastFailureTime
      };
    }
  }
  
  module.exports = { CircuitBreaker };