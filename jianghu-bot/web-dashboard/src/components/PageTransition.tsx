'use client';
import { motion } from 'framer-motion';
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div 
      className="w-full flex-1 min-h-0 h-full flex flex-col"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
