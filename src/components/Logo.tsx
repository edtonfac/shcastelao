import logoAsset from "@/assets/logo.png.asset.json";

export const LOGO_URL = logoAsset.url;

export function Logo({ className = "", size = 56 }: { className?: string; size?: number }) {
  return (
    <img
      src={LOGO_URL}
      alt="Shalom Castelão"
      width={size}
      height={size}
      className={"rounded-2xl object-cover " + className}
    />
  );
}
