const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ===================== DB =====================
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'worldcupdb',
  max: 10
});

// ===================== API =====================
const API_BASE = 'https://api.football-data.org/v4';
const API_TOKEN = process.env.FOOTBALL_API_TOKEN;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'X-Auth-Token': API_TOKEN
  }
});

// ===================== UTIL =====================
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(fn, label, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`❌ ${label} attempt ${i} failed:`, err.message);

      if (i === retries) throw err;
      await delay(2000 * i); // exponential backoff
    }
  }
}

// ===================== DB INIT =====================
async function connectDB() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ DB connected');
      return;
    } catch (err) {
      console.log(`⏳ DB retry ${i}/30`);
      await delay(2000);
    }
  }
  throw new Error('DB connection failed');
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      home_team TEXT,
      away_team TEXT,
      home_crest TEXT,
      away_crest TEXT,
      home_score INT,
      away_score INT,
      status TEXT,
      matchday INT,
      stage TEXT,
      match_date TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS standings (
      id SERIAL PRIMARY KEY,
      group_name TEXT,
      position INT,
      team_name TEXT,
      team_crest TEXT,
      played INT,
      won INT,
      draw INT,
      lost INT,
      points INT,
      goals_for INT,
      goals_against INT,
      goal_diff INT
    );

    CREATE TABLE IF NOT EXISTS scorers (
      id SERIAL PRIMARY KEY,
      player_name TEXT,
      team_name TEXT,
      team_crest TEXT,
      goals INT,
      assists INT
    );
  `);

  console.log('✅ DB initialized');
}

// ===================== FETCH MATCHES =====================
async function fetchMatches() {
  console.log('🔄 Fetching matches...');

  const res = await fetchWithRetry(
    () => api.get('/competitions/WC/matches'),
    'matches'
  );

  const matches = res.data.matches;

  for (const m of matches) {
    await pool.query(`
      INSERT INTO matches (
        id, home_team, away_team, home_crest, away_crest,
        home_score, away_score, status, matchday, stage, match_date, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        home_score = $6,
        away_score = $7,
        status = $8,
        updated_at = NOW()
    `, [
      m.id,
      m.homeTeam.name,
      m.awayTeam.name,
      m.homeTeam.crest,
      m.awayTeam.crest,
      m.score?.fullTime?.home,
      m.score?.fullTime?.away,
      m.status,
      m.matchday,
      m.stage,
      m.utcDate
    ]);
  }

  console.log(`✅ Matches cached: ${matches.length}`);
}

// ===================== FETCH STANDINGS =====================
async function fetchStandings() {
  console.log('🔄 Fetching standings...');

  const res = await fetchWithRetry(
    () => api.get('/competitions/WC/standings'),
    'standings'
  );

  const standings = res.data.standings;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM standings');

    for (const group of standings) {
      const groupName = group.group || group.stage || 'GROUP';

      for (const row of group.table) {
        await client.query(`
          INSERT INTO standings (
            group_name, position, team_name, team_crest,
            played, won, draw, lost, points,
            goals_for, goals_against, goal_diff
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [
          groupName,
          row.position,
          row.team.name,
          row.team.crest,
          row.playedGames,
          row.won,
          row.draw,
          row.lost,
          row.points,
          row.goalsFor,
          row.goalsAgainst,
          row.goalDifference
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Standings cached');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Standings error:', err.message);
  } finally {
    client.release();
  }
}

// ===================== FETCH SCORERS =====================
async function fetchScorers() {
  console.log('🔄 Fetching scorers...');

  const res = await fetchWithRetry(
    () => api.get('/competitions/WC/scorers'),
    'scorers'
  );

  const scorers = res.data.scorers;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM scorers');

    for (const s of scorers) {
      await client.query(`
        INSERT INTO scorers (
          player_name, team_name, team_crest, goals, assists
        )
        VALUES ($1,$2,$3,$4,$5)
      `, [
        s.player.name,
        s.team.name,
        s.team.crest,
        s.goals,
        s.assists || 0
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Scorers cached');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Scorers error:', err.message);
  } finally {
    client.release();
  }
}

// ===================== ROUTES =====================
app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/api/matches', async (req, res) => {
  const r = await pool.query('SELECT * FROM matches ORDER BY match_date ASC');
  res.json(r.rows);
});

app.get('/api/standings', async (req, res) => {
  const r = await pool.query('SELECT * FROM standings ORDER BY group_name, position');
  res.json(r.rows);
});

app.get('/api/scorers', async (req, res) => {
  const r = await pool.query('SELECT * FROM scorers ORDER BY goals DESC LIMIT 20');
  res.json(r.rows);
});

// ===================== CRON (SAFE) =====================
cron.schedule('*/6 * * * *', async () => {
  try {
    await fetchMatches();
  } catch (e) {
    console.error('Cron matches failed:', e.message);
  }
});

cron.schedule('*/12 * * * *', async () => {
  try {
    await fetchStandings();
    await delay(5000);
    await fetchScorers();
  } catch (e) {
    console.error('Cron standings/scorers failed:', e.message);
  }
});

// ===================== START =====================
async function start() {
  try {
    await connectDB();
    await initDB();

    if (!API_TOKEN) {
      console.log('⚠️ Missing FOOTBALL_API_TOKEN');
    } else {
      // sequential startup (no burst)
      await fetchMatches().catch(console.error);
      await delay(5000);
      await fetchStandings().catch(console.error);
      await delay(5000);
      await fetchScorers().catch(console.error);
    }

    app.listen(3000, () => {
      console.log('🚀 Backend running on 3000');
    });

  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

start();