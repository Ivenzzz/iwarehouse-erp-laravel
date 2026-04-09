import React from "react";
import { motion } from "framer-motion";

export function BoxAssemblingAnimation({ message = "Creating...", current = 0, total = 0 }) {
  const boxes = [0, 1, 2, 3, 4];
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-64 h-64 mb-6">
        {boxes.map((index) => {
          const angle = (index / boxes.length) * Math.PI * 2;
          const radius = 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <motion.div
              key={index}
              className="absolute left-1/2 top-1/2"
              initial={{ x: x, y: y, scale: 0, opacity: 0 }}
              animate={{
                x: [x, 0, 0],
                y: [y, 0, 0],
                scale: [0, 1, 1],
                opacity: [0, 1, 1],
                rotate: [0, 0, 360]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                delay: index * 0.2,
                times: [0, 0.4, 1]
              }}
            >
              <div 
                className="w-12 h-12 rounded-lg shadow-lg"
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(${(index * 360) / boxes.length}, 70%, 60%), 
                    hsl(${(index * 360) / boxes.length + 60}, 70%, 50%))`
                }}
              />
            </motion.div>
          );
        })}
        
        {/* Center pulsing box */}
        <motion.div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl" />
        </motion.div>
      </div>
      
      <motion.p
        className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
      
      {total > 0 && (
        <motion.div
          className="text-sm font-medium text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {current} / {total}
        </motion.div>
      )}
    </div>
  );
}