import nodemailer from 'nodemailer';

let cachedTransporter;

// Simple in-process idempotency cache to avoid accidental duplicate sends
// within a short window (common in dev/HMR or double-invocations).
const recentSends = new Map(); // key -> timestamp
const IDEMPOTENCY_TTL_MS = 20_000; // 20 seconds

function normalizeToArray(to) {
    if (!to) return [];
    if (Array.isArray(to)) return to.filter(Boolean);
    if (typeof to === 'string') return to.split(',').map(s => s.trim()).filter(Boolean);
    return [];
}

function fingerprintEmail({ to, subject, text, html }) {
    const toList = normalizeToArray(to).map(e => (e || '').toLowerCase()).sort();
    const body = html || text || '';
    return JSON.stringify({ to: toList, subject: subject || '', body });
}

function shouldSkipByIdempotencyKey(key) {
    if (!key) return false;
    const now = Date.now();
    const last = recentSends.get(key);
    // Clean up old entries opportunistically
    for (const [k, ts] of recentSends) {
        if (now - ts > IDEMPOTENCY_TTL_MS) recentSends.delete(k);
    }
    if (last && now - last < IDEMPOTENCY_TTL_MS) {
        return true;
    }
    recentSends.set(key, now);
    return false;
}

export function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    const {
        GMAIL_EMAIL,
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN,
    } = process.env;

    if (!GMAIL_EMAIL || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        throw new Error('Missing Gmail OAuth2 env vars. Please set GMAIL_EMAIL, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
    }

    cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: GMAIL_EMAIL,
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
        },
    });

    return cachedTransporter;
}

/**
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {string} [options.from] - Optional sender. Gmail may rewrite to the authenticated account unless alias is configured.
 * @param {Array} [options.attachments] - Nodemailer attachments array
 * @returns {Promise<{messageId: string, accepted: string[], rejected: string[], response: string}>}
 */
export async function sendMail({ to, subject, text, html, from, attachments } = {}) {
    if (!to || !subject || (!text && !html)) {
        throw new Error('Missing required fields: to, subject, and text or html');
    }

    // Build an implicit idempotency key from content to prevent accidental duplicates
    const implicitKey = fingerprintEmail({ to, subject, text, html });
    if (shouldSkipByIdempotencyKey(implicitKey)) {
        try { console.warn('[mailer] Skipping duplicate email within TTL:', { subject, to }); } catch {}
        return {
            messageId: 'skipped-idempotent',
            accepted: [],
            rejected: [],
            response: 'skipped: duplicate within TTL',
        };
    }

    const transporter = getTransporter();
    const realFrom = from || process.env.GMAIL_EMAIL;

    // Normalize and de-duplicate recipients to avoid double delivery when the same
    // address is present multiple times (or with different casing) in the input.
    const toList = normalizeToArray(to);
    const seen = new Set();
    const uniqueRecipients = [];
    for (const addr of toList) {
        const key = (addr || '').toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueRecipients.push(addr);
    }
    if (uniqueRecipients.length === 0) {
        throw new Error('No valid recipients after normalization');
    }

    const info = await transporter.sendMail({
        from: realFrom,
        to: uniqueRecipients,
        subject,
        text,
        html,
        attachments,
    });

    return {
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        response: info.response,
    };
}
