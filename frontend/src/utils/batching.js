/**
 * Utility for batching answer submissions to reduce database load
 */

const BATCH_CONFIG = {
  // Time-based batching: send after this many seconds
  TIME_INTERVAL_MS: 20000, // 20 seconds

  // Size-based batching: send when buffer reaches this size
  MAX_BATCH_SIZE: 10,

  // Heartbeat: send buffered answers even if not full batch
  HEARTBEAT_INTERVAL_MS: 5000, // 5 seconds

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000, // Exponential backoff base
};

/**
 * Class to manage answer batching for a quiz session
 */
class AnswerBatcher {
  constructor(roomId, participantId, socket) {
    this.roomId = roomId;
    this.participantId = participantId;
    this.socket = socket;

    // Buffer for answers waiting to be sent
    this.answerBuffer = [];

    // Timers
    this.batchTimer = null;
    this.heartbeatTimer = null;

    // Retry tracking for failed batches
    this.pendingRetries = new Map(); // batchId => {attempts, data, timestamp}

    // Bind methods
    this.sendBatch = this.sendBatch.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
    this.handleBatchAck = this.handleBatchAck.bind(this);
  }

  /**
   * Add an answer to the batch buffer
   * @param {Object} answerData - Answer data to buffer
   */
  addAnswer(answerData) {
    // Add timestamp for deduplication and ordering
    const answerWithMeta = {
      ...answerData,
      timestamp: Date.now(),
      participantId: this.participantId
    };

    this.answerBuffer.push(answerWithMeta);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(this.sendBatch, BATCH_CONFIG.TIME_INTERVAL_MS);
    }

    // Start heartbeat timer if not already running
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(this.sendHeartbeat, BATCH_CONFIG.HEARTBEAT_INTERVAL_MS);
    }

    // Send immediately if we've reached max batch size
    if (this.answerBuffer.length >= BATCH_CONFIG.MAX_BATCH_SIZE) {
      this.sendBatch();
    }
  }

  /**
   * Send the current batch of answers
   */
  sendBatch() {
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Don't send if buffer is empty
    if (this.answerBuffer.length === 0) {
      return;
    }

    // Create batch payload
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const batchData = {
      roomId: this.roomId,
      answers: [...this.answerBuffer], // Copy buffer
      batchId: batchId,
      sentAt: Date.now()
    };

    // Clear buffer for next batch
    this.answerBuffer = [];

    // Send via socket
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit-answer-batch', batchData, (response) => {
        this.handleBatchResponse(batchId, batchData, response || {});
      });
    } else {
      // Socket not connected, store for retry
      this.storeForRetry(batchId, batchData);
    }
  }

  /**
   * Send heartbeat with current buffered answers
   */
  sendHeartbeat() {
    // Only send if we have buffered answers
    if (this.answerBuffer.length > 0) {
      this.sendBatch();
    }
  }

  /**
   * Handle batch response from server
   * @param {string} batchId - ID of the batch
   * @param {Object} batchData - Original batch data
   * @param {Object} response - Server response
   */
  handleBatchResponse(batchId, batchData, response) {
    // Clear any pending retry for this batch
    this.pendingRetries.delete(batchId);

    if (response.success) {
      // Batch successful, optionally handle per-answer acknowledgments
      if (response.answers && Array.isArray(response.answers)) {
        // Could update UI with per-answer status if needed
      }
    } else {
      // Batch failed, schedule retry if attempts remain
      this.handleBatchFailure(batchId, batchData, response);
    }
  }

  /**
   * Handle batch failure and schedule retry if appropriate
   * @param {string} batchId - ID of the failed batch
   * @param {Object} batchData - Original batch data
   * @param {Object} response - Server response
   */
  handleBatchFailure(batchId, batchData, response) {
    const retryInfo = this.pendingRetries.get(batchId) || { attempts: 0, data: batchData, timestamp: Date.now() };

    if (retryInfo.attempts < BATCH_CONFIG.MAX_RETRY_ATTEMPTS) {
      // Schedule retry with exponential backoff
      retryInfo.attempts += 1;
      retryInfo.timestamp = Date.now();
      this.pendingRetries.set(batchId, retryInfo);

      const delay = BATCH_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryInfo.attempts - 1);
      setTimeout(() => {
        // Retry sending the batch
        if (this.socket && this.socket.connected) {
          this.socket.emit('submit-answer-batch', retryInfo.data, (response) => {
            this.handleBatchResponse(batchId, retryInfo.data, response || {});
          });
        } else {
          // Still not connected, keep in retry queue
          this.handleBatchFailure(batchId, retryInfo.data, response || {});
        }
      }, delay);
    } else {
      // Max retries exceeded, give up and potentially notify user
      console.warn(`Batch ${batchId} failed after ${BATCH_CONFIG.MAX_RETRY_ATTEMPTS} attempts`, response);
      // Could emit an event to UI to notify user of connectivity issues
    }
  }

  /**
   * Store batch data for retry when socket reconnects
   * @param {string} batchId - ID of the batch
   * @param {Object} batchData - Batch data to store
   */
  storeForRetry(batchId, batchData) {
    this.pendingRetries.set(batchId, {
      attempts: 0,
      data: batchData,
      timestamp: Date.now()
    });
  }

  /**
   * Process any pending retries (called when socket reconnects)
   */
  processPendingRetries() {
    const now = Date.now();
    const expiredBatches = [];

    this.pendingRetries.forEach((retryInfo, batchId) => {
      // Remove batches older than 5 minutes to prevent infinite retries
      if (now - retryInfo.timestamp > 300000) { // 5 minutes
        expiredBatches.push(batchId);
        return;
      }

      // Attempt to send if socket is connected
      if (this.socket && this.socket.connected) {
        this.socket.emit('submit-answer-batch', retryInfo.data, (response) => {
          this.handleBatchResponse(batchId, retryInfo.data, response || {});
        });
      }
    });

    // Clean up expired batches
    expiredBatches.forEach(batchId => this.pendingRetries.delete(batchId));
  }

  /**
   * Clean up timers and pending state
   */
  destroy() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Clear pending retries (they'll be handled on reconnect if needed)
    this.pendingRetries.clear();
  }
}

// Export singleton factory function
let batcherInstance = null;

/**
 * Get or create an answer batcher for the given room/participant/socket
 * @param {string} roomId - Room ID
 * @param {string} participantId - Participant ID
 * @param {Object} socket - Socket.IO socket instance
 * @returns {AnswerBatcher} - Batcher instance
 */
export const getAnswerBatcher = (roomId, participantId, socket) => {
  if (!batcherInstance ||
      batcherInstance.roomId !== roomId ||
      batcherInstance.participantId !== participantId ||
      batcherInstance.socket !== socket) {
    batcherInstance = new AnswerBatcher(roomId, participantId, socket);
  }
  return batcherInstance;
};

/**
 * Destroy the current batcher instance
 */
export const destroyAnswerBatcher = () => {
  if (batcherInstance) {
    batcherInstance.destroy();
    batcherInstance = null;
  }
};