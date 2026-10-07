/**
 * Point d'entrée unique pour ouvrir le conseiller depuis n'importe quel
 * composant (boutons « Demander »), sans provider React à câbler partout.
 */
export const ADVISOR_EVENT = 'trena:advisor-ask';

export function askAdvisor(question: string) {
  window.dispatchEvent(new CustomEvent<string>(ADVISOR_EVENT, { detail: question }));
}
