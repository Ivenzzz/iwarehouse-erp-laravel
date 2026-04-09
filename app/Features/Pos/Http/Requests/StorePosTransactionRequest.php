<?php

namespace App\Features\Pos\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePosTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pos_session_id' => ['required', 'integer', 'exists:pos_sessions,id'],
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'sales_representative_id' => ['nullable', 'integer', 'exists:employees,id'],
            'or_number' => ['required', 'string', 'max:50'],
            'mode_of_release' => ['required', 'string', 'max:50'],
            'remarks' => ['nullable', 'string'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'items.*.price_basis' => ['required', 'string', 'in:cash,srp'],
            'items.*.snapshot_cash_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.snapshot_srp' => ['nullable', 'numeric', 'min:0'],
            'items.*.snapshot_cost_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_proof_image_url' => ['nullable', 'string', 'max:255'],
            'items.*.discount_validated_at' => ['nullable', 'date'],
            'items.*.line_total' => ['required', 'numeric', 'min:0'],
            'items.*.is_bundle' => ['nullable', 'boolean'],
            'items.*.bundle_serial' => ['nullable', 'string', 'max:100'],
            'items.*.bundle_components' => ['nullable', 'array'],
            'items.*.bundle_components.*.inventory_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
            'payments.*.payment_details' => ['nullable', 'array'],
            'payments.*.payment_details.reference_number' => ['nullable', 'string', 'max:100'],
            'payments.*.payment_details.downpayment' => ['nullable', 'string', 'max:100'],
            'payments.*.payment_details.bank' => ['nullable', 'string', 'max:150'],
            'payments.*.payment_details.terminal_used' => ['nullable', 'string', 'max:150'],
            'payments.*.payment_details.card_holder_name' => ['nullable', 'string', 'max:150'],
            'payments.*.payment_details.loan_term_months' => ['nullable', 'integer', 'min:1'],
            'payments.*.payment_details.sender_mobile' => ['nullable', 'string', 'max:50'],
            'payments.*.payment_details.contract_id' => ['nullable', 'string', 'max:100'],
            'payments.*.payment_details.registered_mobile' => ['nullable', 'string', 'max:50'],
            'payments.*.payment_details.supporting_doc_urls' => ['nullable', 'array'],
            'payments.*.payment_details.supporting_doc_urls.*.name' => ['nullable', 'string', 'max:150'],
            'payments.*.payment_details.supporting_doc_urls.*.url' => ['required', 'string', 'max:255'],
            'payments.*.payment_details.supporting_doc_urls.*.type' => ['nullable', 'string', 'max:100'],
            'documents' => ['nullable', 'array'],
            'documents.*.document_type' => ['required', 'string', 'max:100'],
            'documents.*.document_name' => ['nullable', 'string', 'max:150'],
            'documents.*.document_url' => ['required', 'string', 'max:255'],
        ];
    }
}
