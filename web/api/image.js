import { vercelFunction } from '../lib/vercel.js';

export default vercelFunction((app, { headers, body }) => app.image(headers, body), { method: 'POST' });
