export const short = {
  en_US: 'A blind relay for Mirall peer-to-peer connections',
  es_ES: 'Un relé ciego para las conexiones P2P de Mirall',
  de_DE: 'Ein blindes Relay für Mirall-Verbindungen',
  pl_PL: 'Ślepy przekaźnik dla połączeń Mirall',
  fr_FR: 'Un relais aveugle pour les connexions Mirall',
}

export const long = {
  en_US:
    'Connects two Mirall peers that cannot reach each other directly — office Wi-Fi, mobile hotspots, symmetric NAT. It bridges two already-encrypted streams, so it holds no session key and cannot read identities, spaces, file names or contents. Requires a public IP or a forwarded UDP port.',
  es_ES:
    'Conecta dos pares de Mirall que no pueden alcanzarse directamente: Wi-Fi de oficina, puntos de acceso móviles, NAT simétrico. Une dos flujos ya cifrados, por lo que no posee claves de sesión ni puede leer identidades, espacios, nombres de archivos o contenidos. Requiere una IP pública o un puerto UDP redirigido.',
  de_DE:
    'Verbindet zwei Mirall-Peers, die sich nicht direkt erreichen können – Büro-WLAN, mobile Hotspots, symmetrisches NAT. Es überbrückt zwei bereits verschlüsselte Datenströme, besitzt also keinen Sitzungsschlüssel und kann weder Identitäten noch Bereiche, Dateinamen oder Inhalte lesen. Erfordert eine öffentliche IP oder einen weitergeleiteten UDP-Port.',
  pl_PL:
    'Łączy dwa węzły Mirall, które nie mogą połączyć się bezpośrednio — Wi-Fi w biurze, hotspoty mobilne, symetryczny NAT. Łączy dwa już zaszyfrowane strumienie, więc nie ma klucza sesji i nie odczyta tożsamości, przestrzeni, nazw plików ani treści. Wymaga publicznego IP lub przekierowanego portu UDP.',
  fr_FR:
    'Relie deux pairs Mirall qui ne peuvent pas se joindre directement : Wi-Fi d’entreprise, partage de connexion, NAT symétrique. Il relie deux flux déjà chiffrés : aucune clé de session, aucune lecture des identités, espaces, noms ou contenus de fichiers. Nécessite une IP publique ou un port UDP redirigé.',
}

export const alertInstall = {
  en_US:
    'A relay is only useful if peers on the internet can reach it. UDP port 49737 must arrive at this server — forward it on your router, or run this on a machine with a public IP. Until then the "Internet Reachability" health check reports a failure and the relay bridges nothing.\n\nThe relay identity is a seed file on this server. Back the service up: if the seed is lost, everyone who configured this relay needs a new key.',
  es_ES:
    'Un relé solo es útil si los pares de internet pueden alcanzarlo. El puerto UDP 49737 debe llegar a este servidor: redirígelo en tu router o ejecútalo en una máquina con IP pública. Hasta entonces, la comprobación «Accesibilidad desde Internet» informará de un fallo y el relé no unirá nada.\n\nLa identidad del relé es un archivo de semilla en este servidor. Haz copias de seguridad del servicio: si se pierde la semilla, todos los que hayan configurado este relé necesitarán una clave nueva.',
  de_DE:
    'Ein Relay ist nur nützlich, wenn Peers aus dem Internet es erreichen können. Der UDP-Port 49737 muss diesen Server erreichen – leiten Sie ihn im Router weiter oder betreiben Sie den Dienst auf einem Rechner mit öffentlicher IP. Bis dahin meldet die Prüfung „Erreichbarkeit aus dem Internet“ einen Fehler und das Relay überbrückt nichts.\n\nDie Relay-Identität ist eine Seed-Datei auf diesem Server. Sichern Sie den Dienst: Geht der Seed verloren, brauchen alle, die dieses Relay eingerichtet haben, einen neuen Schlüssel.',
  pl_PL:
    'Przekaźnik jest użyteczny tylko wtedy, gdy węzły z internetu mogą go osiągnąć. Port UDP 49737 musi docierać do tego serwera — przekieruj go na routerze lub uruchom usługę na maszynie z publicznym IP. Do tego czasu kontrola „Osiągalność z internetu” zgłasza błąd, a przekaźnik niczego nie łączy.\n\nTożsamość przekaźnika to plik ziarna na tym serwerze. Twórz kopie zapasowe usługi: utrata ziarna oznacza, że każdy, kto skonfigurował ten przekaźnik, potrzebuje nowego klucza.',
  fr_FR:
    'Un relais n’est utile que si les pairs sur internet peuvent l’atteindre. Le port UDP 49737 doit parvenir à ce serveur : redirigez-le sur votre routeur, ou exécutez ce service sur une machine dotée d’une IP publique. D’ici là, le contrôle « Accessibilité depuis Internet » signale un échec et le relais ne relaie rien.\n\nL’identité du relais est un fichier de graine sur ce serveur. Sauvegardez le service : si la graine est perdue, toutes les personnes ayant configuré ce relais auront besoin d’une nouvelle clé.',
}

export const alertUninstall = {
  en_US:
    'Uninstalling deletes the relay’s seed, and with it its public key. Anyone who added this relay in Mirall keeps a key that no longer resolves to anything.',
  es_ES:
    'Desinstalar elimina la semilla del relé y, con ella, su clave pública. Quien haya añadido este relé en Mirall conservará una clave que ya no corresponde a nada.',
  de_DE:
    'Beim Deinstallieren wird der Seed des Relays und damit sein öffentlicher Schlüssel gelöscht. Wer dieses Relay in Mirall eingetragen hat, behält einen Schlüssel, der ins Leere führt.',
  pl_PL:
    'Odinstalowanie usuwa ziarno przekaźnika, a wraz z nim jego klucz publiczny. Każdy, kto dodał ten przekaźnik w Mirall, zostanie z kluczem, który już do niczego nie prowadzi.',
  fr_FR:
    'La désinstallation supprime la graine du relais, et avec elle sa clé publique. Toute personne ayant ajouté ce relais dans Mirall conservera une clé qui ne mène plus à rien.',
}
