import {drizzle} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import {env} from '$env/dynamic/private';
import {lt} from "drizzle-orm";

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

export const db = drizzle(client, { schema });

// run maintenance (look for old join codes that can now be deleted)
await db.delete(schema.joincodes).where(lt(schema.joincodes.usedAt, new Date(Date.now() - 604800 * 1000)));
