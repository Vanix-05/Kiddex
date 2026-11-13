/**
 * KIDDEX theme: the single source of truth for colors, fonts and sizing.
 *
 * `applyTheme()` (called once in main.tsx) writes every token below to a CSS
 * variable on <html>, e.g. `colors.buttonBg` -> `--color-button-bg`.
 * Stylesheets should only ever use those variables, never raw hex values.
 *
 * Contrast ratios (WCAG 2.x) are noted next to text/indicator colors.
 */
export const theme = {
  colors: {
    // Scene
    sky: '#A9DCF2',
    skyLight: '#D3EEF9',
    sea: '#6CC2E8',
    seaDeep: '#4FAEDB',

    // Card
    cardBg: '#FCF4E6',
    cardBorder: '#6B4A33',
    titlePillBg: '#F9DC9A',
    titleRays: '#F0A050',

    // Text
    text: '#4A3426', // 10.6:1 on cardBg
    textMuted: '#5C4636', // 8.1:1 on cardBg
    textSubtle: '#735A48', // 5.9:1 on cardBg
    link: '#9A4A16', // 5.7:1 on cardBg

    // Buttons: keep the mockup's soft orange and use dark brown text.
    buttonBg: '#F0A050',
    buttonBgHover: '#F3B068',
    buttonBorder: '#C77A36',
    buttonText: '#4A2A12', // 6.0:1 on buttonBg (AA)
    buttonDisabledBg: '#F2DEC6',
    buttonDisabledText: '#8C7360',

    // Inputs
    inputBg: '#FFFBF4',
    // Light border to match the mockup. Note: 1.9:1, below the WCAG 3:1
    // guideline for field outlines. The focused field gets a dark border + ring.
    inputBorder: '#C9B49E',
    inputBorderFocus: '#6B4A33',
    inputPlaceholder: '#7A6150', // 5.6:1 on inputBg (AA)
    inputIcon: '#6B4A33',

    // Selection (border + check badge). The badge and scale-up mean the
    // selected state never relies on color alone.
    selected: '#BF5A16', // ≥3:1 on cream and pink card backgrounds
    // Keyboard focus ring: the theme's deep orange (4.2:1 on the cream cards,
    // 3:1 on the sky), so it stays visible next to the soft orange buttons.
    focusRing: '#BF5A16',

    // Option card backgrounds
    tintLavender: '#DCD6F2',
    tintPink: '#F9D9D3',
    tintPeach: '#F9E4CB',
    tintPeriwinkle: '#DCDDF5',
    labelPillBg: '#FFF8EE',

    // "I'm a Teacher" button on the Welcome card (lavender)
    teacherButtonBg: '#DEDCF5',
    teacherButtonBgHover: '#E8E6FA',
    teacherButtonBorder: '#A9A3E0',
    teacherButtonEdge: '#8A83CC', // darker bottom edge

    // "Welcome, Student!" notebook popup
    notebookLine: '#EADCC9', // ruled lines on the paper
    notebookMargin: '#EBA59B', // thin red margin line
    tintMint: '#D6EEDC', // New Student photo
    newStudentButton: '#3A9156', // "Start here" (white text 3.9:1, large bold)
    newStudentButtonEdge: '#2B6E41',
    returningButton: '#7A70CC', // "Log in" (white text 4.2:1)
    returningButtonEdge: '#5D53B0',
    textOnDark: '#FFFFFF',

    // Notebook pages (School ID, one-time code, PIN code)
    stickyNote: '#F6EFE2', // step notes not reached yet
    stickyNoteOn: '#FFD89C', // the current step's note
    padlockBody: '#F6C94B', // Create PIN code page
    padlockShackle: '#C9A93A',
    videoBackdrop: '#000000', // behind the full-screen loading video

    // Ollie's flying wings (School ID transition)
    ollieWingFill: '#DCA26F',
    ollieWingLine: '#A8713F',
    ollieWingSpot: '#F6DCB6',

    // Student login storybook (the closed cover = the "Welcome, Student!" popup)
    storyCover: '#7A2634', // maroon hardcover
    storyCoverEdge: '#3F1019', // cover outline and bottom edge
    storyBoard: '#5F1B28', // inside of the boards, around the pages
    storyGold: '#E9C25A', // gold frame, bands and corner pieces
    storyGoldText: '#F6D27A', // gold words on the cover (6.9:1 on storyCover)
    // Ollie's live layers (StoryBook/OllieLive)
    ollieFace: '#FEF3E2', // eyelids
    ollieMouth: '#8A3A1C', // inside of the open beak

    // The desk under the setup storybook (screens/Setup/Desk), until the bedroom comes.
    deskWood: '#A8703F',
    deskWoodMid: '#8C5A31',
    deskWoodDark: '#7A4C29',
    deskPlankGap: 'rgba(52, 26, 10, 0.55)', // dark line between planks
    deskPlankShine: 'rgba(255, 220, 170, 0.12)', // light edge under it
    deskGrainLight: 'rgba(255, 235, 200, 0.05)',
    deskGrainDark: 'rgba(70, 36, 14, 0.07)',
    deskLamp: 'rgba(255, 214, 150, 0.42)', // lamp glow, top-left
    deskVignette: 'rgba(30, 14, 4, 0.55)', // darker edges
    deskPropShadow: 'rgba(30, 14, 4, 0.35)',
    pencilBody: '#F6C453',
    pencilStripe: '#E0A93A',
    pencilWood: '#F3D9B1',
    eraserPink: '#F7A9A0',
    eraserBlue: '#7FB7D9',

    // Storybook setup screens
    stickerFill: '#FFFFFF', // white fill of the bubbly sticker text

    // Logo
    logoOrange: '#F08A4B',
    logoOutline: '#FFF6E8',
    logoShadow: '#E2B48A',

    // Teacher planner (paper, lines and margin reuse cardBg / notebookLine /
    // notebookMargin; text reuses text / textMuted / textSubtle).
    plannerCover: '#9A6542',
    plannerCoverDark: '#5A3923', // cover border
    plannerSpine: '#7E5134',
    plannerRing: '#8C8F96', // metal spiral
    plannerRingLight: '#D9DCE1',
    plannerInk: '#3E2A1E', // dark chips and active pills
    highlightBlue: '#CFE5F6', // "My class this week" highlighter
    tabYellow: '#F8DD8C',
    tabPink: '#F6C9CF',
    tabCoral: '#F1AA9C',
    tabNew: '#E6EEEA',
    bookmarkRed: '#C9483A', // white text 4.7:1
    bookmarkRedEdge: '#9C352B',
    bookmarkGreen: '#6CB874',
    bookmarkGreenEdge: '#4B8F55',
    bookmarkActiveEdge: '#C77A36',
    okText: '#2F7A45', // 5.0:1 on cream
    okBg: '#E3F3E5',
    okLine: '#8FCB9B',
    okFill: '#4E9F62',
    warnText: '#9A4A16', // "to check", "Not yet" (= link color)
    warnBg: '#FDE3C6',
    warnLine: '#F0B37A',
    infoText: '#2F6E99', // "Assigned" (5.3:1 on its chip)
    infoBg: '#E2F0FA',
    infoLine: '#9CC8E6',
    neutralBg: '#F2E8DA',
    neutralLine: '#D9C7AF',
    dangerText: '#B33A2E', // low % and Delete (5.6:1 on cream)
    barRed: '#E8918A',
    barYellow: '#F2C46B',
    barGreen: '#9ED4A0',
    barTrack: '#EDE2D2',
    aiText: '#5D53B0', // the "AI" tag (= returningButtonEdge)
    aiBg: '#E8E5FA',
    aiLine: '#B9B2EC',
    stickyYellow: '#FCF0A6', // Ollie's note
    tape: '#F3C78E',
    tapeBlue: '#BFDDF2',
    codeYellow: '#FBEBA0', // one-time code chip
    gridLine: '#EAF0E6', // the class record's grid paper
    gridPaper: '#FFFDF6',
    sheetBorder: '#D9C3A3',
    clip: '#2B2A2E', // binder clips

    // Main Lobby (the classroom): the HUD and cards over the game canvas.
    // Borders reuse cardBorder, text reuses text / textMuted, orange reuses the buttons.
    lobbySea: '#7FCBE6', // behind the canvas (same as the game's background)
    lobbyWood: '#D79A5C', // the Student card's wooden board
    lobbyWoodEdge: '#C3854A',
    lobbyChip: '#FFFFFF', // white chips, round icons and bubbles
    lobbyShadow: 'rgba(91, 58, 34, 0.22)', // flat drop shadow under buttons
    lobbyDim: 'rgba(70, 45, 25, 0.45)', // behind an open card
    lobbyHint: 'rgba(63, 38, 20, 0.85)', // the "WASD or click to walk" hint (white text 11:1)
    lobbyPin: '#EF6F5E', // the mission note's pin
    lobbyOnline: '#58B56A', // the green dot on name tags
    lobbyOnlineEdge: '#2F7A3F',
    lobbyXp: '#8BC97A', // XP bar stripes
    lobbyXpStripe: '#7DBB6C',
    lobbyKeyEdge: '#C8B39C', // bottom edge of a keyboard key

    // Mini games (src/games). Quiz Show is purple, Match Up is teal.
    gameQuiz: '#7F74D6', // chip square, board frame, podium
    gameQuizEdge: '#5D53B0',
    gameQuizSoft: '#E8E5FA', // board header row
    gameMatch: '#3FB3A0',
    gameMatchEdge: '#2A8C7C',
    gameMatchSoft: '#D3F1EA',
    gameBulb: '#FFE07A', // marquee bulbs, footlights
    gameBulbEdge: '#E0B23C',
    // Answer letters: A orange, B green, C purple, D blue (white letters, large bold)
    gameLetterA: '#EE9A45',
    gameLetterB: '#4FAE66',
    gameLetterC: '#8A7DE0',
    gameLetterD: '#4A9BE0',
    gameRight: '#4E9F62', // right answer border, dots (= okFill)
    gameRightBg: '#E3F3E5',
    gameRightPill: '#3A8A50', // "Right answer" pill (white text 4.6:1)
    gameWrong: '#E8655A', // coral: a wrong pick, its X, dots
    gameWrongBg: '#FDE6E1',
    gameCurrent: '#F2C14E', // the current progress dot's ring
    gameStar: '#F7C948',
    gameStarEdge: '#B98A1A',
    gameStarPale: '#EFE5CF',
    gameXpNew: '#F7D154', // new XP stripes
    gameXpNewStripe: '#EDBB32',
    gameSpotlight: 'rgba(255, 246, 214, 0.55)',
    gameShadow: 'rgba(74, 52, 38, 0.22)', // soft floor shadows
    gameDim: 'rgba(60, 40, 25, 0.5)', // behind the Pause card
    // Theater stage
    stageCurtain: '#E0584E',
    stageCurtainDark: '#B8413A',
    stageCurtainLight: '#EF7D70',
    stageGold: '#F2C14E',
    stageGoldDark: '#C9952E',
    stageWall: '#C8C0EE',
    stageWallLight: '#DCD6F7',
    stageFloor: '#E6BC88',
    stageFloorDark: '#C99560',
    stageRug: '#A79DE6',
    stageRugEdge: '#8F84D9',
    stageFootBase: '#7A5338',
    // Match Corner room
    roomWall: '#FBEBD3',
    roomPanel: '#F1D6AE',
    roomPanelLine: '#DDB988',
    roomFloor: '#EBC48E',
    roomFloorLine: '#D7A86E',
    roomRug: '#7FD0BE',
    roomRugLight: '#A2DFD0',
    roomWindow: '#FFFDF7',
    corkBoard: '#E3B67E',
    corkDot: '#D29E62',
    woodFrame: '#C98A4B',
    woodFrameDark: '#9C6230',
    // Match Up pair colors: card fill + yarn
    pairTeal: '#D3F1EA',
    pairTealYarn: '#2FA593',
    pairPink: '#FBDCE6',
    pairPinkYarn: '#E2668F',
    pairYellow: '#FCEFB4',
    pairYellowYarn: '#D9A920',
    pairBlue: '#D7EAFB',
    pairBlueYarn: '#3E8FD6',
    pairPurple: '#E5DFFA',
    pairPurpleYarn: '#8073D9',
    yarnPicked: '#EE9A45', // the yarn hanging from a picked card
  },

  fonts: {
    body: "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif",
    display: "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif",
  },

  radii: {
    sm: '12px',
    md: '18px',
    lg: '24px',
    xl: '36px',
    pill: '999px',
  },

  sizes: {
    tapTarget: '48px', // minimum height/width for anything tappable
    controlHeight: '56px', // buttons and inputs
    cardBorder: '3px',
    inputBorder: '1.5px',
    // Sun in the scene background. Shared so layouts can keep clear of it.
    sun: 'clamp(110px, min(13vw, 20vh), 210px)',
    sunInset: '4vw',
  },

  shadows: {
    card: '0 10px 0 rgba(107, 74, 51, 0.12), 0 18px 40px rgba(60, 110, 140, 0.18)',
    button: '0 4px 0 #C77A36',
  },
} as const

/** camelCase -> kebab-case, e.g. buttonBg -> button-bg */
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

const prefixes: Record<keyof typeof theme, string> = {
  colors: 'color',
  fonts: 'font',
  radii: 'radius',
  sizes: 'size',
  shadows: 'shadow',
}

/** Writes all theme tokens to CSS variables on the root element. */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const group of Object.keys(theme) as (keyof typeof theme)[]) {
    for (const [key, value] of Object.entries(theme[group])) {
      root.style.setProperty(`--${prefixes[group]}-${kebab(key)}`, value)
    }
  }
}
