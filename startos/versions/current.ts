import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  // <upstream version>:<package revision>
  // Upstream 0.4.2: /readyz reports a rewritten outbound port and an unsettled
  // public address as not reachable. 0.4.2:1 is a message and docs revision.
  version: '0.4.2:1',
  releaseNotes: {
    en_US:
      '**0.4.2:1**: when the Internet Reachability check reports that the relay’s outbound port is being rewritten, it now also says that StartOS before 0.4.0.2 and StartTunnel before 1.3.1 rewrite the port themselves, so update whichever is behind. *Test Reachability* and the instructions say the same. Nothing else changes.',
    es_ES:
      '**0.4.2:1**: cuando la comprobación de Accesibilidad desde Internet informa de que el puerto de salida del relé se está reescribiendo, ahora también indica que StartOS anterior a 0.4.0.2 y StartTunnel anterior a 1.3.1 reescriben el puerto por sí mismos, así que actualiza el que esté desactualizado. *Probar accesibilidad* y las instrucciones dicen lo mismo. No cambia nada más.',
    de_DE:
      '**0.4.2:1**: Meldet die Prüfung der Internet-Erreichbarkeit, dass der ausgehende Port des Relays umgeschrieben wird, sagt sie jetzt auch, dass StartOS vor 0.4.0.2 und StartTunnel vor 1.3.1 den Port selbst umschreiben – aktualisiere, was davon veraltet ist. *Erreichbarkeit testen* und die Anleitung sagen dasselbe. Sonst ändert sich nichts.',
    pl_PL:
      '**0.4.2:1**: gdy kontrola osiągalności z Internetu zgłasza, że port wychodzący przekaźnika jest przepisywany, informuje teraz także, że StartOS starszy niż 0.4.0.2 i StartTunnel starszy niż 1.3.1 same przepisują port, więc zaktualizuj ten, który jest nieaktualny. *Sprawdź osiągalność* i instrukcja mówią to samo. Nic więcej się nie zmienia.',
    fr_FR:
      '**0.4.2:1** : lorsque le contrôle d’accessibilité depuis Internet signale que le port sortant du relais est réécrit, il indique désormais aussi que StartOS avant 0.4.0.2 et StartTunnel avant 1.3.1 réécrivent eux-mêmes le port ; mettez à jour celui qui est en retard. *Tester la joignabilité* et les instructions disent la même chose. Rien d’autre ne change.',
  },
  migrations: {
    // Nothing to migrate. 0.4.2 changes no stored state; `access` in store.json
    // still defaults to 'open' for an install coming from before 0.4.0.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
