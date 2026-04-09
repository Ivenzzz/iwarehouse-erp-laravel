import React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
        <ShieldAlert className="w-12 h-12 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Access Denied
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        You don't have permission to view this page. Please contact your administrator
        if you believe this is an error.
      </p>
      <Link to={createPageUrl("Dashboard")}>
        <Button variant="outline">Go to Dashboard</Button>
      </Link>
    </div>
  );
}