<?php

namespace App\Features\Warehouses\Http\Requests;

use App\Models\Warehouse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('warehouses', 'name')->ignore($this->warehouse()?->id),
            ],
            'warehouse_type' => ['required', 'string', Rule::in(Warehouse::TYPES)],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'street' => ['nullable', 'string', 'max:200'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'zip_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $warehouse = $this->warehouse();
            $name = Str::lower(trim((string) $this->input('name')));

            if ($name === '') {
                return;
            }

            $exists = Warehouse::query()
                ->whereRaw('LOWER(name) = ?', [$name])
                ->when($warehouse !== null, fn ($query) => $query->whereKeyNot($warehouse->id))
                ->exists();

            if ($exists) {
                $validator->errors()->add('name', 'The name has already been taken.');
            }
        });
    }

    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'name' => trim($validated['name']),
            'warehouse_type' => $validated['warehouse_type'],
            'phone_number' => $this->nullableTrim($validated['phone_number'] ?? null),
            'email' => $this->nullableTrim($validated['email'] ?? null),
            'street' => $this->nullableTrim($validated['street'] ?? null),
            'city' => $this->nullableTrim($validated['city'] ?? null),
            'province' => $this->nullableTrim($validated['province'] ?? null),
            'zip_code' => $this->nullableTrim($validated['zip_code'] ?? null),
            'country' => $this->nullableTrim($validated['country'] ?? null) ?? 'PH',
            'latitude' => isset($validated['latitude']) && $validated['latitude'] !== '' ? (float) $validated['latitude'] : null,
            'longitude' => isset($validated['longitude']) && $validated['longitude'] !== '' ? (float) $validated['longitude'] : null,
            'sort_order' => isset($validated['sort_order']) && $validated['sort_order'] !== ''
                ? (int) $validated['sort_order']
                : 0,
        ];
    }

    private function warehouse(): ?Warehouse
    {
        $warehouse = $this->route('warehouse');

        return $warehouse instanceof Warehouse ? $warehouse : null;
    }

    private function nullableTrim($value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
