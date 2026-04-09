import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";

/**
 * OIC Password Verification Dialog
 * Verifies OIC (Officer-in-Charge) password before allowing access to restricted POS functions
 * OIC is a position in the sales department, each branch has its own OIC
 */
export default function OICPasswordDialog({ open, onOpenChange, onVerified, branchId }) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Clear password when dialog closes
  React.useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  /**
   * Verify OIC password by checking against OICCredential entity
   * OIC must have:
   * - Active credential record
   * - Matching password
   * - Assignment to the current branch (if branchId provided)
   */
  const handleVerify = async () => {
    if (!password.trim()) {
      toast.error("Please enter the OIC password");
      return;
    }

    setIsVerifying(true);

    try {
      // Get OIC credentials for this branch
      const credentials = await base44.entities.OICCredential.filter({
        is_active: true,
        ...(branchId && { warehouse_id: branchId }),
      });

      if (!credentials || credentials.length === 0) {
        toast.error("No active OIC found for this branch");
        setIsVerifying(false);
        return;
      }

      // Find matching password
      const matchingCredential = credentials.find(
        (cred) => cred.password === password
      );

      if (!matchingCredential) {
        toast.error("Invalid OIC password");
        setIsVerifying(false);
        return;
      }

      // Get employee details
      const employees = await base44.entities.Employee.filter({
        id: matchingCredential.employee_id,
      });

      if (!employees || employees.length === 0) {
        toast.error("OIC employee record not found");
        setIsVerifying(false);
        return;
      }

      const oicEmployee = employees[0];

      // Update last_used timestamp
      await base44.entities.OICCredential.update(matchingCredential.id, {
        last_used: new Date().toISOString(),
      });

      toast.success(`OIC verified: ${oicEmployee.personal_info?.full_name}`);
      onVerified(oicEmployee);
      onOpenChange(false);
    } catch (error) {
      console.error("OIC verification error:", error);
      toast.error("Failed to verify OIC credentials");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            OIC Authorization Required
          </DialogTitle>
          <DialogDescription>
            This action requires Officer-in-Charge (OIC) authorization.
            Please enter the OIC password to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Warning message */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-800">
                Only the branch OIC (Officer-in-Charge) from the Sales Department
                can authorize returns and RMA transactions.
              </p>
            </div>
          </div>

          {/* Password input */}
          <div>
            <Label htmlFor="oic-password">OIC Password</Label>
            <Input
              id="oic-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter OIC password"
              autoFocus
              disabled={isVerifying}
              className="mt-1"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}