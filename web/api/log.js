import { vercelFunction } from '../lib/vercel.js';

export default vercelFunction((app, { headers, body }) => app.log(headers, body), { method: 'POST' });
