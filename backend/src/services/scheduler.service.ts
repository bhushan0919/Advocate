import { notificationService } from './notification.service.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export const schedulerService = {
  /**
   * Starts background reminder and overdue task processor
   * Default interval: 60 seconds
   */
  startReminderScheduler: (intervalMs: number = 60000): void => {
    if (schedulerInterval) {
      return; // Already running
    }

    console.log(`[Scheduler] Reminder background processor started (interval: ${intervalMs / 1000}s)`);

    // Initial run after small initial delay
    setTimeout(async () => {
      await schedulerService.runScheduledCheck();
    }, 2000);

    schedulerInterval = setInterval(async () => {
      await schedulerService.runScheduledCheck();
    }, intervalMs);

    // Ensure timer doesn't prevent process from exiting
    if (schedulerInterval.unref) {
      schedulerInterval.unref();
    }
  },

  /**
   * Stops background processor gracefully
   */
  stopReminderScheduler: (): void => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[Scheduler] Reminder background processor stopped.');
    }
  },

  /**
   * Executes one cycle of reminder and task checks
   */
  runScheduledCheck: async (): Promise<{ processedReminders: number; notifiedOverdueTasks: number }> => {
    if (isProcessing) {
      return { processedReminders: 0, notifiedOverdueTasks: 0 };
    }

    try {
      isProcessing = true;
      const processedReminders = await notificationService.processDueReminders();
      const notifiedOverdueTasks = await notificationService.checkOverdueTasks();

      if (processedReminders > 0 || notifiedOverdueTasks > 0) {
        console.log(
          `[Scheduler] Processed ${processedReminders} due reminders and ${notifiedOverdueTasks} overdue tasks.`
        );
      }

      return { processedReminders, notifiedOverdueTasks };
    } catch (error) {
      console.error('[Scheduler] Error in scheduled reminder check cycle:', error);
      return { processedReminders: 0, notifiedOverdueTasks: 0 };
    } finally {
      isProcessing = false;
    }
  },
};

