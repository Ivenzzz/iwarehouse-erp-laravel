<?php

namespace App\Features\Pos\Http\Requests;

use App\Models\PosSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePosDiscountAuthorizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pos_session_id' => [
                'required',
                'integer',
                Rule::exists('pos_sessions', 'id')->where(
                    fn ($query) => $query->where('status', PosSession::STATUS_OPENED),
                ),
            ],
            'pin' => ['required', 'string', 'max:255'],
        ];
    }
}
