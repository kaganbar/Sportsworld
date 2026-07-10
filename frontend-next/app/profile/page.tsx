"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";
import { Me, clearTokens, fetchMe, googleLoginUrl, storeTokens } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { t } = useLang();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = still loading

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (accessToken && refreshToken) {
      storeTokens(accessToken, refreshToken);
      window.history.replaceState(null, "", "/profile");
    }
    fetchMe().then(setMe);
  }, []);

  const handleSignOut = () => {
    clearTokens();
    setMe(null);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          {me === undefined && <Skeleton className="h-32 w-full" />}

          {me === null && (
            <>
              <div className="text-5xl">👤</div>
              <h1 className="text-2xl font-bold">{t("nav_profile")}</h1>
              <a href={googleLoginUrl()}>
                <Button>{t("signInWithGoogle")}</Button>
              </a>
            </>
          )}

          {me && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- external Google avatar, not worth next/image's domain config for a light verification page */}
              {me.avatar_url && <img src={me.avatar_url} alt="" className="h-16 w-16 rounded-full" />}
              <h1 className="text-2xl font-bold">
                {t("welcomeBack")}, {me.name}
              </h1>
              <p className="text-sm text-muted-foreground">{me.email}</p>
              <p className="text-sm text-muted-foreground">{t("profileNote")}</p>
              <Button variant="outline" onClick={handleSignOut}>
                {t("signOut")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
