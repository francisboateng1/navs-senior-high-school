import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import { env, isMysqlConfigured } from './env.js';

let mysqlPool = null;
let sqliteDb = null;

function createSqliteWrapper(db) {
  const normalizeParams = (params = []) =>
    params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

  const client = {
    driver: 'sqlite',
    async query(sql, params = []) {
      const stmt = db.prepare(sql);
      return stmt.all(...normalizeParams(params));
    },
    async queryOne(sql, params = []) {
      const stmt = db.prepare(sql);
      const row = stmt.get(...normalizeParams(params));
      return row ?? null;
    },
    async execute(sql, params = []) {
      const stmt = db.prepare(sql);
      const res = stmt.run(...normalizeParams(params));
      return {
        insertId: Number(res.lastInsertRowid || 0),
        affectedRows: Number(res.changes || 0),
      };
    },
    async execRaw(sql) {
      db.exec(sql);
    },
    async transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(client);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
  return client;
}

function createMysqlWrapper(pool) {
  const createTxClient = (conn) => ({
    driver: 'mysql',
    async query(sql, params = []) {
      const [rows] = await conn.execute(sql, params);
      return rows;
    },
    async queryOne(sql, params = []) {
      const [rows] = await conn.execute(sql, params);
      return rows[0] ?? null;
    },
    async execute(sql, params = []) {
      const [result] = await conn.execute(sql, params);
      return {
        insertId: Number(result.insertId || 0),
        affectedRows: Number(result.affectedRows || 0),
      };
    },
    async execRaw(sql) {
      await conn.query(sql);
    },
    async transaction(fn) {
      return fn(createTxClient(conn));
    },
  });

  return {
    driver: 'mysql',
    async query(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
    async queryOne(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows[0] ?? null;
    },
    async execute(sql, params = []) {
      const [result] = await pool.execute(sql, params);
      return {
        insertId: Number(result.insertId || 0),
        affectedRows: Number(result.affectedRows || 0),
      };
    },
    async execRaw(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const result = await fn(createTxClient(conn));
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },
  };
}

let cachedDb = null;

export function getDb() {
  if (cachedDb) return cachedDb;

  if (isMysqlConfigured()) {
    if (env.databaseUrl) {
      mysqlPool = mysql.createPool({
        uri: env.databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        multipleStatements: true,
        ssl: env.dbSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      });
    } else {
      mysqlPool = mysql.createPool({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        waitForConnections: true,
        connectionLimit: 10,
        multipleStatements: true,
        ssl: env.dbSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      });
    }
    cachedDb = createMysqlWrapper(mysqlPool);
    return cachedDb;
  }

  // Zero-config relational SQLite fallback for local preview
  const dataDir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'navs.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  cachedDb = createSqliteWrapper(sqliteDb);
  return cachedDb;
}
