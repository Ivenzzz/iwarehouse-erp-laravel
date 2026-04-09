import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function ShipDialog({
  open,
  onOpenChange,
  shippingTransfer,
  onConfirmShip,
  isShipping,
  onPhotoUpload,
  uploadingPhoto
}) {
  const [formData, setFormData] = useState({
    driver_name: "",
    driver_contact: "",
    courier_name: "",
    proof_of_dispatch_url: "",
    remarks: ""
  });

  const handleSubmit = () => {
    onConfirmShip(formData);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const uploaded = await onPhotoUpload(file);
      setFormData(prev => ({ ...prev, proof_of_dispatch_url: uploaded?.file_url || "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Ship Transfer: {shippingTransfer?.transfer_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Driver Name */}
          <div className="space-y-2">
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input
              id="driver_name"
              value={formData.driver_name}
              onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
              placeholder="Enter driver name"
            />
          </div>

          {/* Driver Contact */}
          <div className="space-y-2">
            <Label htmlFor="driver_contact">Driver Contact Number</Label>
            <Input
              id="driver_contact"
              value={formData.driver_contact}
              onChange={(e) => setFormData(prev => ({ ...prev, driver_contact: e.target.value }))}
              placeholder="Enter contact number"
            />
          </div>

          {/* Courier Name */}
          <div className="space-y-2">
            <Label htmlFor="courier_name">Courier Name</Label>
            <Input
              id="courier_name"
              value={formData.courier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, courier_name: e.target.value }))}
              placeholder="Enter courier/logistics company"
            />
          </div>

          {/* Proof of Dispatch */}
          <div className="space-y-2">
            <Label htmlFor="proof_of_dispatch">Proof of Dispatch (Photo)</Label>
            <div className="flex gap-2">
              <Input
                id="proof_of_dispatch"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploadingPhoto}
                className="flex-1"
              />
              {uploadingPhoto && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            {formData.proof_of_dispatch_url && (
              <div className="mt-2">
                <img 
                  src={formData.proof_of_dispatch_url} 
                  alt="Proof of dispatch" 
                  className="w-32 h-32 object-cover rounded border border-border"
                />
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Additional notes or special instructions"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isShipping || !formData.driver_name}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isShipping ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Shipping...
              </>
            ) : (
              "Confirm Ship"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
