import { InjectConnection } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import type { Connection } from 'mongoose';

type HealthStatus = 'up' | 'down';

interface HealthReport {
  status: 'ok' | 'error';
  details: {
    database: {
      status: HealthStatus;
      state: string;
    };
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<HealthReport> {
    const databaseStatus = this.getDatabaseStatus();
    const status = databaseStatus.status === 'up' ? 'ok' : 'error';

    return {
      status,
      details: {
        database: databaseStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getDatabaseStatus(): { status: HealthStatus; state: string } {
    const states = new Map<number, string>([
      [0, 'disconnected'],
      [1, 'connected'],
      [2, 'connecting'],
      [3, 'disconnecting'],
    ]);

    const stateCode = this.connection.readyState;
    const state = states.get(stateCode) ?? `unknown(${stateCode})`;
    const status: HealthStatus = stateCode === 1 ? 'up' : 'down';

    return { status, state };
  }
}
