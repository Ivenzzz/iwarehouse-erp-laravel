<Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-x-hidden overflow-y-auto border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_35%),linear-gradient(to_bottom,_#ffffff,_#f8fafc)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(to_bottom,_#020617,_#020617)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Consolidated Details
            </DialogTitle>
          </DialogHeader>

          {selectedGroup && selectedGroupMetrics && (
            <div className="min-w-0 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(30,41,59,0.98),_rgba(15,23,42,0.94))] p-6 text-white shadow-xl dark:border-slate-700">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
                      Branch Consolidated Turnover
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{selectedGroup.branch_name}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {selectedGroup.report_date ? format(new Date(`${selectedGroup.report_date}T00:00:00`), 'MMMM dd, yyyy') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Coverage
                      </div>
                      <div className="text-sm font-semibold">
                        {selectedGroup.earliest_shift_start ? format(new Date(selectedGroup.earliest_shift_start), 'h:mm a') : '-'} to {selectedGroup.latest_shift_end ? format(new Date(selectedGroup.latest_shift_end), 'h:mm a') : 'Active'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                        <UserRound className="h-3.5 w-3.5" />
                        Cashiers
                      </div>
                      <div className="text-sm font-semibold">{selectedGroupMetrics.primaryCashiers.join(', ') || 'Unknown'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                        <Receipt className="h-3.5 w-3.5" />
                        Sessions
                      </div>
                      <div className="text-sm font-semibold">{formatNumber(selectedGroup.session_count)} sessions / {formatNumber(selectedGroup.transaction_count)} txns</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">POS Sales System</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPHP(selectedGroupMetrics.netSales)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Transaction Count</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(selectedGroup.transaction_count)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4">
                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      Non-Cash Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedGroupMetrics.nonCashMethodTotals.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No non-cash payments recorded.</p>
                    ) : (
                      selectedGroupMetrics.nonCashMethodTotals.map(([method, amount]) => (
                        <MetricRow key={method} label={method} value={formatPHP(amount)} />
                      ))
                    )}
                    {selectedGroupMetrics.totalCardTerminalFees > 0 && (
                      <>
                        <Separator className="my-2 bg-slate-200 dark:bg-slate-800" />
                        <MetricRow label="Total Terminal Fee" value={formatPHP(selectedGroupMetrics.totalCardTerminalFees)} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100">Payment Method Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {selectedGroupMetrics.paymentMethodTotals.map(([method, amount]) => (
                      <div key={method} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{method}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{formatPHP(amount)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100">Source Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/90 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Session #</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Cashier</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Shift Start</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Shift End</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Transactions</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Total Sales</th>
                          <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-950/40">
                        {selectedGroup.sessions.map((session) => (
                          <tr key={session.id} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{session.session_number || '-'}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{session.cashier_name}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {session.shift_start_time ? format(new Date(session.shift_start_time), 'MMM dd, yyyy h:mm a') : '-'}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {session.shift_end_time ? format(new Date(session.shift_end_time), 'MMM dd, yyyy h:mm a') : 'Active'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{session.transaction_count}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">{formatPHP(session.total_sales)}</td>
                            <td className="px-3 py-2 text-center">{getStatusBadge(session.status === 'closed' ? 'closed' : 'active')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 w-full max-w-full border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base text-slate-900 dark:text-slate-100">Transactions</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportTransactions}
                      disabled={ledgerRows.length === 0}
                    >
                      Export XLSX
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 max-w-full overflow-x-hidden">
                  <div className="min-w-0 w-full max-w-full">
                    <div className="max-h-[58vh] w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="min-w-max text-xs">
                        <thead className="sticky top-0 z-20 bg-slate-100/95 text-[10px] uppercase tracking-[0.14em] text-slate-500 backdrop-blur dark:bg-slate-900/95 dark:text-slate-400">
                          <tr>
                            <th className="w-[180px] min-w-[180px] max-w-[180px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900">Customer Name</th>
                            <th className="w-[140px] min-w-[140px] max-w-[140px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900">Contact Number</th>
                            <th className="w-[140px] min-w-[140px] max-w-[140px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900" title="Using transaction number as closest available DR reference">DR#</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">OR#</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Product</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Condition</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Warranty</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Subcategory</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap">Qty</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Barcode</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Value</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Sale Person</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Actual Cash Paid</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Discount</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">TF Paid in Cash</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">NON CASH PAYMENT</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Reference Number</th>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Loan Term</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">MDR</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Receivable</th>
                            {dynamicPaymentColumns.map((columnLabel) => (
                              <th key={columnLabel} className="px-3 py-2 text-right whitespace-nowrap">{columnLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-950/40">
                          {ledgerRows.length === 0 ? (
                            <tr>
                              <td colSpan={22 + dynamicPaymentColumns.length} className="px-4 py-8 text-center text-slate-500">No transactions found</td>
                            </tr>
                          ) : (
                          ledgerRows.map((row) => (
                            <tr key={row.id} className={`border-t border-slate-200 dark:border-slate-800 ${row.rowTone}`}>
                              <td className="w-[180px] min-w-[180px] max-w-[180px] overflow-hidden px-3 py-2 font-semibold text-slate-900 whitespace-nowrap dark:text-slate-100">
                                {row.hideFirstFourColumns ? '' : row.customerName}
                              </td>
                              <td className="w-[140px] min-w-[140px] max-w-[140px] overflow-hidden px-3 py-2 text-slate-700 whitespace-nowrap dark:text-slate-300">
                                {row.hideFirstFourColumns ? '' : row.contactNumber}
                              </td>
                              <td className="w-[140px] min-w-[140px] max-w-[140px] overflow-hidden px-3 py-2 font-mono text-slate-700 whitespace-nowrap dark:text-slate-300">
                                {row.hideFirstFourColumns ? '' : row.drNumber}
                              </td>
                                <td className="px-3 py-2">
                                  {row.hideFirstFourColumns ? '' : (
                                    <button
                                      onClick={() => setSelectedTransaction(row.transaction)}
                                      className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      {row.orNumber}
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100 min-w-[280px]">
                                  {row.isRepeatedPaymentRow ? '' : (
                                    <div className="font-semibold leading-tight">{row.productName}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.condition}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 min-w-[180px]">
                                  {row.isRepeatedPaymentRow ? '' : row.warranty}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.categoryName}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.subcategoryName}
                                </td>
                                <td className="px-3 py-2 text-center font-semibold text-slate-900 dark:text-slate-100">
                                  {row.isRepeatedPaymentRow ? '' : row.quantity}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.barcode}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : formatPHP(row.value)}
                                </td>
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.salesPersonName}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.isRepeatedPaymentRow ? '' : row.date ? format(new Date(row.date), 'MM-dd-yy') : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.actualCashPaid === null ? (
                                    '-'
                                  ) : row.isSplitActualCashPaid ? (
                                    <>
                                      {formatPHP(row.actualCashPaid)}{' '}
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        (split from {formatPHP(row.actualCashPaidSourceAmount)})
                                      </span>
                                    </>
                                  ) : (
                                    formatPHP(row.actualCashPaid)
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                                  {row.discountAmount > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400">
                                      {formatPHP(row.discountAmount)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-900 dark:text-slate-100">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.terminalFeePaidInCash === null ? '-' : formatPHP(row.terminalFeePaidInCash)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.nonCashPaymentAmount === null ? '-' : formatPHP(row.nonCashPaymentAmount)}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.nonCashReferenceNumber}
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {row.loanTermLabel}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.mdrAmount === null ? '-' : formatPHP(row.mdrAmount)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {row.receivableAmount === null ? (
                                    '-'
                                  ) : (
                                    <>
                                      {formatPHP(row.receivableAmount)}{' '}
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        ({row.mdrPercentLabel})
                                      </span>
                                    </>
                                  )}
                                </td>
                              {dynamicPaymentColumns.map((columnLabel) => (
                                <td
                                  key={`${row.id}-${columnLabel}`}
                                  className={`px-3 py-2 text-right whitespace-nowrap ${row.dynamicPaymentAmounts[columnLabel] === 0
                                        ? 'text-slate-400 dark:text-slate-500'
                                        : 'font-semibold text-slate-900 dark:text-slate-100'
                                      }`}
                                >
                                  {row.dynamicPaymentAmounts[columnLabel] === null ? '-' : formatPHP(row.dynamicPaymentAmounts[columnLabel])}
                                </td>
                              ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>