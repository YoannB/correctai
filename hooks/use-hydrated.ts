"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// false while React renders with SERVER snapshots (SSR and the hydration render), true once the
// CLIENT snapshots are in use (React re-renders right after hydrating). No effect, no setState:
// an external-store read whose server/client snapshots differ on purpose. Use it to keep an
// Effect from writing an external system (the DOM) from values that are only server defaults.
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
