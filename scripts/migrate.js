import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Cargar variables de entorno si existen
function loadEnv() {
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const dbPassword = process.env.SUPABASE_DB_PASSWORD || '\\%A47",sU~:.}w-4';

const clientConfig = {
  host: 'db.ilujxaklmxfmfcscxhfe.supabase.co',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
};

export async function runMigration(sqlFilePath = 'schema.sql') {
  const resolvedPath = path.resolve(sqlFilePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Archivo no encontrado: ${resolvedPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(resolvedPath, 'utf-8');
  const client = new Client(clientConfig);

  try {
    console.log(`Conectando a base de datos Supabase (${clientConfig.host})...`);
    await client.connect();
    console.log(`Ejecutando script: ${path.basename(resolvedPath)}...`);
    await client.query(sql);
    console.log('Migracion aplicada con exito.');
  } catch (error) {
    console.error('Error durante la migracion:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

// Ejecutar si se llama directamente
const targetFile = process.argv[2] || 'schema.sql';
runMigration(targetFile);
