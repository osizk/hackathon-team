import { vercelFunction } from '../lib/vercel.js';

export default vercelFunction((app) => app.health());
