<?php

namespace App\Features\CompanyInfo\Http\Controllers;

use App\Features\CompanyInfo\Http\Requests\UpdateCompanyInfoRequest;
use App\Features\CompanyInfo\Support\CompanyInfoDataTransformer;
use App\Http\Controllers\Controller;
use App\Models\CompanyInfo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CompanyInfoController extends Controller
{
    public function index(): InertiaResponse
    {
        $company = CompanyInfo::query()->latest('id')->first();

        return Inertia::render('Companies', [
            'company' => CompanyInfoDataTransformer::transform($company),
        ]);
    }

    public function update(UpdateCompanyInfoRequest $request): RedirectResponse
    {
        $company = CompanyInfo::query()->latest('id')->first() ?? new CompanyInfo();
        $payload = $request->payload();
        $currentLogoPath = $company->logo_path;
        $removeLogo = $payload['remove_logo'];

        unset($payload['remove_logo']);

        if ($request->hasFile('logo')) {
            $payload['logo_path'] = $request->file('logo')->store('company-logos', 'public');
            $removeLogo = true;
        } elseif ($removeLogo) {
            $payload['logo_path'] = null;
        }

        $company->fill($payload);
        $company->save();

        if ($removeLogo && $currentLogoPath) {
            Storage::disk('public')->delete($currentLogoPath);
        }

        return redirect()
            ->route('settings.companies.index')
            ->with('success', 'Company profile updated.');
    }
}

