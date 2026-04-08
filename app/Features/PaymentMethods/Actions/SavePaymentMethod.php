<?php

namespace App\Features\PaymentMethods\Actions;

use App\Models\PaymentMethod;

class SavePaymentMethod
{
    /**
     * @param  array{name: string, type: string, logo: string|null}  $payload
     */
    public function handle(array $payload, ?PaymentMethod $paymentMethod = null): PaymentMethod
    {
        if ($paymentMethod === null) {
            return PaymentMethod::create($payload);
        }

        $paymentMethod->update($payload);

        return $paymentMethod;
    }
}
