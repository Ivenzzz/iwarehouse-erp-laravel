import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function ManagerPINDialog({ open, onOpenChange, onApprove, variance, warehouseId }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: jobTitles = [] } = useQuery({
    queryKey: ['jobTitles'],
    queryFn: () => base44.entities.JobTitle.list(),
    initialData: [],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
    initialData: [],
  });

  useEffect(() => {
    if (!open) {
      setPin('');
      setError('');
    }
  }, [open]);

  const handleVerify = async () => {
    if (!pin.trim()) {
      setError('PIN is required');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const employees = await base44.entities.Employee.list();
      
      // Find Sales department
      const salesDept = departments.find(d => d.name?.toLowerCase() === 'sales');
      if (!salesDept) {
        setError('Sales department not found');
        setIsVerifying(false);
        return;
      }

      // Find OIC job title
      const oicJobTitle = jobTitles.find(jt => jt.title?.toLowerCase().includes('oic'));
      if (!oicJobTitle) {
        setError('OIC job title not found');
        setIsVerifying(false);
        return;
      }

      // Find OIC employee at this warehouse
      const oicEmployee = employees.find(emp => {
        const hasOICJobTitle = emp.employment_info?.job_title_id === oicJobTitle.id;
        const isInSalesDept = emp.employment_info?.department_id === salesDept.id;
        const isAtWarehouse = emp.employment_info?.warehouse_id === warehouseId;
        const isActive = emp.status === 'Active';
        
        return hasOICJobTitle && isInSalesDept && isAtWarehouse && isActive;
      });

      if (!oicEmployee) {
        setError('No OIC found at this branch');
        setIsVerifying(false);
        return;
      }

      // Verify PIN
      const storedPin = oicEmployee.employment_info?.oic_password;
      if (!storedPin) {
        setError('OIC PIN not set');
        setIsVerifying(false);
        return;
      }

      if (storedPin !== pin) {
        setError('Incorrect PIN');
        setPin('');
        setIsVerifying(false);
        return;
      }

      // PIN verified
      onApprove(oicEmployee);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to verify PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldCheck className="w-5 h-5" />
            Manager Approval Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-900 dark:text-red-100">Large Variance Detected</p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  There is a {variance > 0 ? 'surplus' : 'shortage'} of <span className="font-bold">₱{Math.abs(variance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                  This exceeds the acceptable threshold. Manager PIN required to proceed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Manager/OIC PIN</label>
            <Input
              type="password"
              placeholder="Enter PIN or scan QR code..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              className="font-mono text-lg"
              autoFocus
              disabled={isVerifying}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Type PIN or scan Manager's QR code for authorization
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 font-semibold">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVerifying}>
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !pin.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Approve
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}