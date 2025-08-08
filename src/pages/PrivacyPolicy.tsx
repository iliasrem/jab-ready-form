import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function setOrUpdateMeta(name: string, content: string) {
  const existing = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) existing.setAttribute("content", content);
  else {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

function setOrUpdateCanonical(href: string) {
  const existing = document.head.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
  if (existing) existing.setAttribute("href", href);
  else {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", href);
    document.head.appendChild(link);
  }
}

const STORAGE_KEY = "privacyPolicyContent";

export default function PrivacyPolicy() {
  const [content, setContent] = useState<string>("");
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => {
    document.title = "Politique de confidentialité | Pharmacie Remili-Bastin";
    setOrUpdateMeta(
      "description",
      "Politique de confidentialité de la Pharmacie Remili-Bastin."
    );
    setOrUpdateCanonical(window.location.href);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setContent(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, content);
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <nav className="text-sm">
            <Link to="/" className="text-primary hover:underline">
              ← Retour à l'accueil
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Politique de confidentialité</h1>
        <p className="text-muted-foreground mb-6">
          Collez ci-dessous votre politique de confidentialité, puis cliquez sur « Enregistrer ».
        </p>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant={editing ? "secondary" : "default"} onClick={() => setEditing((v) => !v)}>
              {editing ? "Quitter le mode édition" : "Éditer le contenu"}
            </Button>
            {editing && (
              <Button variant="outline" onClick={handleSave}>
                Enregistrer
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-80 p-4 rounded-md border bg-background text-foreground"
                placeholder="Collez ici le texte de votre politique de confidentialité..."
              />
              <p className="text-xs text-muted-foreground">
                Astuce: le contenu est sauvegardé dans votre navigateur (localStorage).
              </p>
            </div>
          ) : (
            <article className="prose prose-sm md:prose-base max-w-none text-foreground">
              {content ? (
                <div className="whitespace-pre-line">{content}</div>
              ) : (
                <p className="text-muted-foreground">Aucun contenu pour le moment.</p>
              )}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
