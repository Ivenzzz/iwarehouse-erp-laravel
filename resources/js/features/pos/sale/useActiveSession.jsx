import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useActiveSession() {
  const queryClient = useQueryClient();

  const { 
    data: activeSession, 
    isLoading: isLoadingSession, 
    isFetched: isSessionFetched,
    refetch 
  } = useQuery({
    queryKey: ["activeSession"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("active_pos_session");
      
      try {
        let currentActiveSession = null;

        if (sessionId) {
          const sessions = await base44.entities.POSSession.filter({ 
            id: sessionId, 
            status: "opened" 
          });

          if (sessions && sessions.length > 0) {
            currentActiveSession = sessions[0];
          }
        }

        // If no session found by ID, or ID was stale, try to find any active session for the current user
        if (!currentActiveSession) {
          const currentUser = await base44.auth.me(); // Fetch current user to get their ID
          if (currentUser?.id) {
            const userSessions = await base44.entities.POSSession.filter({
              cashier_id: currentUser.id,
              status: "opened",
            }, "-shift_start_time", 1); // Get the most recent active session

            if (userSessions && userSessions.length > 0) {
              currentActiveSession = userSessions[0];
              // Update localStorage with the correct active session ID
              localStorage.setItem("active_pos_session", currentActiveSession.id);
            }
          }
        }

        // If still no active session, ensure localStorage is clean
        if (!currentActiveSession && sessionId) {
          console.warn("No active POS session found for localStorage ID, or no active session for user. Clearing localStorage.");
          localStorage.removeItem("active_pos_session");
        }

        return currentActiveSession;

      } catch (error) {
        console.error("Error loading session:", error);
        // Always clear localStorage on error to prevent infinite loops with invalid IDs
        localStorage.removeItem("active_pos_session");
        return null;
      }
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 15000, // Refetch every 15 seconds to catch changes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 1, // Retry once on failure
  });

  // Derive selectedWarehouse from activeSession
  const selectedWarehouse = activeSession?.warehouse_id || "";

  return {
    activeSession,
    selectedWarehouse,
    isLoadingSession,
    isSessionFetched,
    refetchActiveSession: refetch,
  };
}