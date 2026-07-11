"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type InviteData = {
  email: string;
  roleName: string;
  status: string;
  ownerCompanyName: string;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string | undefined) ?? "";
  const { isLoaded, isSignedIn } = useAuth();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/team/invite/${token}`);
        const json = await res.json();
        if (!res.ok) {
          setLoadError(json.error ?? "This invite link is invalid or has already been used.");
          setLoading(false);
          return;
        }
        setInvite(json.data);
      } catch {
        setLoadError("Could not load this invite. Please check the link and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (accepted) {
      const t = setTimeout(() => router.push("/dashboard"), 1500);
      return () => clearTimeout(t);
    }
  }, [accepted, router]);

  const returnUrl = `/invite/${token}`;

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/team/invite/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setAcceptError(json.error ?? "Could not accept this invite.");
        return;
      }
      setAccepted(true);
    } catch {
      setAcceptError("Could not accept this invite. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-[#6C47FF] flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <h1 className="text-xl font-bold text-gray-900">Team invite</h1>
        </div>

        {(loading || !isLoaded) && (
          <div className="flex flex-col items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6C47FF] border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Loading invite…</p>
          </div>
        )}

        {!loading && isLoaded && loadError && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 font-medium">{loadError}</p>
            <p className="text-sm text-gray-500 mt-2">
              Ask whoever invited you to send a new invite link.
            </p>
          </div>
        )}

        {!loading && isLoaded && invite && !loadError && (
          <div>
            {accepted ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-green-700">
                  Invite accepted! Taking you to your dashboard…
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 text-center mb-6">
                  You&apos;ve been invited to join{" "}
                  <span className="font-semibold">{invite.ownerCompanyName}</span>{" "}
                  on AryaSDR as <span className="font-semibold">{invite.roleName}</span>.
                </p>
                <p className="text-xs text-gray-400 text-center mb-6">
                  Invited email: {invite.email}
                </p>

                {acceptError && (
                  <p className="text-sm text-red-600 text-center mb-4">{acceptError}</p>
                )}

                {isSignedIn ? (
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors disabled:opacity-60"
                  >
                    {accepting ? "Accepting…" : "Accept invite"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href={`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`}
                      className="block w-full text-center rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors"
                    >
                      Create an account to accept
                    </Link>
                    <Link
                      href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
                      className="block w-full text-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Already have an account? Sign in
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
