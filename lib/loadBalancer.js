/**
 * Load balancer class to distribute requests among targets
 */
class LoadBalancer {
    /**
     * Create a new load balancer
     * @param {Array<string>} targets - Array of target URLs
     * @param {string} strategy - Load balancing strategy ('round-robin', 'random', 'least-connections')
     */
    constructor(targets, strategy = 'round-robin') {
      this.targets = [...targets];
      this.strategy = strategy;
      this.currentIndex = 0;
      this.connectionCounts = this.targets.reduce((acc, target) => {
        acc[target] = 0;
        return acc;
      }, {});
    }
  
    /**
     * Get the next target according to the selected strategy
     * @returns {string} Target URL
     */
    getNextTarget() {
      if (this.targets.length === 0) {
        throw new Error('No targets available for load balancing');
      }
  
      if (this.targets.length === 1) {
        return this.targets[0];
      }
  
      switch (this.strategy) {
        case 'random':
          return this.getRandomTarget();
        case 'least-connections':
          return this.getLeastConnectionsTarget();
        case 'round-robin':
        default:
          return this.getRoundRobinTarget();
      }
    }
  
    /**
     * Get target using round-robin strategy
     * @returns {string} Target URL
     */
    getRoundRobinTarget() {
      const target = this.targets[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.targets.length;
      return target;
    }
  
    /**
     * Get target using random selection strategy
     * @returns {string} Target URL
     */
    getRandomTarget() {
      const randomIndex = Math.floor(Math.random() * this.targets.length);
      return this.targets[randomIndex];
    }
  
    /**
     * Get target with least active connections
     * @returns {string} Target URL
     */
    getLeastConnectionsTarget() {
      // Find target with the least number of active connections
      const target = this.targets.reduce((min, curr) => {
        return this.connectionCounts[curr] < this.connectionCounts[min] ? curr : min;
      }, this.targets[0]);
  
      // Increment connection count for selected target
      this.connectionCounts[target]++;
      
      // Return the selected target
      return target;
    }
  
    /**
     * Notify that a connection to a target has completed
     * @param {string} target - Target URL that completed the connection 
     */
    releaseConnection(target) {
      if (this.connectionCounts[target] > 0) {
        this.connectionCounts[target]--;
      }
    }
  
    /**
     * Add a new target to the load balancer
     * @param {string} target - New target URL
     */
    addTarget(target) {
      if (!this.targets.includes(target)) {
        this.targets.push(target);
        this.connectionCounts[target] = 0;
      }
    }
  
    /**
     * Remove a target from the load balancer
     * @param {string} target - Target URL to remove
     */
    removeTarget(target) {
      const index = this.targets.indexOf(target);
      if (index !== -1) {
        this.targets.splice(index, 1);
        delete this.connectionCounts[target];
        
        // Adjust the current index if necessary
        if (this.currentIndex >= this.targets.length) {
          this.currentIndex = 0;
        }
      }
    }
  
    /**
     * Get all targets
     * @returns {Array<string>} Array of target URLs
     */
    getTargets() {
      return [...this.targets];
    }
  }
  
  module.exports = { LoadBalancer };