import { motion } from "framer-motion";
import { Headset } from "lucide-react";
import RemoteAssistanceCard from "@/components/ui/RemoteAssistanceCard";

export default function RemoteSupport() {
  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Headset className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Live Remote Assistance</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Need hands-on help? Generate a secure PIN below to grant our developer team temporary access to troubleshoot your account safely.
          </p>
        </div>
{/* Remote Assistance Card Component */}
        <div className="flex justify-center">
            <RemoteAssistanceCard />
        </div>

      </motion.div>
    </div>
  );
}
