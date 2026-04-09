import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState, useEffect, useRef } from "react";

export function useChatMessages(entityId, entityType, currentUserId) {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chatMessages", entityType, entityId],
    queryFn: async () => {
      const allMessages = await base44.entities.ChatMessage.list();
      return allMessages
        .filter(
          (msg) => msg.entity_id === entityId && msg.entity_type === entityType
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    initialData: [],
    enabled: !!entityId && !!entityType,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return await base44.entities.ChatMessage.create(messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", entityType, entityId],
      });
      // Invalidate unread count queries
      queryClient.invalidateQueries({ queryKey: ["unreadMessages"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async ({ messageId, userId, currentReadBy }) => {
      if (!currentReadBy.includes(userId)) {
        return await base44.entities.ChatMessage.update(messageId, {
          read_by: [...currentReadBy, userId],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", entityType, entityId],
      });
    },
  });

  // Handle typing indicator with debounce
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping]);

  return {
    messages,
    isLoading,
    sendMessage: sendMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    isTyping,
    setIsTyping,
  };
}

export function useUnreadMessagesCount(entityId, entityType, currentUserId) {
  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", entityType, entityId],
    queryFn: async () => {
      const allMessages = await base44.entities.ChatMessage.list();
      return allMessages.filter(
        (msg) => msg.entity_id === entityId && msg.entity_type === entityType
      );
    },
    initialData: [],
    enabled: !!entityId && !!entityType && !!currentUserId,
    refetchInterval: 5000,
  });

  const unreadCount = messages.filter(
    (msg) =>
      msg.sender_id !== currentUserId &&
      (!msg.read_by || !msg.read_by.includes(currentUserId))
  ).length;

  return unreadCount;
}