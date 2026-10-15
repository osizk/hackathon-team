import { vercelFunction } from '../../lib/vercel.js';

export default vercelFunction((app, { headers }) => app.session(headers));
