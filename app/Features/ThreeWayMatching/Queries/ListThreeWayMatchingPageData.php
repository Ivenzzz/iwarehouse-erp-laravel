<?php

namespace App\Features\ThreeWayMatching\Queries;

use Illuminate\Http\Request;

class ListThreeWayMatchingPageData
{
    public function __construct(
        private readonly ThreeWayMatchingFilters $filters,
        private readonly ThreeWayMatchingQuery $query,
    ) {
    }

    public function __invoke(Request $request): array
    {
        return $this->query->pageData($this->filters->fromRequest($request));
    }
}
