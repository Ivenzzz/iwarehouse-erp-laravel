import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { importDeliveryReceipts } from '@/functions/importDeliveryReceipts';

export default function ImportDRDialog({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setImportResult(null);
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const csvText = await file.text();
      const response = await importDeliveryReceipts({ csvText });
      
      if (response.data?.success) {
        setImportResult(response.data.results);
        if (response.data.results.created > 0) {
          onSuccess?.();
        }
      } else {
        setImportResult({ error: response.data?.error || 'Import failed' });
      }
    } catch (error) {
      setImportResult({ error: error.message || 'Failed to import delivery receipts' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Reference Number', 'Vendor DR Number', 'Supplier', 'Total Product Cost'];
    const sampleRow = ['REF-001', 'VDR-2024-001', 'Sample Supplier Name', '50000'];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delivery_receipts_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import Delivery Receipts
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import delivery receipts. The system will match suppliers automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Download */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="dr-csv-upload"
            />
            <label htmlFor="dr-csv-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                Click to select or drag and drop a CSV file
              </p>
              {file && (
                <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
            </label>
          </div>

          {/* CSV Columns Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-medium mb-1">Required CSV columns:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><span className="font-mono">Reference Number</span> - Internal reference</li>
              <li><span className="font-mono">Vendor DR Number</span> - Supplier's DR number</li>
              <li><span className="font-mono">Supplier</span> - Supplier name (auto-matched)</li>
              <li><span className="font-mono">Total Product Cost</span> - Total cost value</li>
            </ul>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`rounded-lg p-4 ${importResult.error ? 'bg-red-50' : 'bg-gray-50'}`}>
              {importResult.error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{importResult.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Import Results</span>
                    <Badge variant="outline">{importResult.total} total rows</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded p-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">{importResult.created} created</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded p-2">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">{importResult.failed} failed</span>
                    </div>
                  </div>

                  {/* Failed Items */}
                  {importResult.failedItems?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Failed rows:
                      </p>
                      <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                        {importResult.failedItems.map((item, idx) => (
                          <div key={idx} className="text-red-600 bg-red-50/50 rounded px-2 py-1">
                            Row {item.row}: {item.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importResult?.created > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}