import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  // <upstream version>:<package revision>
  version: '0.1.0:1',
  releaseNotes: {
    en_US:
      'Adds a status page: the relay public key with a copy button and a QR code, whether peers can reach it in plain language, and the live traffic counters.',
    es_ES:
      'Añade una página de estado: la clave pública del relé con botón de copia y código QR, si los pares pueden alcanzarlo explicado con claridad, y los contadores de tráfico en vivo.',
    de_DE:
      'Fügt eine Statusseite hinzu: den öffentlichen Schlüssel des Relays mit Kopierschaltfläche und QR-Code, verständlich formuliert ob Peers es erreichen können, sowie die laufenden Datenverkehrszähler.',
    pl_PL:
      'Dodaje stronę stanu: klucz publiczny przekaźnika z przyciskiem kopiowania i kodem QR, zrozumiały opis czy węzły mogą go osiągnąć, oraz bieżące liczniki ruchu.',
    fr_FR:
      'Ajoute une page d’état : la clé publique du relais avec un bouton de copie et un QR code, en clair si les pairs peuvent l’atteindre, et les compteurs de trafic en direct.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
