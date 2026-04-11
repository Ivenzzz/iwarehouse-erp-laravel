<?php

namespace App\Features\Users\Http\Controllers;

use App\Features\Users\Actions\ResetUserPassword;
use App\Features\Users\Actions\SaveUser;
use App\Features\Users\Actions\UpdateEmployeeAccount;
use App\Features\Users\Actions\UpdateUserStatus;
use App\Features\Users\Http\Requests\SaveUserRequest;
use App\Features\Users\Queries\ListUsers;
use App\Features\Users\Support\UserManagement;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class UserController extends Controller
{
    public function index(Request $request, ListUsers $listUsers): InertiaResponse
    {
        return Inertia::render('Users', $listUsers($request));
    }

    public function store(SaveUserRequest $request, SaveUser $saveUser): RedirectResponse
    {
        $saveUser->handle($request->payload(), $request->user());

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'User account created.');
    }

    public function update(SaveUserRequest $request, User $user, SaveUser $saveUser): RedirectResponse
    {
        $saveUser->handle($request->payload(), $request->user(), $user);

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'User account updated.');
    }

    public function destroy(Request $request, User $user, UserManagement $userManagement): RedirectResponse
    {
        abort_unless($request->user()?->can('users.delete'), 403);

        $userManagement->ensureCanManageTarget($request->user(), $user);
        $userManagement->ensureNotSelfDestructive($request->user(), $user, 'delete');
        $userManagement->ensureNotLastActiveSuperAdmin($user, 'delete the last active SuperAdmin');

        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->delete();

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'User account deleted.');
    }

    public function status(
        Request $request,
        User $user,
        UpdateUserStatus $updateUserStatus,
    ): RedirectResponse {
        abort_unless($request->user()?->can('users.activate'), 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(UserManagement::statuses())],
        ]);

        $updateUserStatus->handle($request->user(), $user, $validated['status']);

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'User status updated.');
    }

    public function password(
        Request $request,
        User $user,
        ResetUserPassword $resetUserPassword,
    ): RedirectResponse {
        abort_unless($request->user()?->can('users.reset-password'), 403);

        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $resetUserPassword->handle($request->user(), $user, $validated['password']);

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'User password reset.');
    }

    public function updateEmployeeAccount(
        Request $request,
        User $user,
        UpdateEmployeeAccount $updateEmployeeAccount,
    ): RedirectResponse {
        abort_unless($request->user()?->can('users.link-employees'), 403);

        $employeeAccountId = $user->employeeAccount()->value('id');
        $validated = $request->validate([
            'employee_id' => [
                'required',
                'integer',
                'exists:employees,id',
                Rule::unique('employee_accounts', 'employee_id')->ignore($employeeAccountId),
            ],
        ]);

        $updateEmployeeAccount->handle($request->user(), $user, (int) $validated['employee_id']);

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'Employee account link updated.');
    }

    public function destroyEmployeeAccount(
        Request $request,
        User $user,
        UpdateEmployeeAccount $updateEmployeeAccount,
    ): RedirectResponse {
        abort_unless($request->user()?->can('users.link-employees'), 403);

        $updateEmployeeAccount->handle($request->user(), $user, null);

        return redirect()
            ->route('settings.users.index')
            ->with('success', 'Employee account link removed.');
    }

    public function profile(User $user, ListUsers $listUsers): JsonResponse
    {
        return response()->json($listUsers->profile($user));
    }
}
