import { useAvatarUrl } from "../api/avatar";
import { useMe } from "../auth/useAuth";

/** The user's picture, or their initial on the brand colour when they have none. */
export default function Avatar({ size = 36 }: { size?: number }) {
  const me = useMe();
  const url = useAvatarUrl();
  const initial = me.data?.email?.[0]?.toUpperCase() ?? "?";
  const style = { width: size, height: size };
  if (url) {
    return <img src={url} alt="" style={style} className="rounded-full object-cover" />;
  }
  return (
    <span style={style} className="grid place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white" aria-hidden="true">
      {initial}
    </span>
  );
}
