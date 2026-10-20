import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`API lista en http://localhost:${env.PORT}/api/v1/health`);
});
