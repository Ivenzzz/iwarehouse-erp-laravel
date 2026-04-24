<?php

namespace App\Features\SalesProfitTracker\Actions;

use App\Features\SalesProfitTracker\Queries\SalesProfitTrackerQuery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportSalesProfitTrackerCsv
{
    public function __construct(
        private readonly SalesProfitTrackerQuery $salesProfitTrackerQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->salesProfitTrackerQuery->filtersFromRequest($request);
        $rows = $this->salesProfitTrackerQuery->exportRows($filters);

        $callback = function () use ($rows): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, [
                'Txn #',
                'Date',
                'Branch',
                'Revenue',
                'Cost',
                'Gross Profit',
                'MDR',
                'MDR Details',
                'Net Profit',
                'Margin',
            ]);

            foreach ($rows as $row) {
                fputcsv($stream, [
                    $row['transactionNumber'],
                    Carbon::parse($row['transactionDate'])->format('Y-m-d H:i:s'),
                    $row['warehouseName'],
                    number_format((float) $row['revenue'], 2, '.', ''),
                    number_format((float) $row['cost'], 2, '.', ''),
                    number_format((float) $row['grossProfit'], 2, '.', ''),
                    number_format((float) $row['mdr'], 2, '.', ''),
                    $this->mdrDetailsText($row['mdrDetails']),
                    number_format((float) $row['netProfit'], 2, '.', ''),
                    number_format((float) $row['netMargin'], 2, '.', '').'%',
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'sales_profit_tracker_'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function mdrDetailsText(array $details): string
    {
        if ($details === []) {
            return '-';
        }

        return collect($details)->map(function (array $detail): string {
            if (! ($detail['is_credit_card'] ?? false)) {
                return (string) ($detail['method'] ?? 'Cash');
            }

            $bank = $detail['bank'] ? (string) $detail['bank'].' ' : '';

            return sprintf(
                '%s%% • %s%s • %smo • -%s',
                number_format((float) ($detail['rate'] ?? 0), 1),
                $bank,
                (string) ($detail['method'] ?? 'Credit Card'),
                (int) ($detail['loan_term_months'] ?? 0),
                number_format((float) ($detail['deduction'] ?? 0), 2)
            );
        })->implode(' | ');
    }
}
