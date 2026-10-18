import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function AdminMfaGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [factor, setFactor] = useState<string | null>(null),
    [qr, setQr] = useState<string | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    async function check() {
      try {
        const assurance =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error) throw assurance.error;
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        if (live) {
          setReady(assurance.data.currentLevel === "aal2");
          setFactor(
            factors.data.totp.find((f) => f.status === "verified")?.id || null,
          );
          setError("");
        }
      } catch {
        if (live) {
          setReady(false);
          setError(
            "İki aşamalı doğrulama kontrol edilemedi. Sayfayı yenileyip tekrar deneyin.",
          );
        }
      } finally {
        if (live) setLoading(false);
      }
    }
    void check();
    return () => {
      live = false;
    };
  }, []);
  async function setup() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const existing = await supabase.auth.mfa.listFactors();
      if (existing.error) throw existing.error;
      const verified = existing.data.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactor(verified.id);
        return;
      }
      for (const pending of existing.data.all.filter(
        (f) =>
          f.factor_type === "totp" &&
          f.status === "unverified" &&
          ["ZekaPark Yönetim", "Bilsem Junior Yönetim"].includes(f.friendly_name || ""),
      )) {
        const removed = await supabase.auth.mfa.unenroll({
          factorId: pending.id,
        });
        if (removed.error) throw removed.error;
      }
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Bilsem Junior Yönetim",
        issuer: "Bilsem Junior",
      });
      if (result.error) throw result.error;
      setFactor(result.data.id);
      setQr(result.data.totp.qr_code);
    } catch {
      setError(
        "Doğrulayıcı kurulamadı. Supabase Auth TOTP ayarlarının açık olduğunu kontrol edin.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !factor || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor,
        code,
      });
      if (result.error) throw result.error;
      const assurance =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2")
        throw new Error();
      setCode("");
      setQr(null);
      setReady(true);
    } catch {
      setCode("");
      setError(
        "Kod doğrulanamadı. Doğrulayıcıdaki güncel altı haneli kodu girin.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p role="status" className="p-8 text-center">
        İki aşamalı doğrulama kontrol ediliyor…
      </p>
    );
  if (ready) return <>{children}</>;
  return (
    <section
      className="mx-auto max-w-lg rounded-2xl border bg-white p-6"
      aria-labelledby="admin-mfa-title"
    >
      <h1 id="admin-mfa-title" className="text-2xl font-bold">
        İki aşamalı yönetici doğrulaması
      </h1>
      <p className="my-4">
        Yönetici paneline erişmek için doğrulayıcı uygulamanızla hesabınızı
        doğrulayın.
      </p>
      {error && (
        <p role="alert" className="my-4 text-rose-800">
          {error}
        </p>
      )}
      {qr && (
        <>
          <p>
            Doğrulayıcı uygulamanızla bu karekodu tarayın. Karekodu paylaşmayın.
            Hesap kurtarma için doğrulayıcınızın güvenli yedekleme seçeneğini
            kullanın.
          </p>
          <img
            src={qr}
            alt="Yönetici doğrulayıcı kurulum karekodu"
            className="my-4 h-56 w-56"
          />
        </>
      )}
      {factor ? (
        <form onSubmit={verify}>
          <label htmlFor="admin-totp">Altı haneli doğrulama kodu</label>
          <input
            id="admin-totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="my-3 block w-full rounded-xl border p-3"
          />
          <button
            disabled={busy}
            className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 text-white"
          >
            {busy ? "Doğrulanıyor…" : "Doğrula ve panele gir"}
          </button>
        </form>
      ) : (
        <button
          disabled={busy}
          onClick={() => void setup()}
          className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 text-white"
        >
          {busy ? "Hazırlanıyor…" : "Doğrulayıcı uygulama kur"}
        </button>
      )}
    </section>
  );
}
