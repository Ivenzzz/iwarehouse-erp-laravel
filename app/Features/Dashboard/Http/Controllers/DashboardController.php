<?php

namespace App\Features\Dashboard\Http\Controllers;

use App\Features\Dashboard\Queries\DashboardQuery;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(DashboardQuery $dashboardQuery): Response
    {
        return Inertia::render('Dashboard', $dashboardQuery->handle());
    }
}

