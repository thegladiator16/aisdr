import { SignIn } from "@clerk/nextjs";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-[40%] bg-gradient-to-br from-[#6C47FF] to-[#4F35CC] flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <AryaAvatar size="xl" showBadge />
          <h2 className="text-3xl font-bold mt-8">Put outbound on<br />autopilot with Arya</h2>
          <p className="text-violet-200 mt-4 text-lg max-w-xs">Trusted by 500+ Indian founders</p>
          <div className="flex gap-3 mt-8">
            {["FinStack", "SellSmart", "TechBridge", "GrowthOS"].map((co) => (
              <span key={co} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">{co}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AryaAvatar size="sm" />
            <span className="font-bold text-gray-900 text-lg">AI SDR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to continue to your dashboard</p>
          <SignIn
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 w-full bg-white",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors",
                socialButtonsBlockButtonText: "text-sm font-medium text-gray-700",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-400 text-xs",
                formFieldRow: "mb-4",
                formFieldLabel: "text-sm font-medium text-gray-700 mb-1.5",
                formFieldInput:
                  "rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:ring-2 focus:ring-[#6C47FF]/20 focus:outline-none transition-colors w-full",
                formButtonPrimary:
                  "bg-[#6C47FF] hover:bg-[#5A38E0] rounded-xl py-3 text-sm font-semibold transition-colors shadow-none",
                formFieldAction: "text-[#6C47FF] text-sm font-medium hover:text-[#5A38E0]",
                footerAction: "mt-6",
                footerActionLink:
                  "text-[#6C47FF] font-medium hover:text-[#5A38E0]",
                footer:
                  "[&>.cl-internal-b3fm6y]:hidden [&>div:last-child]:hidden",
                badge: "hidden",
                identityPreview: "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3",
                identityPreviewText: "text-sm text-gray-700",
                identityPreviewEditButton: "text-[#6C47FF] hover:text-[#5A38E0]",
                alert: "rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm",
                otpCodeFieldInput:
                  "rounded-lg border border-gray-300 focus:border-[#6C47FF] focus:ring-2 focus:ring-[#6C47FF]/20",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                showOptionalFields: false,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
