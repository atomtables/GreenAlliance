import { jsonb } from 'drizzle-orm/pg-core';

// Provides a typed jsonb column helper for Postgres-backed tables.
export const json = <T>(name: string) => jsonb(name).$type<T>().default('{}' as any);
