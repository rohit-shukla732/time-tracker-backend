import sql from 'mssql';

// MSSQL Connection Configuration for Biometric System
const config: sql.config = {
  user: process.env.BIOMETRIC_DB_USER || '',
  password: process.env.BIOMETRIC_DB_PASSWORD || '',
  server: process.env.BIOMETRIC_DB_SERVER || 'localhost',
  database: process.env.BIOMETRIC_DB_NAME || 'BiometricDB',
  options: {
    encrypt: process.env.BIOMETRIC_DB_ENCRYPT === 'true', // for Azure
    trustServerCertificate: process.env.BIOMETRIC_DB_TRUST_CERT === 'true', // for local dev
    enableArithAbort: true,
  },
  port: parseInt(process.env.BIOMETRIC_DB_PORT || '1433'),
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create MSSQL connection pool
 */
export async function getMSSQLPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = await sql.connect(config);
  }
  return pool;
}

/**
 * Execute a query on the biometric database
 */
export async function queryBiometric<T = any>(
  query: string,
  params?: Record<string, any>
): Promise<sql.IResult<T>> {
  try {
    const pool = await getMSSQLPool();
    const request = pool.request();

    // Add parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    return await request.query(query);
  } catch (error) {
    console.error('MSSQL Query Error:', error);
    throw error;
  }
}

/**
 * Close the connection pool
 */
export async function closeMSSQLPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Types for biometric data (Mx_ACSEventTrn table)
export interface BiometricAttendance {
  UserID: string;           // Employee ID (e.g., ACE123)
  IDateTime: Date;          // Check in/out timestamp
  IOType: number;           // 0 = IN, 1 = OUT
  Status?: 'IN' | 'OUT' | 'UNKNOWN';  // Calculated status
}

export interface BiometricEmployee {
  id: string;
  name: string;
  department?: string;
  designation?: string;
}
