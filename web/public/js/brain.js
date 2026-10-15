// The always-on agent's speak-or-wait decision from feed changes, by simple rules.
export const PROACTIVE = { flight: 'flight_intro', training: 'train_intro' };

export function decideByRules(feeds, handled) {
  if (feeds.flight.status === 'delayed' && !handled.flight) {
    return { speak: true, scene: 'flight', reason: `flight ${feeds.flight.code} delayed ${feeds.flight.delayMinutes} min` };
  }
  if (feeds.health.synced && feeds.health.raceOpen && !handled.training) {
    return { speak: true, scene: 'training', reason: `sleep score ${feeds.health.sleepScore}, race sign-up open` };
  }
  return { speak: false, scene: null, reason: 'nothing worth interrupting for' };
}

// Offline speak-or-wait decision. With the live ElevenLabs agent, feed changes go into the
// conversation as contextual updates instead, and the agent decides (see agent-loop.js).
export function decide(feeds, changed, handled) {
  return { ...decideByRules(feeds, handled), via: 'rules' };
}
