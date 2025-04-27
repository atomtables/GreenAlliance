import Database from "better-sqlite3"
import "dotenv/config"
import {sql} from "drizzle-orm"
import {drizzle} from "drizzle-orm/better-sqlite3"
import {migrate} from "drizzle-orm/better-sqlite3/migrator"

const sqlite = new Database(process.env.DATABASE_URL)
const db = drizzle(sqlite, { logger: true })

db.run(sql`PRAGMA foreign_keys=OFF;`)

try {
    migrate(db, { migrationsFolder: "./drizzle" })
} finally {
    db.run(sql`PRAGMA foreign_keys=ON;`)
}

sqlite.close()