export interface FriendPreset {
  id: string; // fallback UID or ID
  name: string;
  email: string;
  role: 'admin' | 'member';
  flowerEmoji: string;
  flowerTitle: string;
  avatarBg: string;
  avatarText: string;
  colorBorder: string;
  bio: string;
  status: string;
  favoriteFlower: string;
  birthday: string;
}

export const FOUR_FRIENDS: FriendPreset[] = [
  {
    id: "palak_bloom",
    name: "Palak",
    email: "palak.bloom@triobloom.app",
    role: "member",
    flowerEmoji: "🌸",
    flowerTitle: "Cherry Blossom",
    avatarBg: "bg-pink-100 text-pink-600 border-pink-300",
    avatarText: "P",
    colorBorder: "border-pink-200",
    bio: "Chief snack officer, weekend adventure planner & queen of sending 100 reels in 5 mins! 🌸",
    status: "Planning our next cafe date ✨",
    favoriteFlower: "Pink Cherry Blossoms",
    birthday: "April 14"
  },
  {
    id: "priya_bloom",
    name: "Priya",
    email: "priya.bloom@triobloom.app",
    role: "member",
    flowerEmoji: "💜",
    flowerTitle: "Lavender Orchid",
    avatarBg: "bg-purple-100 text-purple-600 border-purple-300",
    avatarText: "Pr",
    colorBorder: "border-purple-200",
    bio: "Aesthetic playlist curator, handwritten letter writer & designated group photographer 📸",
    status: "Brewing lavender tea & journaling 🪻",
    favoriteFlower: "Wild Lavender",
    birthday: "August 22"
  },
  {
    id: "hanshika_bloom",
    name: "Hanshika",
    email: "hanshika.bloom@triobloom.app",
    role: "member",
    flowerEmoji: "🌼",
    flowerTitle: "Buttercup Peony",
    avatarBg: "bg-amber-100 text-amber-600 border-amber-300",
    avatarText: "H",
    colorBorder: "border-amber-200",
    bio: "Unmatched hype energy, emergency comfort hugs & forever dancing to Bollywood throwbacks 💃",
    status: "Dancing to our friendship playlist 🎶",
    favoriteFlower: "Sunlit Buttercups",
    birthday: "November 5"
  },
  {
    id: "user_bloom",
    name: "You",
    email: "ps1373157@gmail.com",
    role: "admin",
    flowerEmoji: "🌷",
    flowerTitle: "Blooming Tulip",
    avatarBg: "bg-rose-100 text-rose-600 border-rose-300",
    avatarText: "U",
    colorBorder: "border-rose-200",
    bio: "Heart of the circle, memory keeper, and the glue holding our beautiful chaos together 💖",
    status: "Loving my besties forever and always 🌷",
    favoriteFlower: "Dutch Pastel Tulips",
    birthday: "Forever 21"
  }
];

export const FLOWER_STICKERS = [
  { id: "🌸 Bloom Moment", label: "Bloom Moment", emoji: "🌸" },
  { id: "🦋 Core Memory", label: "Core Memory", emoji: "🦋" },
  { id: "🎀 Heart-to-Heart", label: "Heart-to-Heart", emoji: "🎀" },
  { id: "☕ Hangout Story", label: "Hangout Story", emoji: "☕" },
  { id: "✨ Inside Joke", label: "Inside Joke", emoji: "✨" },
];

export const QUICK_EMOJIS = ["🌸", "🌷", "💖", "✨", "🎀", "🦋", "🥺", "☕", "🌼", "💐", "🫶", "🍰"];
