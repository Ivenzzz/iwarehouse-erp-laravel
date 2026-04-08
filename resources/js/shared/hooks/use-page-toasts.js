import { useEffect, useMemo, useRef } from "react";
import { usePage } from "@inertiajs/react";

import { toast } from "@/shared/hooks/use-toast";

function normalizeMessages(messages) {
  return messages
    .flatMap((message) => Array.isArray(message) ? message : [message])
    .map((message) => String(message ?? "").trim())
    .filter(Boolean);
}

export function usePageToasts(messages, variant = "default") {
  const { url } = usePage();
  const lastSignatureRef = useRef("");
  const normalizedMessages = useMemo(() => normalizeMessages(messages), [messages]);

  useEffect(() => {
    if (normalizedMessages.length === 0) {
      lastSignatureRef.current = "";
      return;
    }

    const signature = `${url}|${variant}|${normalizedMessages.join("||")}`;

    if (lastSignatureRef.current === signature) {
      return;
    }

    lastSignatureRef.current = signature;

    normalizedMessages.forEach((message) => {
      toast({
        variant,
        description: message,
      });
    });
  }, [normalizedMessages, url, variant]);
}
