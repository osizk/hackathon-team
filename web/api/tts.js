import { vercelFunction } from '../lib/vercel.js';

export default vercelFunction((app, { headers, body }) => app.tts(headers, body), { method: 'POST' });
