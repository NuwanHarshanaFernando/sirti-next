import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  onSubmit,
  accessCode,
  setAccessCode,
  password,
  setPassword,
  loading,
  ...props
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-6 bg-white rounded-lg", className)}
      {...props}
    >
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
          <Input
            id="accessCode"
            type="text"
            placeholder="Member Access Code"
            value={accessCode}
            onChange={(e) => setAccessCode?.(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Input
            id="accessSecret"
            type="password"
            placeholder="Member Access Secret"
            value={password}
            onChange={(e) => setPassword?.(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="min-w-[100px] w-fit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <span className="inline-flex items-center">
              <svg className="mr-3 -ml-1 text-white size-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          ) : (
            "Login to Portal"
          )}
        </Button>
      </div>
    </form>
  );
}
