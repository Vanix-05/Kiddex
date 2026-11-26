// What a Student may save as their setup and look. These lists are COPIES of the
// frontend's and must match them (`npm run test-students` compares them when the
// frontend folder is next to the backend):
//   AVATARS       → frontend/src/setup/avatar.ts        (Avatar)
//   BUDDY_IDS     → frontend/src/setup/quizData.ts      (buddyIds)
//   MAX_NICKNAME  → frontend/src/setup/petData.ts       (MAX_NICKNAME, cleanNickname)
//   LOOK_ITEMS    → frontend/src/setup/customizeData.ts (ITEMS: every look key; bottomColor and shoesColor share shirt's)
// Change both sides together.

export const AVATARS = ["boy", "girl"] as const;

export const BUDDY_IDS = ["otter", "fox", "kitty", "axolotl", "dog", "monkey", "raccoon", "ram"] as const;

/** A buddy name: letters and spaces only, at most this many characters (trimmed; empty = the buddy's own name). */
export const MAX_NICKNAME = 12;

/** Every Customize Bridge item id, per look key (same as frontend/src/setup/customizeData.ts). Nothing is locked. */
const CLOTH_COLORS = ["yellow", "red", "rose", "blue", "teal", "green", "grey", "peach", "pink", "purple", "navy", "mint", "white", "charcoal"] as const;

export const LOOK_ITEMS = {
  skin: ["skin1", "skin2", "skin3", "skin4", "skin5", "skin6", "skin7"],
  /** Hair color. */
  hair: ["brown", "black", "ginger", "platinum", "purple", "dark", "auburn", "blond", "pink", "blue"],
  /** Top color (bottomColor and shoesColor use the same colors). */
  shirt: CLOTH_COLORS,
  hairStyle: ["bob", "soft", "bangs", "pigtails", "bald", "classic", "sideswept", "curly", "curtain"],
  eyes: ["round", "sparkly", "lashes"],
  eyeColor: ["brown", "black", "blue", "green", "amber", "grey", "violet"],
  top: ["polo", "blouse", "layered", "hoodie"],
  bottom: ["skirt", "shorts", "pants", "cargo"],
  bottomColor: CLOTH_COLORS,
  shoes: ["maryjanes", "school", "sneakers", "sandals"],
  shoesColor: CLOTH_COLORS,
  youExtra: ["none", "glasses", "starClip", "flower"],
  buddyColor: ["original", "pink", "blue", "mint", "purple", "gold"],
  buddyExtra: ["none", "scarf", "bow", "flower"],
} as const;

export type LookKey = keyof typeof LOOK_ITEMS;
