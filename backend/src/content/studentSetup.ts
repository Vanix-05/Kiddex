// What a Student may save as their setup and look. These lists are COPIES of the
// frontend's and must match them (`npm run test-students` compares them when the
// frontend folder is next to the backend):
//   AVATARS       → frontend/src/setup/avatar.ts        (Avatar)
//   BUDDY_IDS     → frontend/src/setup/quizData.ts      (buddyIds)
//   MAX_NICKNAME  → frontend/src/setup/petData.ts       (MAX_NICKNAME, cleanNickname)
//   LOOK_ITEMS    → frontend/src/setup/customizeData.ts (ITEMS: skin, hair, shirt, youExtra, buddyColor, buddyExtra)
// Change both sides together.

export const AVATARS = ["boy", "girl"] as const;

export const BUDDY_IDS = ["otter", "fox", "kitty", "axolotl", "dog", "monkey", "raccoon", "ram"] as const;

/** A buddy name: letters and spaces only, at most this many characters (trimmed; empty = the buddy's own name). */
export const MAX_NICKNAME = 12;

/** Every Customize Bridge item id, per look key (same as frontend/src/setup/customizeData.ts). Nothing is locked. */
export const LOOK_ITEMS = {
  skin: ["skin1", "skin2", "skin3", "skin4", "skin5", "skin6", "skin7"],
  hair: ["brown", "black", "dark", "ginger", "blond", "purple"],
  shirt: ["yellow", "blue", "mint", "pink", "purple", "red"],
  youExtra: ["none", "glasses", "starClip", "flower"],
  buddyColor: ["original", "pink", "blue", "mint", "purple", "gold"],
  buddyExtra: ["none", "scarf", "bow", "flower"],
} as const;

export type LookKey = keyof typeof LOOK_ITEMS;
