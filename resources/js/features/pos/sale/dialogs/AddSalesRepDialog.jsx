import React, { useState } from "react";
import axios from "axios";
import { toast } from "@/shared/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddSalesRepDialog({ open, onOpenChange, onSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: "destructive", description: "First name and last name are required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await axios.post(route("pos.sales-reps.store"), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      toast({ description: "Sales representative added successfully." });
      onSuccess?.(data.salesRep);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: "destructive", description: error.response?.data?.message || "Failed to add sales representative." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-slate-100 font-bold">
            Add New Sales Representative
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-700 dark:text-slate-300">
              First Name <span className="text-red-500 dark:text-red-400">*</span>
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              autoFocus
              className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-700 dark:text-slate-300">
              Last Name <span className="text-red-500 dark:text-red-400">*</span>
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
              className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all"
          >
            {isSubmitting ? "Adding..." : "Add Sales Rep"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
