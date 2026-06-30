import React from "react";
import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated logo container */}
        <div className="relative w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md animate-pulse">
          <Image
            src="/logo.png"
            alt="BettaPay"
            width={40}
            height={40}
            priority={true}
            className="w-10 h-10 object-contain"
          />
        </div>

        {/* Brand name */}
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          BettaPay
        </h1>

        {/* Lightweight custom spinner */}
        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}
