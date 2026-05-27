const { Client } = require('pg');
require('dotenv').config();

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await client.connect();
    console.log("Connected to:", process.env.DATABASE_URL.split('@')[1]);
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'CommissionShare'
    `);
    console.log("Columns in CommissionShare table:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("DB Check Error:", err);
  } finally {
    await client.end();
  }
}

checkDb();
