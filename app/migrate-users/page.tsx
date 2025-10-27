import { MigrateUsersButton } from "@/components/migrate-users-button"
import { ResetPasswordsButton } from "@/components/reset-passwords-button"

export default function MigrateUsersPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user authentication and password settings</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Initial Migration */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Initial Migration</h2>
                <p className="text-sm text-muted-foreground">Create Supabase Auth accounts for users without auth_id</p>
              </div>

              <MigrateUsersButton />

              <div className="text-xs text-muted-foreground space-y-1 text-left">
                <p>• Creates auth accounts for new users</p>
                <p>• Sets password to "Sandra1604"</p>
                <p>• Auto-confirms email addresses</p>
                <p>• Links to existing Neon data</p>
              </div>
            </div>

            {/* Password Reset */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Reset All Passwords</h2>
                <p className="text-sm text-muted-foreground">Reset passwords for all users to "Sandra1604"</p>
              </div>

              <ResetPasswordsButton />

              <div className="text-xs text-muted-foreground space-y-1 text-left">
                <p>• Resets passwords for all users</p>
                <p>• Creates missing auth accounts</p>
                <p>• Links unlinked users</p>
                <p>• Password: "Sandra1604"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
