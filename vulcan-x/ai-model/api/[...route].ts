// Vercel applies filesystem routing before Hono receives the request.  Keep the
// index entrypoint for the service root and use this catch-all for /api/v1/*.
export { default, DELETE, GET, OPTIONS, PATCH, POST, PUT } from './index';
