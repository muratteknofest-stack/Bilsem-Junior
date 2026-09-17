import { CognitiveCategory } from '../../types';

export const CATEGORY_ICONS: Record<CognitiveCategory, string> = {
  visual_perception: '👁️',
  pattern: '🥞',
  matrix: '🔲',
  spatial: '🧭',
  logic: '🧠',
  attention: '🎯',
  memory: '✨',
  numerical: '🔢',
  verbal: '💬',
  coding: '💻',
};

export const CATEGORY_COLORS: Record<
  CognitiveCategory,
  { bg: string; text: string; border: string; pill: string }
> = {
  visual_perception: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  pattern: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    pill: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  matrix: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  spatial: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    pill: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  logic: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    pill: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  attention: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  memory: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    pill: 'bg-violet-100 text-violet-800 border-violet-300',
  },
  numerical: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    pill: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  verbal: {
    bg: 'bg-pink-50',
    text: 'text-pink-800',
    border: 'border-pink-200',
    pill: 'bg-pink-100 text-pink-800 border-pink-300',
  },
  coding: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    pill: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
};
