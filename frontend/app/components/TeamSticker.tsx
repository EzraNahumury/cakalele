import Image from "next/image";
import { getStickerPath } from "../lib/stickers";
import { TEAMS } from "../lib/data";

const SIZE_MAP = {
  sm: { w: 52, h: 64 },
  md: { w: 80, h: 96 },
  lg: { w: 110, h: 132 },
} as const;

type Props = {
  teamId: string;
  size?: keyof typeof SIZE_MAP;
  tilt?: boolean;
};

export function TeamSticker({ teamId, size = "md", tilt }: Props) {
  const src = getStickerPath(teamId);
  const team = TEAMS[teamId];
  const { w, h } = SIZE_MAP[size];
  const tiltClass = tilt ? "rotate-[-3deg] hover:rotate-0 transition-transform" : "";

  if (!src) {
    return (
      <div
        className={`sticker flex items-center justify-center bg-white ${tiltClass}`}
        style={{ width: w, height: h, fontSize: w * 0.45 }}
        title={team?.name}
      >
        {team?.flag ?? "🏳️"}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={team?.name ?? teamId}
      width={w}
      height={h}
      className={`sticker ${tiltClass}`}
      title={team?.name}
    />
  );
}
