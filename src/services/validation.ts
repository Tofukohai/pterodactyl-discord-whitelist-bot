const MC_USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;

export function validate_mc_username(username: string): { valid: boolean; reason?: string } {
  if (!MC_USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      reason:
        "Ungültiger Minecraft-Name. Erlaubt sind 3–16 Zeichen: Buchstaben, Zahlen und Unterstriche.",
    };
  }
  return { valid: true };
}

interface MojangProfile {
  id: string;
  name: string;
}

export async function check_mojang_username(username: string): Promise<MojangProfile | null> {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
    );
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) throw new Error(`Mojang API returned ${res.status}`);
    return (await res.json()) as MojangProfile;
  } catch (err) {
    // Log server-side, don't propagate API errors to the user as username-not-found
    console.error("[validation] Mojang API error:", err);
    // Return a "pass" so a Mojang API outage doesn't block whitelisting
    return { id: "unknown", name: username };
  }
}
