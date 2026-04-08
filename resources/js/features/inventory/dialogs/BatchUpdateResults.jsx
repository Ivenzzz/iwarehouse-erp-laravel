export default function BatchUpdateResults({ result }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div>{result.succeeded?.length || 0} item(s) updated successfully.</div>
      {result.skippedConflicts?.length ? (
        <div className="text-amber-600">{result.skippedConflicts.length} field conflict(s) were skipped.</div>
      ) : null}
      {result.failed?.length ? <div className="text-red-600">{result.failed.length} item(s) failed to update.</div> : null}
    </div>
  );
}
