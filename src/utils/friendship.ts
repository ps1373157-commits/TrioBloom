/**
 * TrioBloom friendship and quiz utilities
 */

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  flowerTrait: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "When the group plans a late-night dessert craving, who is definitely the first to say 'Yes, let's go!'?",
    options: [
      "Palak (ready before anyone even finished typing)",
      "Priya (needs 5 minutes to pick an aesthetic outfit)",
      "Hanshika (already checking the menu reviews)",
      "You (secretly had your shoes on already)"
    ],
    correctIndex: 0,
    explanation: "Palak's spontaneity and sweet tooth always kickstart the group adventures!",
    flowerTrait: "Cherry Blossom - Spontaneous Joy"
  },
  {
    id: 2,
    question: "What is TrioBloom's unofficial secret superpower as a friendship circle?",
    options: [
      "Telepathic eye contact across a crowded room",
      "Sending 45 reels in under 10 minutes",
      "Turning a 5-minute call into a 3-hour life debrief",
      "All of the above combined with unconditional love"
    ],
    correctIndex: 3,
    explanation: "Every single one! Four hearts bound by nonstop laughter and infinite support.",
    flowerTrait: "Tulip - Everlasting Bond"
  },
  {
    id: 3,
    question: "Who is most likely to show up with handwritten notes, cute stickers, or surprise coffee?",
    options: [
      "Palak (with cute polaroid memories)",
      "Priya (with handcrafted notes & lavender tea)",
      "Hanshika (with warm pastries & hype energy)",
      "You (with personalized playlists)"
    ],
    correctIndex: 1,
    explanation: "Priya's artistic heart makes sure every celebration feels magical and cozy.",
    flowerTrait: "Lavender Orchid - Thoughtful Warmth"
  },
  {
    id: 4,
    question: "If the 4 friends were stuck on a rainy road trip, who holds the emergency snack bag?",
    options: [
      "Hanshika (has chocolates, chips, and backup charger)",
      "Palak (already found a cozy diner 2 miles away)",
      "Priya (making a cinematic travel vlog)",
      "You (master of the aux cord & singalongs)"
    ],
    correctIndex: 0,
    explanation: "Hanshika is the queen of comfort snacks and good vibes on every journey!",
    flowerTrait: "Buttercup Peony - Care & Comfort"
  },
  {
    id: 5,
    question: "What is the true motto that keeps the four friends blooming together?",
    options: [
      "Four hearts, one story 🌷",
      "No secrets, unlimited fries, forever loyalty",
      "Together through exams, triumphs, heartaches, and hugs",
      "All of the above, always and forever"
    ],
    correctIndex: 3,
    explanation: "'Four hearts, one story' captures every chapter of our lifelong sisterhood.",
    flowerTrait: "Golden Lotus - Timeless Friendship"
  }
];

export interface QuizPersona {
  title: string;
  badge: string;
  description: string;
  flowerEmoji: string;
}

export function getQuizPersona(score: number, total: number): QuizPersona {
  const percentage = (score / total) * 100;
  if (percentage === 100) {
    return {
      title: "Soulmate Petal 🌸",
      badge: "Full Bloom Companion",
      description: "You know every secret glance, favorite craving, and inside joke of the group by heart!",
      flowerEmoji: "🌸"
    };
  } else if (percentage >= 80) {
    return {
      title: "Golden Peony 🌷",
      badge: "Heart of the Circle",
      description: "A deeply loyal and loving anchor whose warmth brightens everyone's day.",
      flowerEmoji: "🌷"
    };
  } else if (percentage >= 60) {
    return {
      title: "Sunlit Daisy 🌼",
      badge: "Joyful Blossom",
      description: "Bringing radiant energy and sweet giggles whenever the group meets.",
      flowerEmoji: "🌼"
    };
  } else {
    return {
      title: "Sweet Lavender Bud 🪻",
      badge: "Gentle Spirit",
      description: "Thoughtful and caring, always ready to lend a soft ear and warm hug.",
      flowerEmoji: "🪻"
    };
  }
}

/**
 * Generates a deterministic private conversation ID between two user IDs
 */
export function getPrivateConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1.trim(), uid2.trim()].sort();
  return `private_${sorted[0]}_${sorted[1]}`;
}

/**
 * Calculates quiz score
 */
export function calculateQuizScore(answers: number[], questions: QuizQuestion[] = QUIZ_QUESTIONS): {
  score: number;
  total: number;
  percentage: number;
  persona: QuizPersona;
} {
  let score = 0;
  questions.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) {
      score += 1;
    }
  });
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const persona = getQuizPersona(score, total);
  return { score, total, percentage, persona };
}

/**
 * Formats timestamps in a cute, readable friendship format
 */
export function formatFriendlyTime(date: Date | { seconds: number; nanoseconds: number } | string | null | undefined): string {
  if (!date) return "Just now";
  let d: Date;
  if (typeof date === "object" && "seconds" in date) {
    d = new Date(date.seconds * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return "Recently";
  }

  if (isNaN(d.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now 🌸";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Checks if a user is approved
 */
export function isUserApproved(memberData?: { isApproved?: boolean; role?: string } | null, email?: string | null): boolean {
  if (!memberData && !email) return false;
  if (email === "ps1373157@gmail.com") return true;
  if (memberData?.role === "admin") return true;
  return Boolean(memberData?.isApproved);
}

/**
 * Filter wall posts by flower sticker tag
 */
export function filterPostsBySticker(posts: any[], sticker: string): any[] {
  if (!sticker || sticker === "all") return posts;
  return posts.filter(p => p.flowerSticker === sticker);
}
