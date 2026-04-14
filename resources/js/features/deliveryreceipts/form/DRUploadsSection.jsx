import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Truck,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  X,
  Scan as ScanIcon,
} from "lucide-react";
import { requiredUploads, optionalUploads } from "../deliveryReceiptService";

const iconMap = { FileText, Truck, ImageIcon };

export default function DRUploadsSection({
  formData,
  uploadProgress,
  dragStates,
  uploadedCount,
  allRequiredUploaded,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileUpload,
  onRemoveUpload,
  onStartCamera,
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">
          Required Documents ({uploadedCount}/{requiredUploads.length})
        </h3>

        {allRequiredUploaded && (
          <Badge className="border border-success/25 bg-success/10 text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            All Required Documents Uploaded
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {requiredUploads.map((upload) => {
          const isUploaded =
            upload.key === "box_photos"
              ? formData.uploads[upload.key]?.length > 0
              : formData.uploads[upload.key];

          const isUploading = uploadProgress[upload.key] !== undefined;
          const isDragging = dragStates[upload.key];
          const IconComponent = iconMap[upload.icon] || FileText;

          return (
            <div
              key={upload.key}
              className={[
                "rounded-lg border p-4 transition-all",
                "border-border bg-background",
                isDragging ? "border-ring ring-2 ring-ring/30" : "",
                isUploaded ? "border-success/25 shadow-sm" : "",
              ].join(" ")}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-semibold text-foreground">
                      {upload.label}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      PDF or Images (JPG, PNG, max 10MB)
                    </p>
                  </div>
                </div>

                {isUploaded && <CheckCircle2 className="h-5 w-5 text-success" />}
              </div>

              <div
                className={[
                  "cursor-pointer rounded-lg border border-dashed p-6 text-center transition-colors",
                  "border-border bg-muted/40",
                  isDragging ? "border-ring bg-accent/40" : "hover:border-ring/40 hover:bg-accent/30",
                  isUploaded ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
                onDragEnter={(e) => onDragEnter(e, upload.key)}
                onDragLeave={(e) => onDragLeave(e, upload.key)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, upload.key)}
                onClick={() =>
                  !isUploaded && document.getElementById(`file-input-${upload.key}`)?.click()
                }
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="mb-1 text-sm text-foreground">
                  Drag and drop {upload.multiple ? "files" : "file"} here, or click to browse
                </p>
                <input
                  id={`file-input-${upload.key}`}
                  type="file"
                  accept={upload.accept}
                  multiple={upload.multiple}
                  className="hidden"
                  onChange={(e) => {
                    if (upload.multiple) {
                      Array.from(e.target.files || []).forEach((file) =>
                        onFileUpload(upload.key, file)
                      );
                    } else {
                      const file = e.target.files?.[0];
                      if (file) onFileUpload(upload.key, file);
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onStartCamera(upload.key)}
                  disabled={isUploading}
                  className="w-full border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ScanIcon className="mr-2 h-4 w-4 text-info" />
                  Scan with Camera
                </Button>
              </div>

              {isUploading && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${uploadProgress[upload.key]}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploading... {Math.round(uploadProgress[upload.key])}%
                  </p>
                </div>
              )}

              {isUploaded && (
                <div className="mt-3 space-y-2">
                  {upload.key === "box_photos" ? (
                    <div className="space-y-1">
                      {formData.uploads[upload.key].map((url, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded border border-border bg-muted p-2"
                        >
                          <span className="flex-1 truncate text-xs text-foreground">
                            Photo {idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveUpload(upload.key, idx)}
                            className="h-6 w-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded border border-border bg-muted p-2">
                      <span className="flex-1 truncate text-xs text-foreground">
                        File uploaded
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveUpload(upload.key)}
                        className="h-6 w-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {optionalUploads.map((upload) => {
          const isUploaded = formData.uploads[upload.key];
          const isUploading = uploadProgress[upload.key] !== undefined;

          return (
            <div
              key={upload.key}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <Label className="text-sm text-foreground">{upload.label}</Label>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onStartCamera(upload.key)}
                disabled={isUploading}
                className="w-full border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ScanIcon className="mr-2 h-4 w-4 text-info" />
                Scan with Camera
              </Button>

              <input
                id={`file-input-${upload.key}`}
                type="file"
                accept={upload.accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileUpload(upload.key, file);
                  e.target.value = "";
                }}
              />

              {isUploading && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${uploadProgress[upload.key]}%` }} />
                  </div>
                </div>
              )}

              {isUploaded && (
                <div className="mt-2 flex items-center justify-between rounded border border-success/20 bg-success/10 p-2">
                  <span className="text-xs text-success">File uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveUpload(upload.key)}
                    className="h-6 w-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
