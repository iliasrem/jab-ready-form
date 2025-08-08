import { useEffect } from "react";
import { Link } from "react-router-dom";

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

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Politique de confidentialité | Pharmacie Remili-Bastin";
    setOrUpdateMeta(
      "description",
      "Politique de protection des données à caractère personnel de la Pharmacie Remili-Bastin."
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
        <h1 className="text-3xl font-bold mb-6">Politique de confidentialité</h1>

        <article className="prose prose-sm md:prose-base max-w-none text-foreground">
          <div className="whitespace-pre-line">
Privacy policy
POLITIQUE DE PROTECTION DES DONNEES A CARACTERE PERSONNEL

Votre confiance en nous constitue le capital le plus important de la société à responsabilité limitée « Pharmacie Remili-Bastin », dont le siège social est établi à 7160 Chapelle-lez-Herlaimont, Rue Solvay 62 - 64, enregistré à la Banque Carrefour des Entreprises sous le numéro 0872.727.608, RPM Hainaut, division Charleroi (ci- après dénommée la « Pharmacie Remili-Bastin », « nous » ou « notre Société »). Votre vie privée revêt dès lors une importance essentielle pour nous.

La présente politique de protection des données à caractère personnel (ci-après dénommée la « Politique ») s'applique entre autres à (i) notre site internet https://www.remili.be/ , à (ii) notre application web www.remili.healthcare (ci-après tous deux dénommés le « Site Web »), notre page Facebook, et, de manière générale, (iii) à toutes les relations (commerciales) existant entre la Pharmacie Remili-Bastin par le biais de ce Site Web , les visiteurs, partenaires commerciaux, et toutes personnes avec qui nous sommes susceptibles d’entretenir des relations externes par le biais de ce Site Web.

La présente Politique s’applique à toutes les données à caractère personnel collectées et traitées par la Pharmacie Remili-Bastin dans les relations décrites ci-avant, agissant en qualité de responsable du traitement, et couvre tous les traitements de données dont la Pharmacie Remili-Bastin est responsable du point de vue des personnes concernées dans les relations décrites ci-avant.

Cette Politique contient, entre autres, des informations sur les données à caractère personnel que la Pharmacie Remili-Bastin récolte, ainsi que sur la manière dont la Pharmacie Remili-Bastin traite ces données à caractère personnel.

La Pharmacie Remili-Bastin met tout en œuvre pour agir à tout moment en conformité avec (i) le Règlement européen (UE) 2016/679 du 27 avril 2016 (Règlement Général sur la Protection des Données - le « RGPD ») et (ii) la Loi belge du 30 juillet 2018 relative à la protection des personnes physiques à l’égard des traitements de données à caractère personnel.

La visite du Site Web, la transmission de vos données à caractère personnel sur le Site Web, la sollicitation de nos services par ce biais ainsi que, de manière générale, la communication avec la Pharmacie Remili-Bastin impliquent votre approbation expresse de la présente Politique et donc de la manière dont nous collectons, utilisons et traitons vos données à caractère personnel. La Pharmacie Remili-Bastin ne traitera toutefois jamais vos données à caractère personnel sans votre consentement lorsque ce dernier est nécessaire.

Veuillez lire la présente Politique en combinaison avec les conditions d’utilisation du Site Web et la politique d’utilisation des cookies de la Pharmacie Remili-Bastin.

• Types de données à caractère personnel
La Pharmacie Remili-Bastin peut collecter et traiter les données à caractère personnel

suivantes :
• Nom;

Prénom ;

Adresse e-mail ;

Numéro de téléphone (fixe/gsm) ;

Adresse du domicile (adresse, code postal, localité, pays) ;

Numéro de compte bancaire ;

Adresse IP;

Toutes les données à caractère personnel transmises volontairement à la Pharmacie Remili-Bastin (lors de la correspondance via le formulaire de contact, par mail ou par téléphone).

La Pharmacie Remili-Bastin collecte en outre automatiquement des informations anonymes concernant l'utilisation que vous faites du Site Web, par le biais de cookies. Ainsi, par exemple, la Pharmacie Remili-Bastin enregistrera automatiquement quelles parties du Site Web vous visitez, quel navigateur web vous utilisez, quel site web vous visitiez lorsque vous avez reçu l'accès au Site Web, etc. Nous ne pouvons pas vous identifier sur la base de ces données, mais celles-ci permettent à la Pharmacie Remili- Bastin d'établir des statistiques concernant l'utilisation du Site Web. Dès lors, la navigation sur le Site Web de la Pharmacie Remili-Bastin implique votre acceptation concernant l’utilisation de certains cookies. Pour en savoir plus à ce sujet, veuillez lire notre politique d’utilisation des cookies.

• Mode de collecte des données à caractère personnel
Ces données à caractère personnel sont collectées en cas de ou dans le cadre de :

La visite du Site Web de la Pharmacie Remili-Bastin par le biais des cookies ;

Votre inscription à la newsletter de la Pharmacie Remili-Bastin ;

L’inscription de vos données à caractère personnel via le formulaire de

contact disponible sur le Site Web de la Pharmacie Remili-Bastin ;

La création de votre compte sur le Site Web de la Pharmacie Remili- Bastin ;

L’inscription de vos données à caractère personnel via le formulaire de commande avec ou sans livraison sur le Site Web de la Pharmacie Remili-Bastin ;

La transmission de votre ordonnance sur le Site Web de la Pharmacie Remili-Bastin ;

Perception du paiement électronique suite à une commande ;

De manière générale, la correspondance échangée avec la Pharmacie Remili-Bastin (par le biais des différents moyens de communication proposés : e-mail, téléphone, Whatsapp, Site Web), ou par tout autre moyen de correspondance.

Les données à caractère personnel collectées par la Pharmacie Remili-Bastin sont donc expressément et volontairement fournies par vos soins.

La délivrance de certaines données à caractère personnel est une condition afin de pouvoir bénéficier de certains services (par exemple la demande de contact ou la

transmission de votre CV via la rubrique « recrutement » du Site Web). Nous nous engageons à ne collecter que les données à caractère personnel dont nous avons besoin pour la finalité du traitement, et à ne traiter ces données qu’en fonction du but poursuivi.

• Utilisation des données à caractère personnel
La Pharmacie Remili-Bastin peut utiliser vos données à caractère personnel pour les

finalités que vous trouverez en annexe 1 de la présente Politique.

De manière générale, nous n’utiliserons vos données à caractère personnel que si vous y avez consenti ou lorsque cette utilisation repose sur l’un des fondements juridiques prévus légalement, à savoir :

La sauvegarde de nos intérêts légitimes ;

La conclusion, la négociation et l’exécution d’un contrat qui nous lie

avec vous ;

Le respect d’une obligation légale ;

La préservation de l’intérêt public.

Divulgation de données à caractère personnel à des tiers

La Pharmacie Remili-Bastin ne divulguera pas vos données à caractère personnel à des tiers, sauf lorsque cela s'avère nécessaire dans le cadre du service sollicité et notamment, mais sans limitation :

La gestion de nos bases de données (inscription/modification/suppression) ;

Les analyses d’audience de notre Site Web ;

Le stockage informatique ;

L’exécution du service proposé (la commande en ligne) ;

Le respect des obligations légales imposées à la Pharmacie Remili-

Bastin en tant que pharmacien accrédité auprès de l’Association Pharmaceutique Belge (« APB »).

Dans ce contexte, vos données à caractère personnel peuvent éventuellement être rendues publiques auprès des webmasters, des partenaires de paiement, des fournisseurs de logiciels, des partenaires cloud, notre compagnie d’assurances ainsi que divers prestataires à qui la Pharmacie Remili-Bastin est susceptible de faire appel dans le cadre de la prestation de ses services.

S'il est nécessaire que, dans ce cadre, la Pharmacie Remili-Bastin divulgue vos données à caractère personnel à des tiers, la tierce partie concernée sera tenue d'utiliser vos données à caractère personnel conformément aux dispositions de la présente Politique.

Nonobstant ce qui précède, il est toutefois possible que la Pharmacie Remili-Bastin divulgue vos données à caractère personnel :

Aux autorités compétentes (i) lorsque la Pharmacie Remili-Bastin y est tenue en vertu de la loi ou dans le cadre d'une procédure judiciaire en cours ou future et (ii) pour garantir et défendre ses droits ;

Lorsque la Pharmacie Remili-Bastin ou la majorité de ses actifs sont repris par une tierce partie, auquel cas vos données à caractère

personnel – collectées par la Pharmacie Remili-Bastin – constitueront l'un des actifs transférés;

Lorsque vous y avez expressément consenti, le cas échéant.

Traitement transfrontalier des données à caractère personnel

En principe nous ne transmettrons pas vos données à caractère personnel en-dehors de l'Espace économique européen (EEE). Toutefois, si dans le cadre de certaines prestations, la Pharmacie Remili-Bastin est amenée à traiter vos données à caractère personnel en dehors de l'EEE avec un destinataire qui a son domicile ou son siège social dans un pays qui ne tombe pas sous une décision similaire, promulguée par la Commission européenne, ce traitement sera soumis aux dispositions d'une convention de transfert de données, laquelle contiendra (i) les clauses contractuelles standards telles que définies dans la ‘Décision de la Commission européenne du 5 février 2010 (Décision 2010/87/CE)’, ou (ii) un quelconque autre mécanisme sur la base de la législation relative à la vie privée ou d'une quelconque autre réglementation relative au traitement de données à caractère personnel.

• Stockage des données à caractère personnel

Sauf quand un plus long délai de conservation est requis ou justifié (i) par la loi ou (ii) par le respect d'une autre obligation légale, la Pharmacie Remili-Bastin ne conserve vos données à caractère personnel que pendant la période qui est nécessaire pour atteindre et remplir les objectifs pour lesquels elles ont été collectées tels que décrits dans la présente Politique, sous le point ‘utilisation des données à caractère personnel'.

La Pharmacie Remili-Bastin conservera toutes les données à caractère personnel qu'elle a collectées, dans ses dossiers en version papier tenus en interne dans l’entreprise, sur ses serveurs et logiciels informatiques internes ainsi que sur un serveur cloud localisé en Europe.

Voir Annexe 2 : durées de conservation par catégorie de traitements.
• Vos droits relatifs à la protection de vos données à caractère

personnel

Dans le cadre du traitement de vos données à caractère personnel, vous disposez des droits suivants :

Droit d'accéder à tout moment à vos données à caractère personnel ;

Droit de faire rectifier, de compléter ou de mettre à jour vos données à

caractère personnel ;

Dans certaines circonstances, le droit de supprimer vos données à caractère personnel (‘droit à l’oubli’) (dans ce contexte, la Pharmacie Remili-Bastin indique que certains services ne seront plus accessibles ou ne pourront être fournis si vous supprimez certaines données personnelles ou les faites supprimer) ;

Droit à une limitation du traitement de vos données à caractère personnel ;

Droit à la portabilité de vos données à caractère personnel ;

Droit d'objection / d'opposition contre le traitement de vos données à caractère personnel.

Si vous souhaitez exercer vos droits relatifs à la protection de vos données à caractère personnel, veuillez contacter la Pharmacie Remili- Bastin par e-mail (info@remili.be) ou par courrier (Pharmacie Remili- Bastin, Rue Solvay 62 - 64 à 7160 Chapelle-lez-Herlaimont).

Vous trouverez de plus amples informations à propos de vos droits sur le site web de l’Autorité de Protection des Données (ci-après l’ « APD ») via le lien suivant«https://www.autoriteprotectiondonnees.be/».

• Protection des données à caractère personnel

La Pharmacie Remili-Bastin s'engage à prendre les mesures de précaution raisonnables, de nature physique, technologique et/ou organisationnelle pour éviter (i) l'accès non autorisé à vos données à caractère personnel, ainsi que (ii) l'abus, la perte, le vol ou la destruction accidentelle ou illicite de vos données à caractère personnel.

Nonobstant la politique de fuite de données à caractère personnel [BM7] de la Pharmacie Remili-Bastin, les contrôles qu'elle effectue et les actes qu'elle pose dans ce cadre, il ne peut être garanti un niveau infaillible de sécurité. Aucune méthode de transfert ou de transmission par le biais d’internet, ni aucune méthode de stockage électronique ne sont sûres à 100 %, de sorte que la Pharmacie Remili-Bastin ne peut, dans ce cadre, garantir une sécurité absolue. La Pharmacie Remili-Bastin étant soumise à cet égard à une obligation de moyen.

Enfin, la sécurité de votre compte le cas échéant dépendra également de la confidentialité de votre mot de passe pour pouvoir passer une commande sur notre Site Web. La Pharmacie Remili-Bastin ne vous demandera jamais votre mot de passe, de sorte que vous êtes tenu de ne pas le communiquer vous-même. Lorsque vous avez néanmoins communiqué votre mot de passe à un tiers, ce dernier recevra l'accès, par le biais de votre mot de passe, à votre compte et à vos données à caractère personnel. Dans ce cas, vous assumez vous-même la responsabilité des agissements qui sont posés par l'utilisation qui est faite de votre compte. La Pharmacie Remili- Bastin vous conseille dès lors vivement, lorsque vous constatez que quelqu'un a obtenu l'accès à votre compte, de modifier immédiatement votre mot de passe et/ou de prendre contact avec la Pharmacie Remili-Bastin.

• Actualisation de la Politique

La Pharmacie Remili-Bastin est habilitée à actualiser la présente Politique en publiant une nouvelle version sur le Site Web. Dans ce cadre, il est particulièrement indiqué de consulter régulièrement le Site Web et la page concernée sur laquelle la Politique est disponible, afin d'être certain que vous ayez connaissance des moindres modifications.

La dernière version sera toujours consultable via ce lien[BM(-L8] . • Autres sites web

Le Site Web peut éventuellement contenir des hyperliens vers d'autres sites web (tels que, par exemple, vers notre page Facebook). Lorsque vous cliquez sur l'un de ces liens, vous pouvez être redirigé vers un autre site web ou une source internet qui pourrait recueillir des informations à votre sujet via des cookies ou d'autres technologies. La Pharmacie Remili-Bastin ne porte aucune responsabilité, ou autorité

de contrôle sur ces autres sites ou ressources internet, ni sur la collecte, l'utilisation et la distribution de vos données à caractère personnel. Vous devez vérifier vous-même la politique de confidentialité de ces autres sites web et sources internet afin de pouvoir juger s'ils agissent conformément à la législation sur la protection de la vie privée.

• Contactez la Pharmacie Remili-Bastin

Si vous avez des questions sur la présente Politique ou sur la manière dont la Pharmacie Remili-Bastin collecte, utilise ou traite vos données à caractère personnel, veuillez nous contacter :

Par e-mail : info@remili.be ou

Par la poste : Pharmacie Remili-Bastin, Rue Solvay 62 - 64 à 7160 Chapelle-lez-Herlaimont

Si vous n’êtes pas satisfait de la manière dont la Pharmacie Remili-Bastin a traité les questions ou commentaires que vous lui avez soumis, ou si vous avez des réclamations concernant la manière dont la Pharmacie Remili-Bastin collecte, utilise et/ou traite vos données à caractère personnel, vous pouvez introduire une plainte auprès de l’APD.

• Qu’attendons-nous de vous ?

De notre côté, nous attendons de vous que vous vous assuriez que les informations que vous nous avez transmises sont pertinentes et à jour. Vous devez également nous informer sans délai de tout changement significatif relatif à votre situation. Si vous êtes amené à devoir nous fournir des informations sur un tiers, nous vous invitons à vous assurer que ce dernier vous a donné son consentement pour ce faire.

Annexe 1 – Finalités de l’utilisation des données à caractère personnel

La Pharmacie Remili-Bastin peut notamment utiliser vos données à caractère personnel pour les finalités suivantes :

1. La visite de notre Site Web, l’optimisation de la qualité, la gestion et le contenu du Site Web :

Afin d’améliorer la qualité de vos visites sur notre Site Web, nous utilisons certains cookies nous permettant de mémoriser certaines de vos données à caractère personnel. Cependant, nous utilisons de façon très limitée les cookies de longue durée.

Merci de cliquer ici[BM(-L9] pour en savoir plus sur la façon dont nous utilisons les cookies.

Ce traitement se fonde sur notre intérêt légitime ou sur votre consentement.

2. Inscription à notre newsletter

Sur notre Site Web, vous avez l’opportunité de vous inscrire à notre Newsletter. Afin de répondre à votre demande nous serons amenés à traiter les données à

caractère personnel communiquées à cette fin. Vous avez l’opportunité de vous désinscrire de ce service à tout moment.

Ce traitement se fonde sur votre consentement.
3. Réception et traitement des questions posées via le formulaire de

contact ou par tout autre moyen de communication :

Un formulaire de contact en ligne est disponible sur notre Site Web. Vous avez également l’opportunité de nous contacter par téléphone, WhatsApp et par e- mail. Afin d’honorer vos demandes diverses nous serons amenés à traiter certaines de vos données à caractère personnel.

Ce traitement se fonde sur notre intérêt légitime ou votre consentement.

4. La création de votre compte sur notre Site Web

Afin de pouvoir passer une commande directement via notre site internet, au contraire de l’application web, vous serez amené à procéder à la création d’un compte utilisateur. A cette fin, certaines de vos données à caractère personne vous seront demandées. Afin d’honorer votre commande nous serons amenés à traiter ces données à caractère personnel.

Ce traitement se fonde sur notre intérêt légitime.
5. Inscription de vos données à caractère personnel via le formulaire de commande

Notre Site Web (site internet et application mobile) permet aux utilisateurs de passer une commande avec ou sans livraison. Pour ce faire, l’utilisateur est amené à nous communiquer certaines données à caractère personnel d’identification ainsi que le contenu (via une photo ou un scan) de son ordonnance médicale. Afin d’honorer votre commande nous serons amenés à traiter ces données à caractère personnel.

Ce traitement se fonde sur notre intérêt légitime ou sur une obligation légale.

6. L’établissement de ‘mailing lists’:

Dans le cadre des différents services que nous proposons, nous constituons une base de données de contacts afin d’assurer un meilleur suivi des relations avec nos patients. Dans ce contexte, certaines de vos données à caractère personnel pourront être collectées et conservées dans une base de données (notamment l’historique de vos achats). Vos données à caractère personnel ne seront jamais utilisées à des fins marketing sans votre consentement exprès.

Ce traitement se fonde sur l’obligation légale ou votre consentement.

7. La perception des paiements électroniques:

Dans le cadre des services proposées par la Pharmacie Remili-Bastin, nous serons amenés à avoir accès à certaines de vos données à caractère personnel en vue de la perception du paiement électronique de votre commande.

Ce traitement se fonde sur l’exécution d’un contrat.
8. La correspondance générale avec la Pharmacie Remili-Bastin

Nous vous proposons plusieurs moyens de communication afin de rentrer en contact avec la Pharmacie Remili-Bastin (e-mail, téléphone, Whatsapp, Site Web,...). Lors de ces échanges, certaines données à caractère personnel vous concernant ou concernant des tiers pourront être échangées. Nous ne traiterons jamais ces données à caractère personnel pour une autre finalité que celle pour laquelle vous être entré en contact avec la Pharmacie Remili Bastin.

Ce traitement se fonde sur notre intérêt légitime, une obligation légale ou votre consentement.

9. Respect des législations et des réglementations:

Nous nous assurons du respect de toute législation ou réglementation en vigueur. Dans ce cadre, et si cela s’impose, nous serons amenés à traiter certaines de vos données à caractère personnel.

Ce traitement se fonde sur le respect d’une obligation légale.

10.Protection de nos droits :

Nous sommes susceptibles d’utiliser vos données à caractère personnel afin de protéger nos droits notamment dans le cadre de la défense ou de la protection de droits et d'intérêts légaux, d'actions en justice, la gestion de réclamations ou de litiges, en cas de restructuration de sociétés ou autres opérations de fusion ou acquisition.

Ce traitement se fonde sur le respect d’une obligation légale.

Annexe 2 : durée de conservation par catégorie de finalité, sous réserve du droit à l’oubli (sauf obligation légale de conservation)

Finalités des traitements de données à caractère personnel

Fondement

Durée de conservation maximale (sauf indication contraire)

La visite de notre Site Web, l’optimisation de la qualité, la gestion et le contenu du Site Web

Intérêt légitime

Consentement

Maximum 13 mois

Inscription à la Consentement Recommandation Newsletter t : effacé dès que le

consentement a été retiré.

Réception et traitement des questions posées via le formulaire de contact ou par tout autre moyen de communication

Intérêt légitime

Consentement

Recommandation

: 3 ans après le dernier contact si client / 1 an après le dernier contact si prospect.

La création de votre compte sur notre Site Web

Intérêt légitime

Recommandation

: 3 ans après le dernier contact si client / 1 an après le dernier contact si prospect.

Inscription de vos données à caractère personnel via le formulaire de commande

Intérêt légitime

Obligation légale

Recommandation

: 3 ans après le dernier contact si client / 1 an après le dernier contact si prospect.

L’établissement de ‘mailing lists’

Obligation légale

Consentement

Recommandation

:

- Si pas de consentement : suppression des données dès que le traitement est terminé ;

- Si consentement : 3 ans après le dernier contact client/prospect.

Perception des paiements électroniques

Exécution contractuelle

Recommandation

: 3 ans après le dernier contact avec l’individu.

Pour ce qui est des documents financiers : 7 ans à partir du 1e janvier de l’année qui suit

la période imposable.

Correspondance générale avec la Pharmacie Remili-Bastin

Intérêt légitime

Obligation légale

Consentement

Recommandation

: 3 ans après le dernier contact avec l’individu

L’établissement de ‘mailing lists’

Exécution contractuelle

Consentement

Recommandation

:

- Si pas de consentement : suppression de l’adresse mail dès que la finalité est atteinte ;

- Si consentement : 3 ans après le dernier contact client/prospect.

Respect des législations et des réglementation s

Obligation légale

- Documents sociaux : 5 ans à partir du jour qui suit celui de la fin de l’exécution du contrat ;

- Données médicales (certificat) : 15 ans maximum

- Données liées aux accidents de travail : 10 ans maximum

- Documents financiers : 7 ans à partir du 1e janvier de l’année qui suit la période imposable

Protection de nos droits

Obligation légale

Aussi longtemps que l’action en justice/la procédure/le litige est en cours, et

jusqu’à 10 ans après cela.

Responsable de la publication:

Monsieur REMILI I.
Email de contact: info@remili.be
          </div>
        </article>
      </main>
    </div>
  );
}
