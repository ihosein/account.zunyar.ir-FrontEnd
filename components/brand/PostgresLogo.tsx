"use client";

import clsx from "clsx";

type Props = { className?: string; height?: number };

/** PostgreSQL elephant (Slonik) for admin monitor cards. */
export function PostgresLogo({ className, height = 28 }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/Postgresql.ico"
      alt="PostgreSQL"
      width={height}
      height={height}
      className={clsx("h-full w-full max-h-full max-w-full object-contain", className)}
      style={{ width: height, height, aspectRatio: "1 / 1" }}
      decoding="async"
    />
  );
}
