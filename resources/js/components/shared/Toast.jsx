import React from "react";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Toast({ open, onOpenChange, title, description, variant = "success" }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  };

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 50, x: 50 }}
          className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
        >
          <div className={`${bgColors[variant]} border-2 rounded-lg shadow-xl p-4`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {icons[variant]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="flex-shrink-0 h-6 w-6 hover:bg-gray-200/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}