import { motion } from "framer-motion";

/**
 * PageTransition — soft fade-in/slide-in wrapper for top-level route screens.
 * Used on public route elements for enter animations. Exit animations require
 * an <AnimatePresence> parent (handled in Layout.jsx around <Outlet/>).
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}