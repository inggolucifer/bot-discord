const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB transaction if the database supports it.
 * If the database environment (e.g. standalone MongoDB instance locally)
 * does not support transactions, it will gracefully fallback to executing
 * without a transaction, but the lock manager should still provide some protection.
 *
 * @param {Function} callback - The logic to execute. Receives `(session)` as an argument.
 *                              `session` will be null if transactions aren't supported.
 * @returns {Promise<any>} - Returns whatever the callback returns.
 */
async function withTransaction(callback) {
    let session = null;
    let transactionStarted = false;

    try {
        // Attempt to start a session and transaction.
        // This may fail on non-replica set MongoDB (e.g., local dev without rs.initiate())
        session = await mongoose.startSession();

        try {
            session.startTransaction();
            transactionStarted = true;
        } catch (txError) {
            // Transactions not supported by this MongoDB topology
            console.warn('[WARNING] MongoDB Transactions not supported. Falling back to non-transactional execution. Error:', txError.message);

            // Clean up the session since we can't use it for a transaction
            if (session) {
                await session.endSession();
                session = null;
            }
        }
    } catch (sessionError) {
        // Sessions entirely not supported
        console.warn('[WARNING] MongoDB Sessions not supported. Falling back to non-transactional execution. Error:', sessionError.message);
        session = null;
    }

    try {
        // Execute the actual logic, passing the session (can be null if unsupported)
        const result = await callback(session);

        // If we successfully executed and had a transaction, commit it
        if (transactionStarted && session) {
            await session.commitTransaction();
        }

        return result;
    } catch (error) {
        // If an error occurred in the callback and we have a transaction, abort it
        if (transactionStarted && session) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error('[FATAL] Failed to abort MongoDB transaction:', abortError);
            }
        }

        // Rethrow the error so the caller can handle it (e.g. returning 500 or 400)
        throw error;
    } finally {
        // Always end the session to prevent memory leaks
        if (session) {
            await session.endSession();
        }
    }
}

module.exports = { withTransaction };
