import { handle } from 'hono/vercel';
import { createApplication } from '../src/index';

const app = createApplication();

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
export default handle(app);

