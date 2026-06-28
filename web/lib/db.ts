import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prismaClientSingleton = () => {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const dbPath = '/tmp/dev.db';
    const srcPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    try {
      // Always ensure the directory exists
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      
      // Copy the database file to /tmp if it doesn't exist yet
      if (!fs.existsSync(dbPath)) {
        if (fs.existsSync(srcPath)) {
          console.log(`[DB] Copying database from ${srcPath} to ${dbPath}`);
          fs.copyFileSync(srcPath, dbPath);
          fs.chmodSync(dbPath, 0o666);
          console.log(`[DB] Database copied successfully.`);
        } else {
          console.log(`[DB] Source database not found at ${srcPath}. Creating empty writeable database at ${dbPath}`);
          // Create an empty file so SQLite can open it
          fs.writeFileSync(dbPath, '');
          fs.chmodSync(dbPath, 0o666);
        }
      } else {
        console.log(`[DB] Database already exists at ${dbPath}, using existing.`);
      }
    } catch (e) {
      console.error('[DB] Failed to setup SQLite database in /tmp:', e);
    }
    
    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`
        }
      }
    });
  }

  return new PrismaClient();
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
