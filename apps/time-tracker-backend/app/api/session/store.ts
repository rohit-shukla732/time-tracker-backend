// Persist session starts in a global so the array survives HMR in dev
type SessionRecord = any;
const GLOBAL_KEY = '__ace_ems_session_store__';
const g: any = globalThis as any;
if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = [] as SessionRecord[];
}
export const sessionStore: SessionRecord[] = g[GLOBAL_KEY];

export default sessionStore;
