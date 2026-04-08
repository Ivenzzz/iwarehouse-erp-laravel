<?php

namespace App\Features\PaymentMethods\Actions;

use App\Models\PaymentMethod;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPaymentMethodsCsv
{
    public function handle(): StreamedResponse
    {
        $paymentMethods = PaymentMethod::query()
            ->orderBy('name')
            ->get();

        $callback = function () use ($paymentMethods): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['name', 'type', 'logo']);

            foreach ($paymentMethods as $paymentMethod) {
                fputcsv($stream, [
                    $paymentMethod->name,
                    $paymentMethod->type,
                    $paymentMethod->logo ?? '',
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'payment-methods.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
