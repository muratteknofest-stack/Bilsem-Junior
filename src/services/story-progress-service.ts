import { emptyStoryProgress, parseStoryProgress, storyStorageKey, type StoryProgress } from '../features/student/story-adventure';
export function readStoryProgress(userId:string,grade:number):StoryProgress {
  try{return parseStoryProgress(localStorage.getItem(storyStorageKey(userId,grade)));}catch{return emptyStoryProgress();}
}
export function saveStoryProgress(userId:string,grade:number,progress:StoryProgress):boolean {
  try{localStorage.setItem(storyStorageKey(userId,grade),JSON.stringify(progress));return true;}catch{return false;}
}
