<?php

namespace App\Features\Sales\Actions;

use App\Models\PosSession;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ImportPosSessionsFromCsv
{
    private const REQUIRED_HEADERS = [
        'session_number',
        'notes',
        'shift_start_time',
        'shift_end_time',
        'closing_balance',
        'opening_balance',
        'warehouse_name',
        'status',
        'cashier_remarks',
        'created_date',
        'updated_date',
    ];

    private const MAX_ERROR_ROWS = 10;

    public function handle(UploadedFile $file, int $userId): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => 'The CSV file could not be opened.',
            ]);
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => 'The CSV file is empty.',
            ]);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => $this->normalizeHeader((string) $header))
            ->values();
        $headerMap = $normalizedHeaders->flip();

        $missing = collect(self::REQUIRED_HEADERS)->reject(fn (string $h) => $headerMap->has($h))->values();
        if ($missing->isNotEmpty()) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => 'Missing required headers: '.$missing->implode(', '),
            ]);
        }

        $warehouseMap = Warehouse::query()
            ->select(['id', 'name'])
            ->get()
            ->mapWithKeys(fn (Warehouse $w) => [Str::lower(trim($w->name)) => $w->id]);
        $cashierLookup = $this->cashierLookup();
        $hasCashierNameColumn = $headerMap->has('cashier_name');

        $summary = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'error_rows' => [],
        ];

        $rowNumber = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if ($this->isBlankRow($row)) {
                continue;
            }

            $rowPayload = [];
            foreach (self::REQUIRED_HEADERS as $header) {
                $rowPayload[$header] = trim((string) ($row[(int) $headerMap[$header]] ?? ''));
            }
            $rowPayload['cashier_name'] = $hasCashierNameColumn
                ? trim((string) ($row[(int) $headerMap['cashier_name']] ?? ''))
                : '';

            $error = $this->validateRow($rowPayload, $rowNumber, $warehouseMap, $cashierLookup, $hasCashierNameColumn);
            if ($error !== null) {
                $summary['skipped']++;
                $summary['errors']++;
                if (count($summary['error_rows']) < self::MAX_ERROR_ROWS) {
                    $summary['error_rows'][] = $error;
                }
                continue;
            }

            try {
                DB::transaction(function () use ($rowPayload, $warehouseMap, $userId, &$summary): void {
                    $resolvedUserId = $this->resolveCashierUserId($rowPayload['cashier_name'], $userId);
                    $warehouseId = (int) $warehouseMap[Str::lower($rowPayload['warehouse_name'])];
                    $incomingStatus = Str::lower($rowPayload['status']);
                    $shiftStart = Carbon::parse($rowPayload['shift_start_time']);
                    $shiftEnd = $rowPayload['shift_end_time'] !== '' ? Carbon::parse($rowPayload['shift_end_time']) : null;
                    $openingBalance = (float) $rowPayload['opening_balance'];
                    $closingBalance = $rowPayload['closing_balance'] !== '' ? (float) $rowPayload['closing_balance'] : null;
                    $createdAt = $this->parseTimestampOrNow($rowPayload['created_date']);
                    $updatedAt = $this->parseTimestampOrNow($rowPayload['updated_date']);

                    $session = PosSession::query()
                        ->select(['id', 'status', 'closing_balance', 'shift_end_time'])
                        ->where('session_number', $rowPayload['session_number'])
                        ->first();

                    if ($session === null) {
                        DB::table('pos_sessions')->insert([
                            'session_number' => $rowPayload['session_number'],
                            'user_id' => $resolvedUserId,
                            'warehouse_id' => $warehouseId,
                            'opening_balance' => round($openingBalance, 2),
                            'closing_balance' => $closingBalance !== null ? round($closingBalance, 2) : null,
                            'shift_start_time' => $shiftStart->toDateTimeString(),
                            'shift_end_time' => $shiftEnd?->toDateTimeString(),
                            'status' => $incomingStatus,
                            'cashier_remarks' => $rowPayload['cashier_remarks'] !== '' ? $rowPayload['cashier_remarks'] : null,
                            'notes' => $rowPayload['notes'] !== '' ? $rowPayload['notes'] : null,
                            'created_at' => $createdAt->toDateTimeString(),
                            'updated_at' => $updatedAt->toDateTimeString(),
                        ]);
                        $summary['created']++;

                        return;
                    }

                    $wasClosed = $session->status === PosSession::STATUS_CLOSED;
                    $isDowngradeAttempt = $wasClosed && $incomingStatus === PosSession::STATUS_OPENED;

                    DB::table('pos_sessions')
                        ->where('id', $session->id)
                        ->update([
                            'user_id' => $resolvedUserId,
                            'warehouse_id' => $warehouseId,
                            'opening_balance' => round($openingBalance, 2),
                            'closing_balance' => $isDowngradeAttempt
                                ? $session->closing_balance
                                : ($closingBalance !== null ? round($closingBalance, 2) : null),
                            'shift_start_time' => $shiftStart->toDateTimeString(),
                            'shift_end_time' => $isDowngradeAttempt
                                ? ($session->shift_end_time ? Carbon::parse((string) $session->shift_end_time)->toDateTimeString() : null)
                                : $shiftEnd?->toDateTimeString(),
                            'status' => $isDowngradeAttempt ? PosSession::STATUS_CLOSED : $incomingStatus,
                            'cashier_remarks' => $rowPayload['cashier_remarks'] !== '' ? $rowPayload['cashier_remarks'] : null,
                            'notes' => $rowPayload['notes'] !== '' ? $rowPayload['notes'] : null,
                            'created_at' => $createdAt->toDateTimeString(),
                            'updated_at' => $updatedAt->toDateTimeString(),
                        ]);
                    $summary['updated']++;
                });
            } catch (Throwable $e) {
                $summary['skipped']++;
                $summary['errors']++;
                if (count($summary['error_rows']) < self::MAX_ERROR_ROWS) {
                    $summary['error_rows'][] = "Row {$rowNumber}: ".$e->getMessage();
                }
            }
        }

        fclose($handle);

        $summary['message'] = sprintf(
            'POS sessions import complete: %d created, %d updated, %d skipped, %d error(s).',
            $summary['created'],
            $summary['updated'],
            $summary['skipped'],
            $summary['errors']
        );

        return $summary;
    }

    private function validateRow(
        array $row,
        int $rowNumber,
        Collection $warehouseMap,
        array $cashierLookup,
        bool $hasCashierNameColumn,
    ): ?string
    {
        if ($row['session_number'] === '') {
            return "Row {$rowNumber}: session_number is required.";
        }

        if (! $warehouseMap->has(Str::lower($row['warehouse_name']))) {
            return "Row {$rowNumber}: warehouse_name '{$row['warehouse_name']}' not found.";
        }

        $status = Str::lower($row['status']);
        if (! in_array($status, [PosSession::STATUS_OPENED, PosSession::STATUS_CLOSED], true)) {
            return "Row {$rowNumber}: status must be opened or closed.";
        }

        if (! is_numeric($row['opening_balance'])) {
            return "Row {$rowNumber}: opening_balance must be numeric.";
        }

        if ($row['shift_start_time'] === '') {
            return "Row {$rowNumber}: shift_start_time is required.";
        }

        if (! $this->isValidDateTime($row['shift_start_time'])) {
            return "Row {$rowNumber}: shift_start_time is not a valid datetime.";
        }

        if ($row['shift_end_time'] !== '' && ! $this->isValidDateTime($row['shift_end_time'])) {
            return "Row {$rowNumber}: shift_end_time is not a valid datetime.";
        }

        if ($row['created_date'] !== '' && ! $this->isValidDateTime($row['created_date'])) {
            return "Row {$rowNumber}: created_date is not a valid datetime.";
        }

        if ($row['updated_date'] !== '' && ! $this->isValidDateTime($row['updated_date'])) {
            return "Row {$rowNumber}: updated_date is not a valid datetime.";
        }

        if ($row['closing_balance'] !== '' && ! is_numeric($row['closing_balance'])) {
            return "Row {$rowNumber}: closing_balance must be numeric.";
        }

        if ($status === PosSession::STATUS_CLOSED) {
            if ($row['closing_balance'] === '' || $row['shift_end_time'] === '') {
                return "Row {$rowNumber}: closed sessions require closing_balance and shift_end_time.";
            }
        }

        if ($hasCashierNameColumn && $row['cashier_name'] !== '') {
            $cashierKey = Str::lower($row['cashier_name']);
            if (! isset($cashierLookup[$cashierKey])) {
                return "Row {$rowNumber}: cashier_name '{$row['cashier_name']}' not found.";
            }

            if (count($cashierLookup[$cashierKey]) > 1) {
                return "Row {$rowNumber}: cashier_name '{$row['cashier_name']}' is ambiguous.";
            }
        }

        return null;
    }

    private function resolveCashierUserId(string $cashierName, int $fallbackUserId): int
    {
        if ($cashierName === '') {
            return $fallbackUserId;
        }

        $normalizedCashierName = Str::lower($cashierName);
        $matchingIds = User::query()
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedCashierName])
            ->pluck('id')
            ->all();

        if (count($matchingIds) === 1) {
            return (int) $matchingIds[0];
        }

        return $fallbackUserId;
    }

    private function cashierLookup(): array
    {
        return User::query()
            ->whereNotNull('name')
            ->select(['id', 'name'])
            ->get()
            ->groupBy(fn (User $user) => Str::lower(trim((string) $user->name)))
            ->map(fn (Collection $users) => $users->pluck('id')->all())
            ->all();
    }

    private function isBlankRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function isValidDateTime(string $value): bool
    {
        try {
            Carbon::parse($value);

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function parseTimestampOrNow(string $value): Carbon
    {
        if ($value === '') {
            return now();
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return now();
        }
    }

    private function normalizeHeader(string $header): string
    {
        $clean = preg_replace('/^\xEF\xBB\xBF/u', '', $header) ?? $header;

        return Str::of($clean)->trim()->lower()->value();
    }
}
