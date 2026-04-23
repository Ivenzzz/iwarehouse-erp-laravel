<?php

namespace App\Features\ProductMasters\Support;

class NormalizesModelNameByCode
{
    public function handle(string $modelName, ?string $modelCode): string
    {
        $originalModelName = trim($modelName);
        $normalizedCode = trim((string) $modelCode);

        if ($originalModelName === '' || $normalizedCode === '') {
            return $originalModelName;
        }

        $result = $originalModelName;
        $escapedCode = preg_quote($normalizedCode, '/');
        $pattern = '/(?:\s+' . $escapedCode . ')+$/i';

        while (preg_match($pattern, $result) === 1) {
            $next = preg_replace('/\s+' . $escapedCode . '$/i', '', $result);

            if (! is_string($next)) {
                break;
            }

            $result = rtrim($next);
        }

        return $result === '' ? $originalModelName : $result;
    }
}
