'use client';

import { MessageCircleQuestion } from 'lucide-react';
import { askAdvisor } from './ask';

/** Pose une question pré-remplie au conseiller (cartes métriques, bandeau). */
export default function AskButton({
  question,
  label = 'Demander',
  className = '',
}: {
  question: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => askAdvisor(question)}
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-ats-green transition-colors hover:text-ats-text ${className}`}
    >
      <MessageCircleQuestion className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
