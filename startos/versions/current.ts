import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  // <upstream version>:<package revision>
  // Upstream is still 0.1.0 — the members page landed on main without a tag —
  // so the submodule moved but only the package revision can.
  version: '0.1.0:4',
  releaseNotes: {
    en_US:
      'Adds upstream’s members page. Open it from the Status Page, paste the relay’s admin token once, and create, re-show or revoke invites in the browser — the first way to run a private relay on StartOS without a shell. The status page now also tells you how to add a member instead of only counting them.',
    es_ES:
      'Añade la página de miembros de upstream. Ábrela desde la Página de Estado, pega una vez el token de administración del relé y crea, vuelve a mostrar o revoca invitaciones desde el navegador: la primera forma de gestionar un relé privado en StartOS sin acceso a la consola. La página de estado ahora también explica cómo añadir un miembro en lugar de solo contarlos.',
    de_DE:
      'Fügt die Mitgliederseite von Upstream hinzu. Über die Statusseite öffnen, das Admin-Token des Relays einmal einfügen und Einladungen im Browser erstellen, erneut anzeigen oder widerrufen — die erste Möglichkeit, ein privates Relay unter StartOS ohne Shell zu betreiben. Die Statusseite erklärt jetzt außerdem, wie man ein Mitglied hinzufügt, statt sie nur zu zählen.',
    pl_PL:
      'Dodaje stronę członków z projektu upstream. Otwórz ją ze Strony Stanu, wklej raz token administracyjny przekaźnika i twórz, ponownie wyświetlaj lub unieważniaj zaproszenia w przeglądarce — pierwszy sposób na prowadzenie prywatnego przekaźnika w StartOS bez powłoki. Strona stanu podpowiada teraz również, jak dodać członka, zamiast tylko ich zliczać.',
    fr_FR:
      'Ajoute la page des membres d’amont. Ouvrez-la depuis la Page d’État, collez une fois le jeton d’administration du relais, puis créez, réaffichez ou révoquez des invitations dans le navigateur — le premier moyen de gérer un relais privé sur StartOS sans shell. La page d’état indique désormais aussi comment ajouter un membre au lieu de se contenter de les compter.',
  },
  migrations: {
    // Nothing to migrate: the members page is served from the image, and the
    // roster and token it writes are created by the relay on the volume it
    // already had.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
