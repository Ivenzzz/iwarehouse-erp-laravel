import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, User, DollarSign, Trash2, PlayCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function SuspendedTransactionsDialog({ 
    open, 
    onOpenChange, 
    onResume, 
    warehouseId,
    hasCurrentCart 
}) {
    const [suspendedTransactions, setSuspendedTransactions] = useState([]);

    useEffect(() => {
        if (open) {
            loadSuspendedTransactions();
        }
    }, [open, warehouseId]);

    const loadSuspendedTransactions = () => {
        try {
            const stored = localStorage.getItem('suspended_transactions');
            if (stored) {
                const all = JSON.parse(stored);
                // Filter by warehouse
                const filtered = all.filter(t => t.warehouseId === warehouseId);
                // Sort by newest first
                filtered.sort((a, b) => new Date(b.suspendedAt) - new Date(a.suspendedAt));
                setSuspendedTransactions(filtered);
            } else {
                setSuspendedTransactions([]);
            }
        } catch (error) {
            console.error('Failed to load suspended transactions:', error);
            setSuspendedTransactions([]);
        }
    };

    const handleVoid = (suspendId) => {
        if (!confirm('Are you sure you want to delete this suspended sale?')) {
            return;
        }

        try {
            const stored = localStorage.getItem('suspended_transactions');
            if (stored) {
                const all = JSON.parse(stored);
                const updated = all.filter(t => t.suspendId !== suspendId);
                localStorage.setItem('suspended_transactions', JSON.stringify(updated));
                loadSuspendedTransactions();
                toast.success('Suspended transaction deleted');
            }
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    const handleResume = (transaction) => {
        if (hasCurrentCart) {
            // Show warning if there's already items in cart
            if (!confirm('You have items in the current cart. Do you want to suspend the current transaction first before resuming this one?')) {
                return;
            }
        }
        
        onResume(transaction);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        Suspended Transactions
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {suspendedTransactions.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No suspended transactions</p>
                        </div>
                    ) : (
                        suspendedTransactions.map((transaction) => (
                            <div
                                key={transaction.suspendId}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                        {/* Header Row */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-500" />
                                                <span className="font-semibold text-sm">
                                                    {transaction.customerData?.name || 'Walk-in'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-500" />
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {format(new Date(transaction.suspendedAt), 'MMM dd, h:mm a')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            <div>
                                                <span className="text-gray-500">Items:</span>{' '}
                                                <span className="font-medium">{transaction.cartItems.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Sales Rep:</span>{' '}
                                                <span className="font-medium">{transaction.salesPersonData?.name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Cashier:</span>{' '}
                                                <span className="font-medium">{transaction.cashierName}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Terminal:</span>{' '}
                                                <span className="font-medium">{transaction.terminalId}</span>
                                            </div>
                                        </div>

                                        {/* Total */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="text-lg font-bold text-green-600">
                                                ₱{transaction.financialSnapshot.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                            size="sm"
                                            onClick={() => handleResume(transaction)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <PlayCircle className="w-4 h-4 mr-1" />
                                            Resume
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleVoid(transaction.suspendId)}
                                            className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Void
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}