import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';
import type { HealthResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<HealthResponse>> {
  let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    const isConnected = await testConnection();
    databaseStatus = isConnected ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('Health check database error:', error);
    databaseStatus = 'disconnected';
  }

  const response: HealthResponse = {
    status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
    database: databaseStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  };

  const statusCode = response.status === 'healthy' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
