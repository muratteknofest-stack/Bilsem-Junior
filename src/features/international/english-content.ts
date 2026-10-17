export const ENGLISH_AREAS = [
  {id:'mirror_reflection',title:'Mirror thinking',skill:'Spatial reasoning',description:'See how patterns change when left and right swap places.',icon:'↔'},
  {id:'figure_completion',title:'Pattern detective',skill:'Logical reasoning',description:'Find the rule connecting the rows and complete the missing tile.',icon:'◇'},
  {id:'visual_memory',title:'Memory explorer',skill:'Visual memory',description:'Study a colourful pattern, hide it, then recognise it again.',icon:'▦'},
  {id:'shadow_matching',title:'Shape spotter',skill:'Visual attention',description:'Compare outlines and gaps to discover the matching silhouette.',icon:'◒'},
  {id:'spatial_relationship',title:'Layer explorer',skill:'Spatial reasoning',description:'Follow overlapping crayons and work out their order.',icon:'✦'},
] as const;
export type EnglishArea = typeof ENGLISH_AREAS[number]['id'];
export type EnglishLevel = 1|2|3|4;
export const ENGLISH_LEVELS = [
  {id:1,label:'Level 1 · Explorer',description:'Small patterns and simple comparisons.'},
  {id:2,label:'Level 2 · Detective',description:'More details and a little more to remember.'},
  {id:3,label:'Level 3 · Thinker',description:'Larger patterns and changing rules.'},
  {id:4,label:'Level 4 · Pathfinder',description:'Detailed patterns and deeper spatial challenges.'},
] as const;
export const ENGLISH_BRAND = {
  title:'ThinkHarbor — Think, Play, Discover',
  headline:'Big discoveries start with curious minds.',
  description:'Explore visual reasoning, logical thinking, attention and memory through colourful puzzles. Choose your level, practise at your own pace, and discover how each answer works.',
  disclaimer:'These activities are for practice and enjoyment. They are not an IQ test, a diagnosis, or a standardised assessment. No increase in intelligence or exam success is guaranteed.',
};
export const ENGLISH_INFO = {
  privacy:{title:'Privacy & account data',paragraphs:[
    'Parents can open Family account data in My account to download their family data, submit a deletion request and check its status. Deletion requests are reviewed before accounts are removed; submitting a request does not immediately delete data. Keep exported JSON files private.',
    'You can play guest practice without an account. Guest summaries are stored in this browser and are not uploaded. Shared-device summaries may include more than one learner. This application does not use advertising or marketing analytics.',
    'Family accounts use a parent email, a student nickname, a practice level and separate passwords. A managed student code is created so the child does not need a personal email. Authentication is handled by Supabase. Account profiles, guardian acknowledgements, study answers, session results and progress are stored on the server. Passwords are handled by the authentication provider; do not send them to support.',
    'Account practice is synchronised across devices through the same account used by BİLSEM Junior. A parent can view only their linked students and can open a student session or reset a student password. Returning from student practice to the parent dashboard requires the parent password. Guest practice does not add account XP.',
    'The hosting service receives ordinary website requests and may process technical information such as IP addresses for delivery and security. Local progress does not mean that the website makes no technical network requests.',
    'Use “Clear device progress” in the guest family area to remove local guest summaries. Use Family account data in My account for a cloud data export or deletion request. You can also contact support from your registered parent email; account ownership must be verified. Closing a private-browsing session or clearing browser storage may also remove progress. Clearing browser storage does not delete cloud account data.',
    'Support email: zeka.kupu.test@gmail.com. Please do not send passwords or a child’s identifying information. Quantum tech is the operator’s stated brand, not a verified company name. The operator’s complete legal identity, postal address and final international data policies are still being prepared. This notice is not a claim of legal compliance.',
  ]},
  terms:{title:'Practice terms',paragraphs:[
    'ThinkHarbor offers free family accounts with a dedicated 4,000-puzzle visual bank with English instructions and explanations and 300 separate guest puzzles across four activity levels. It does not offer a paid subscription, cryptocurrency payment, certificate or official intelligence score.',
    'The activities are independent educational practice. They have no affiliation with an examination authority, school or government programme. Practice levels are activity levels, not placement decisions or an exact mapping to a country’s school grades.',
    'Account answers and XP are checked and saved on the server. Completed account sessions can be reviewed later and progress is shared across languages. Guest scoring is calculated on this device only; it does not earn account rewards.',
    'Read instructions together if needed, take breaks and stop if a child is uncomfortable. Difficulty can be changed freely; performance should not be used to label a child’s intelligence.',
    'This application may change as it is tested. Commercial terms and country-specific requirements must be completed before any paid release. Contact zeka.kupu.test@gmail.com to report a problem.',
  ]},
  help:{title:'Help & family guide',paragraphs:[
    'To start a family account, a parent creates the account and confirms their email. Sign in as a parent and choose Open student practice once; this securely enables student code sign-in. Afterwards the student can sign in using their code and separate password. To return from student practice to the family dashboard, use the parent password.',
    'Choose one of four activity levels. If the puzzles feel frustrating, try an earlier level. If they feel easy, move to a later one. Suggested audience: children around 6–10, with adult help where appropriate.',
    'Guest practice has five puzzles and an optional ten-puzzle challenge. Account practice has five puzzles and a one-hour session deadline. Account challenges contain 15, 30 or 45 puzzles with a practice timer shown on screen. The timer is a practice tool, not an intelligence measurement.',
    'Read the instruction, compare all four choices and select an answer. Account and guest practice show feedback before you move on. Account challenges reveal answers only after finishing. In memory activities, study the pattern first and press “Hide pattern & answer”.',
    'The review shows correct choices and explanations after finishing. Unanswered puzzles are marked as blank. Account results are saved on the server. Use My account to resume an active English session or review a completed one. Guest summaries are saved to this browser if storage is available.',
    'Keyboard users can use Tab to reach a choice and Enter or Space to select it. The puzzles combine colours with distinct geometric marks. No sound is needed. The site respects reduced-motion preferences.',
    'To report a problem, email the puzzle ID, level and a description to zeka.kupu.test@gmail.com. Avoid including a child’s name, account credentials or personal information.',
  ]},
} as const;
