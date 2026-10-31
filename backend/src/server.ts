import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { schedulerService } from './services/scheduler.service.js';

const startServer = async () => {
  try {
    await connectDB();

    const app = createApp();

    // Start background reminder processor
    schedulerService.startReminderScheduler(60000);

    const server = app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(` AdvD Legal SaaS API running on port ${ENV.PORT}`);
      console.log(` Mode: ${ENV.NODE_ENV}`);
      console.log(` API Base URL: ${ENV.API_URL || `http://localhost:${ENV.PORT}`}`);
      console.log(` Allowed Frontend: ${ENV.APP_URL}`);
      console.log(`===============================================`);
    });

    const shutdown = () => {
      console.log('Shutting down AdvD backend gracefully...');
      schedulerService.stopReminderScheduler();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start AdvD backend server:', error);
    process.exit(1);
  }
};

startServer();

