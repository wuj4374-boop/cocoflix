import { Injectable, Logger } from '@nestjs/common';
import { CircuitState, CircuitBreakerState } from '../types';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxAttempts: number;
  resetTimeout: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  halfOpenMaxAttempts: 3,
  resetTimeout: 300000,
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  getCircuit(sourceId: string): CircuitBreakerState {
    if (!this.circuits.has(sourceId)) {
      this.circuits.set(sourceId, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        halfOpenMaxAttempts: DEFAULT_CONFIG.halfOpenMaxAttempts,
      });
      this.configs.set(sourceId, { ...DEFAULT_CONFIG });
    }
    return this.circuits.get(sourceId)!;
  }

  configure(sourceId: string, config: Partial<CircuitBreakerConfig>): void {
    const existing = this.configs.get(sourceId) || { ...DEFAULT_CONFIG };
    this.configs.set(sourceId, { ...existing, ...config });
  }

  canExecute(sourceId: string): boolean {
    const circuit = this.getCircuit(sourceId);
    const config = this.configs.get(sourceId) || DEFAULT_CONFIG;

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (Date.now() >= circuit.nextAttemptTime) {
          circuit.state = CircuitState.HALF_OPEN;
          circuit.successCount = 0;
          this.logger.log(`Circuit ${sourceId}: OPEN -> HALF_OPEN`);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return circuit.successCount < config.halfOpenMaxAttempts;

      default:
        return false;
    }
  }

  recordSuccess(sourceId: string): void {
    const circuit = this.getCircuit(sourceId);
    const config = this.configs.get(sourceId) || DEFAULT_CONFIG;

    switch (circuit.state) {
      case CircuitState.CLOSED:
        if (circuit.lastFailureTime > 0 && Date.now() - circuit.lastFailureTime > config.resetTimeout) {
          circuit.failureCount = 0;
        }
        break;

      case CircuitState.HALF_OPEN:
        circuit.successCount++;
        if (circuit.successCount >= config.successThreshold) {
          circuit.state = CircuitState.CLOSED;
          circuit.failureCount = 0;
          circuit.successCount = 0;
          this.logger.log(`Circuit ${sourceId}: HALF_OPEN -> CLOSED (recovered)`);
        }
        break;
    }
  }

  recordFailure(sourceId: string): void {
    const circuit = this.getCircuit(sourceId);
    const config = this.configs.get(sourceId) || DEFAULT_CONFIG;

    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    switch (circuit.state) {
      case CircuitState.CLOSED:
        if (circuit.failureCount >= config.failureThreshold) {
          circuit.state = CircuitState.OPEN;
          circuit.nextAttemptTime = Date.now() + config.timeout;
          this.logger.warn(
            `Circuit ${sourceId}: CLOSED -> OPEN (failures: ${circuit.failureCount})`,
          );
        }
        break;

      case CircuitState.HALF_OPEN:
        circuit.state = CircuitState.OPEN;
        circuit.nextAttemptTime = Date.now() + config.timeout;
        this.logger.warn(`Circuit ${sourceId}: HALF_OPEN -> OPEN (failure during recovery)`);
        break;
    }
  }

  getState(sourceId: string): CircuitState {
    return this.getCircuit(sourceId).state;
  }

  reset(sourceId: string): void {
    this.circuits.set(sourceId, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenMaxAttempts: DEFAULT_CONFIG.halfOpenMaxAttempts,
    });
    this.logger.log(`Circuit ${sourceId}: reset to CLOSED`);
  }

  resetAll(): void {
    for (const sourceId of this.circuits.keys()) {
      this.reset(sourceId);
    }
  }

  getStats(): Record<string, { state: CircuitState; failures: number; successes: number }> {
    const stats: Record<string, { state: CircuitState; failures: number; successes: number }> = {};
    for (const [id, circuit] of this.circuits) {
      stats[id] = {
        state: circuit.state,
        failures: circuit.failureCount,
        successes: circuit.successCount,
      };
    }
    return stats;
  }
}
