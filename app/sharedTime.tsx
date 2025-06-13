export let time: 'morning' | 'noon' | 'night' | null = null;

export default function setTime(newTime: typeof time) {
  time = newTime;
}
