"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type RegionSelection = {
  /** 드래그를 시작한 순간의 재생 시간(초). */
  time: number;
  /** 플레이어 표시 영역 기준 0~1 비율 사각형. */
  x: number;
  y: number;
  w: number;
  h: number;
};

type PlayerContextValue = {
  /** 플레이어가 준비되면 현재 재생 시간을 돌려주는 함수를 등록한다. */
  registerTimeSource: (fn: (() => number) | null) => void;
  /** 지금 재생 시간(초). 플레이어가 없으면 null. */
  getCurrentTime: () => number | null;
  /** 영역 선택 모드가 켜져 있는지. 플레이어가 오버레이를 띄운다. */
  armed: boolean;
  /** 선택 모드를 켜고, 한 번 드래그가 끝나면 onSelect를 부른다. */
  arm: (onSelect: (region: RegionSelection) => void) => void;
  disarm: () => void;
  /** 플레이어가 드래그를 마치면 호출한다. */
  emitSelection: (region: RegionSelection) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const timeSourceRef = useRef<(() => number) | null>(null);
  const onSelectRef = useRef<((region: RegionSelection) => void) | null>(null);
  const [armed, setArmed] = useState(false);

  const registerTimeSource = useCallback((fn: (() => number) | null) => {
    timeSourceRef.current = fn;
  }, []);

  const getCurrentTime = useCallback(
    () => (timeSourceRef.current ? timeSourceRef.current() : null),
    [],
  );

  const arm = useCallback((onSelect: (region: RegionSelection) => void) => {
    onSelectRef.current = onSelect;
    setArmed(true);
  }, []);

  const disarm = useCallback(() => {
    onSelectRef.current = null;
    setArmed(false);
  }, []);

  const emitSelection = useCallback(
    (region: RegionSelection) => {
      onSelectRef.current?.(region);
      onSelectRef.current = null;
      setArmed(false);
    },
    [],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({ registerTimeSource, getCurrentTime, armed, arm, disarm, emitSelection }),
    [registerTimeSource, getCurrentTime, armed, arm, disarm, emitSelection],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
