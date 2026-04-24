<?php

namespace App\Features\Users\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class ImportUsersFromCsv
{
    public function handle(UploadedFile $file, User $actor): string
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'The CSV file could not be opened.']);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'The CSV file is empty.']);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->replace(' ', '_')->value())
            ->map(function (string $header): string {
                return match ($header) {
                    'user_name' => 'username',
                    'full_name' => 'name',
                    default => $header,
                };
            })
            ->values();

        $requiredHeaders = ['username', 'name'];
        foreach ($requiredHeaders as $requiredHeader) {
            if (! $normalizedHeaders->contains($requiredHeader)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include Username and Name headers.',
                ]);
            }
        }

        $defaultRole = Role::query()
            ->where('name', UserManagement::ROLE_DEFAULT)
            ->where('guard_name', 'web')
            ->first();

        if ($defaultRole === null) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => 'Default role is not configured. Please seed roles first.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenRows = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $username = trim((string) ($row[$headerMap['username']] ?? ''));
            $name = trim((string) ($row[$headerMap['name']] ?? ''));

            if ($username === '' && $name === '') {
                continue;
            }

            if ($username === '') {
                $errors['file'][] = "Row {$rowNumber}: Username is required.";
                continue;
            }

            if (Str::length($username) > 255) {
                $errors['file'][] = "Row {$rowNumber}: Username may not be greater than 255 characters.";
                continue;
            }

            if ($name === '') {
                $errors['file'][] = "Row {$rowNumber}: Name is required.";
                continue;
            }

            if (Str::length($name) > 255) {
                $errors['file'][] = "Row {$rowNumber}: Name may not be greater than 255 characters.";
                continue;
            }

            $dedupeKey = Str::lower($username);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'username' => $username,
                'name' => $name,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows, $actor) {
            $summary = [
                'users_created' => 0,
                'users_skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $existing = User::query()
                    ->whereRaw('LOWER(username) = ?', [Str::lower($row['username'])])
                    ->first();

                if ($existing !== null) {
                    $summary['users_skipped']++;
                    continue;
                }

                // Product decision: imported accounts use username as initial password.
                $user = User::create([
                    'name' => $row['name'],
                    'username' => $row['username'],
                    'password' => $row['username'],
                    'status' => User::STATUS_ACTIVE,
                    'created_by_id' => $actor->id,
                ]);

                $user->assignRole(UserManagement::ROLE_DEFAULT);
                $summary['users_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['users_created']} user(s) created; {$summary['users_skipped']} existing or duplicate username row(s) skipped. Initial password is username.";
    }
}
