import { useEffect } from "react";
import { Link } from "react-router-dom";

const PDF_URL = "https://www.dropbox.com/scl/fi/xewf8cdmmhx1pvox3f1b0/POLITIQUE-DE-PROTECTION-DES-DONNEES-A-CARACTERE-PERSONNEL.pdf?rlkey=s927wmkpan4olwdkhe2rex5pk&dl=0";

function setOrUpdateMeta(name: string, content: string) {
  const existing = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.setAttribute("content", content);
  } else {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

function setOrUpdateCanonical(href: string) {
  const existing = document.head.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
  if (existing) {
    existing.setAttribute("href", href);
  } else {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", href);
    document.head.appendChild(link);
  }
}

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Politique de confidentialité | Pharmacie Remili-Bastin";
    setOrUpdateMeta(
      "description",
      "Consultez la politique de confidentialité de la Pharmacie Remili-Bastin."
    );
    setOrUpdateCanonical(window.location.href);
  }, []);

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

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Politique de confidentialité</h1>
        <p className="text-muted-foreground mb-6">
          Cette page présente la politique de protection des données à caractère personnel.
        </p>

        <section className="bg-muted/40 rounded-lg p-4 md:p-6">
          <div className="w-full h-[70vh] rounded-md border overflow-hidden">
            <iframe
              src={PDF_URL}
              title="Politique de confidentialité (PDF)"
              className="w-full h-full"
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Si le PDF ne s'affiche pas, vous pouvez le consulter dans un nouvel onglet
            {" "}
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ici
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
