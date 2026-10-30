import mongoose, { ClientSession } from 'mongoose';

/**
 * Executes an operation with a transaction if supported by the MongoDB cluster (e.g. Atlas / ReplicaSet).
 * If the cluster is a standalone local instance without replica sets, executes without a transaction session.
 */
export async function runInTransaction<T>(
  operation: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  let session: ClientSession | null = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        // Silently catch abort error if transaction was already aborted or not started
      }
    }

    // Check if error is due to standalone instance not supporting replica set transactions
    if (
      error?.message?.includes('Transaction numbers are only allowed on a replica set member') ||
      error?.code === 20 ||
      error?.codeName === 'IllegalOperation'
    ) {
      // Fallback: execute without transaction for standalone development instances
      return await operation(null);
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

