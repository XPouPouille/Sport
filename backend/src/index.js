const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const https = require('https');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

app.use(cors());
app.use(express.json());

// --- Mailer ---
const mailerConfig = {
    host: process.env.SMTP_HOST || 'mailpit',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
};
if (process.env.SMTP_USER) {
    mailerConfig.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
}
const mailer = nodemailer.createTransport(mailerConfig);

// --- Telegram notification ---
async function sendTelegram(chatId, message) {
    if (!TELEGRAM_BOT_TOKEN || !chatId) return;
    const body = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' });
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, resolve);
        req.on('error', (e) => console.error('Telegram error:', e.message));
        req.write(body);
        req.end();
    });
}

// --- Auth middleware ---
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
}

// --- Auth routes ---
app.post('/auth/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (username, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, phone',
        [username, email, hash, phone || null]
    );
    res.json(result.rows[0]);
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, phone: user.phone, telegram_chat_id: user.telegram_chat_id } });
});

// --- Forgot password ---
app.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });

    const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return;
    const user = result.rows[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expires]
    );

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    try {
        await mailer.sendMail({
            from: process.env.SMTP_FROM || 'Sport Tracker <noreply@sport.local>',
            to: email,
            subject: 'Réinitialisation de mot de passe — Sport Tracker',
            html: `<p>Bonjour ${user.username},</p><p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p><p>Lien valable 24 heures.</p>`,
        });
    } catch (err) { console.error('Mail error:', err.message); }
});

app.get('/auth/reset-password/:token', async (req, res) => {
    const result = await pool.query(
        `SELECT t.*, u.username FROM password_reset_tokens t JOIN users u ON t.user_id = u.id WHERE t.token = $1 AND t.expires_at > NOW()`,
        [req.params.token]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    res.json({ valid: true, username: result.rows[0].username });
});

app.post('/auth/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min).' });
    const result = await pool.query(
        `SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()`, [req.params.token]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, result.rows[0].user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [req.params.token]);
    res.json({ message: 'Mot de passe mis à jour.' });
});

// --- Profile ---
app.get('/profile', auth, async (req, res) => {
    const result = await pool.query(
        'SELECT id, username, email, role, phone, telegram_chat_id FROM users WHERE id = $1',
        [req.user.id]
    );
    res.json(result.rows[0]);
});

app.put('/profile', auth, async (req, res) => {
    const { phone, telegram_chat_id } = req.body;
    const result = await pool.query(
        'UPDATE users SET phone = $1, telegram_chat_id = $2 WHERE id = $3 RETURNING id, username, email, role, phone, telegram_chat_id',
        [phone || null, telegram_chat_id || null, req.user.id]
    );
    res.json(result.rows[0]);
});

// --- Users (admin) ---
app.get('/users', auth, adminOnly, async (req, res) => {
    const result = await pool.query('SELECT id, username, email, role, phone, telegram_chat_id, created_at FROM users ORDER BY id');
    res.json(result.rows);
});

app.delete('/users/:id', auth, adminOnly, async (req, res) => {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
});

app.patch('/users/:id/role', auth, adminOnly, async (req, res) => {
    const { role } = req.body;
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role', [role, req.params.id]);
    res.json(result.rows[0]);
});

// --- Items ---
app.get('/items', auth, async (req, res) => {
    const result = await pool.query(
        `SELECT i.*, u.username as created_by_name FROM items i LEFT JOIN users u ON i.created_by = u.id ORDER BY i.created_at DESC`
    );
    res.json(result.rows);
});

app.post('/items', auth, async (req, res) => {
    const { name, description, unit } = req.body;
    const result = await pool.query(
        'INSERT INTO items (name, description, unit, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, unit || 'reps', req.user.id]
    );
    res.json(result.rows[0]);
});

app.delete('/items/:id', auth, adminOnly, async (req, res) => {
    await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
});

// --- Goals ---
app.get('/goals', auth, async (req, res) => {
    const result = await pool.query(
        `SELECT g.*, i.name as item_name, i.unit FROM goals g JOIN items i ON g.item_id = i.id WHERE g.user_id = $1`,
        [req.user.id]
    );
    res.json(result.rows);
});

app.post('/goals', auth, async (req, res) => {
    const { item_id, target, goal_type, period } = req.body;
    const result = await pool.query(
        `INSERT INTO goals (user_id, item_id, target, goal_type, period) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, item_id) DO UPDATE SET target = $3, goal_type = $4, period = $5 RETURNING *`,
        [req.user.id, item_id, target, goal_type || 'min', period || 'daily']
    );
    res.json(result.rows[0]);
});

// --- Logs ---
app.get('/logs', auth, async (req, res) => {
    const { item_id, from, to } = req.query;
    let query = `SELECT l.*, i.name as item_name, i.unit FROM logs l JOIN items i ON l.item_id = i.id WHERE l.user_id = $1`;
    const params = [req.user.id];
    if (item_id) { params.push(item_id); query += ` AND l.item_id = $${params.length}`; }
    if (from) { params.push(from); query += ` AND l.logged_at >= $${params.length}`; }
    if (to) { params.push(to); query += ` AND l.logged_at <= $${params.length}`; }
    query += ' ORDER BY l.logged_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
});

app.post('/logs', auth, async (req, res) => {
    const { item_id, quantity, note, logged_at } = req.body;
    const result = await pool.query(
        'INSERT INTO logs (user_id, item_id, quantity, note, logged_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, item_id, quantity, note, logged_at || new Date()]
    );
    res.json(result.rows[0]);

    // --- Telegram notification after log ---
    try {
        const userRow = await pool.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
        const chatId = userRow.rows[0]?.telegram_chat_id;
        if (!chatId) return;

        // Get item name + goal
        const goalRow = await pool.query(
            `SELECT g.target, g.goal_type, g.period, i.name, i.unit FROM goals g
             JOIN items i ON g.item_id = i.id WHERE g.user_id = $1 AND g.item_id = $2`,
            [req.user.id, item_id]
        );
        if (!goalRow.rows[0]) return;
        const goal = goalRow.rows[0];

        // Daily total
        const today = new Date(logged_at || new Date());
        const from = new Date(today); from.setHours(0, 0, 0, 0);
        const to = new Date(today); to.setHours(23, 59, 59, 999);
        const totalRow = await pool.query(
            `SELECT SUM(quantity) as total FROM logs WHERE user_id = $1 AND item_id = $2 AND logged_at BETWEEN $3 AND $4`,
            [req.user.id, item_id, from, to]
        );
        const total = Number(totalRow.rows[0]?.total || 0);
        const target = Number(goal.target);

        if (goal.goal_type === 'min' && total >= target && (total - Number(quantity)) < target) {
            await sendTelegram(chatId,
                `✅ *Objectif atteint !*\n${goal.name} : ${total} ${goal.unit} / objectif ${target} ${goal.unit}`
            );
        } else if (goal.goal_type === 'max' && total > target) {
            await sendTelegram(chatId,
                `⚠️ *Objectif maximum dépassé !*\n${goal.name} : ${total} ${goal.unit} (max : ${target} ${goal.unit})`
            );
        }
    } catch (err) { console.error('Telegram notify error:', err.message); }
});

app.delete('/logs/:id', auth, async (req, res) => {
    await pool.query('DELETE FROM logs WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
});

// --- Stats ---
app.get('/stats', auth, async (req, res) => {
    const { item_id, period, user_id } = req.query;
    const periods = {
        '1w': "NOW() - INTERVAL '7 days'",
        '1m': "NOW() - INTERVAL '1 month'",
        '3m': "NOW() - INTERVAL '3 months'",
        '6m': "NOW() - INTERVAL '6 months'",
        '1y': "NOW() - INTERVAL '1 year'",
        'all': "'1970-01-01'"
    };
    const since = periods[period] || periods['all'];
    let userFilter = '';
    const params = [item_id];
    if (user_id === 'all') {
        // aggregate all
    } else if (user_id && user_id !== 'me' && req.user.role === 'admin') {
        params.push(Number(user_id)); userFilter = `AND user_id = $${params.length}`;
    } else {
        params.push(req.user.id); userFilter = `AND user_id = $${params.length}`;
    }
    const result = await pool.query(
        `SELECT DATE(logged_at) as date, SUM(quantity) as total FROM logs WHERE item_id = $1 ${userFilter} AND logged_at >= ${since} GROUP BY DATE(logged_at) ORDER BY date ASC`,
        params
    );
    res.json(result.rows);
});

app.listen(process.env.PORT || 3001, () => console.log('Backend running on port', process.env.PORT || 3001));
