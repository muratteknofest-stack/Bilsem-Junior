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
  title:'ZekaPark — Think, Play, Discover',
  headline:'Big discoveries start with curious minds.',
  description:'Explore visual reasoning, logical thinking, attention and memory through colourful puzzles. Choose your level, practise at your own pace, and discover how each answer works.',
  disclaimer:'These activities are for practice and enjoyment. They are not an IQ test, a diagnosis, or a standardised assessment. No increase in intelligence or exam success is guaranteed.',
};
export const ENGLISH_INFO = {
  privacy:{title:'Privacy & device data',paragraphs:[
    'The English preview does not ask for a child’s name, birth date, email, photo or location. No account is needed. This preview does not use advertising or marketing analytics.',
    'Completed practice summaries are stored in this browser when storage is available. They include the date, practice level, activity totals and answers counted as correct. They are not uploaded by this preview. Shared-device progress may include more than one learner.',
    'The hosting service receives ordinary website requests and may process technical information such as IP addresses for delivery and security. Local progress does not mean that the website makes no technical network requests.',
    'Use “Clear device progress” in the family area to remove this preview’s saved summaries. Closing a private-browsing session or clearing browser storage may also remove progress. This does not delete a separate Turkish account.',
    'Support email: zeka.kupu.test@gmail.com. Please do not send passwords or a child’s identifying information. Quantum tech is the operator’s stated brand, not a verified company name. The operator’s complete legal identity, postal address and final international data policies are still being prepared. This notice is not a claim of legal compliance.',
  ]},
  terms:{title:'Practice terms',paragraphs:[
    'This is a free English preview with 300 visual puzzles across four practice levels. It does not offer a paid subscription, cryptocurrency payment, certificate or official intelligence score.',
    'The activities are independent educational practice. They have no affiliation with an examination authority, school or government programme. Practice levels are activity levels, not placement decisions or an exact mapping to a country’s school grades.',
    'Scoring is calculated on this device for feedback. It does not earn rewards or change results in a Turkish student account. English preview progress is not synchronised between devices.',
    'Read instructions together if needed, take breaks and stop if a child is uncomfortable. Difficulty can be changed freely; performance should not be used to label a child’s intelligence.',
    'This preview may change as it is tested. Commercial terms and country-specific requirements must be completed before any paid release. Contact zeka.kupu.test@gmail.com to report a problem.',
  ]},
  help:{title:'Help & family guide',paragraphs:[
    'Choose one of four activity levels. If the puzzles feel frustrating, try an earlier level. If they feel easy, move to a later one. Suggested audience: children around 6–10, with adult help where appropriate.',
    'Quick practice has five puzzles and no time limit. A thinking challenge has ten puzzles and an optional ten-minute timer. The timer is a practice tool, not an intelligence measurement.',
    'Read the instruction, compare all four choices and select an answer. Feedback and an explanation appear before you move on. In memory activities, study the pattern first and press “Hide pattern & answer”.',
    'The review shows correct choices and explanations after finishing. Unanswered puzzles are marked as blank. A completed summary is saved to this browser, if browser storage is available.',
    'Keyboard users can use Tab to reach a choice and Enter or Space to select it. The puzzles combine colours with distinct geometric marks. No sound is needed. The site respects reduced-motion preferences.',
    'To report a problem, email the puzzle ID, level and a description to zeka.kupu.test@gmail.com. Avoid including a child’s name, account credentials or personal information.',
  ]},
} as const;
