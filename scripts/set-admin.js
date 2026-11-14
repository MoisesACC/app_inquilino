import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

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

const email = process.argv[2];

if (!email) {
  console.error('Uso: node scripts/set-admin.js <correo@ejemplo.com>');
  process.exit(1);
}

const client = new Client({
  host: 'db.ilujxaklmxfmfcscxhfe.supabase.co',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || '\\%A47",sU~:.}w-4',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(
      `UPDATE public.perfiles SET rol = 'ADMIN' WHERE email = $1 RETURNING id, email, rol, nombre_completo;`,
      [email.trim()]
    );

    if (res.rowCount === 0) {
      console.log(`No se encontro ningun usuario registrado con el correo: ${email}`);
      console.log('Primero registrese en la aplicacion y luego ejecute este comando.');
    } else {
      console.log('ROL_ADMIN_ASIGNADO_CON_EXITO:');
      console.log(res.rows[0]);
    }
  } catch (err) {
    console.error('Error al actualizar rol:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
