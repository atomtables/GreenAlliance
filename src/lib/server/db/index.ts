import "dotenv/config";

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { lt } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

// run maintenance (look for old join codes that can now be deleted)
(async() => {
    setInterval(async() => {
        await db.delete(schema.joincodes).where(lt(schema.joincodes.usedAt, new Date(Date.now() - 604800 * 1000)));
    }, 86400000); // every 24 hours
    await db.delete(schema.joincodes).where(lt(schema.joincodes.usedAt, new Date(Date.now() - 604800 * 1000)));
})