import { createApplication } from './src/index';

const app = createApplication();

Bun.serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 4000),
});
