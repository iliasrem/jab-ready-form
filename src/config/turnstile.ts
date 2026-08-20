// Clé publique (Site Key) Cloudflare Turnstile.
// Définissez VITE_TURNSTILE_SITE_KEY dans votre environnement avec la vraie Site Key
// obtenue sur https://dash.cloudflare.com/?to=/:account/turnstile
// La clé secrète associée doit être configurée dans TURNSTILE_SECRET_KEY (côté edge function).

const TEST_SITE_KEY = "1x00000000000000000000AA";

const envKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();

if (!envKey) {
  console.warn(
    "[Turnstile] VITE_TURNSTILE_SITE_KEY non définie : utilisation de la clé de TEST Cloudflare. " +
      "En production, la vérification échouera (403 « Vérification anti-spam échouée ») si la vraie clé secrète est configurée.",
  );
}

export const TURNSTILE_SITE_KEY = envKey || TEST_SITE_KEY;
export const IS_TURNSTILE_TEST_KEY = !envKey;
