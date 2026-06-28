import { useEffect, useState, useCallback } from "react";
import { processSubmissionTransaction, ProcessSubmissionPayload } from "../lib/submissionHelper";

const STORAGE_KEY = "pending_submissions";

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const getPendingSubmissions = (): ProcessSubmissionPayload[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const updatePendingCount = useCallback(() => {
    setPendingCount(getPendingSubmissions().length);
  }, []);

  const savePendingSubmission = (payload: ProcessSubmissionPayload) => {
    const queue = getPendingSubmissions();
    queue.push(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    updatePendingCount();
  };

  const syncPendingSubmissions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const queue = getPendingSubmissions();
    if (queue.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    const remainingQueue = [...queue];

    for (const payload of queue) {
      try {
        await processSubmissionTransaction(payload);
        
        // Remove from remaining queue if successful
        const index = remainingQueue.findIndex(p => p.submission.id === payload.submission.id);
        if (index !== -1) remainingQueue.splice(index, 1);
        successCount++;
      } catch (err) {
        console.error("Failed to sync offline submission:", err);
        // Break the loop if we hit a persistent error (likely network dropped again)
        break;
      }
    }

    // Save whatever is left back to localStorage
    if (remainingQueue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    updatePendingCount();
    setIsSyncing(false);
  }, [isSyncing, updatePendingCount]);

  useEffect(() => {
    updatePendingCount();
    
    const handleOnline = () => {
      syncPendingSubmissions();
    };

    window.addEventListener("online", handleOnline);
    
    // Attempt sync immediately if online and queue is not empty
    if (navigator.onLine) {
       syncPendingSubmissions();
    }
    
    // Check periodically in case event listener missed it
    const interval = setInterval(() => {
      if (navigator.onLine && getPendingSubmissions().length > 0) {
         syncPendingSubmissions();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [syncPendingSubmissions, updatePendingCount]);

  return {
    isSyncing,
    pendingCount,
    savePendingSubmission,
    syncPendingSubmissions
  };
}
