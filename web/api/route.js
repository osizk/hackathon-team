import { vercelFunction } from '../lib/vercel.js';

export default vercelFunction((app, { body }) => app.route(body), { method: 'POST' });
