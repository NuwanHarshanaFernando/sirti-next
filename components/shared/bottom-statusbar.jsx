'use client';

import { useSession } from 'next-auth/react';
import { useAppVersion } from "@/hooks/use-app-version";

const BottomStatusBar = () => {
    const { data: session, status } = useSession();
    const appVersion = useAppVersion();

    const LoadingPlaceholder = () => (
        <div className="w-40 h-4 bg-gray-200 rounded animate-pulse"></div>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between h-8 px-4 text-sm text-black bg-white border-t">
            <div className="flex items-center gap-2 ml-[70px]">
                {status === "loading" ? (
                    <LoadingPlaceholder />
                ) : status === "authenticated" && session?.user ? (
                    <>
                        <span>{session.user.name}</span>
                        <span className="text-gray-600">({session.user.email})</span>
                    </>
                ) : (
                    <LoadingPlaceholder />
                )}
            </div>
            <span className="text-gray-500">
                {(!appVersion || appVersion === '0.0.0') ? (
                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                ) : `V${appVersion}`}
            </span>
        </div>
    );
};

export default BottomStatusBar;