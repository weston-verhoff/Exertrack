export function getLegacyRunnerRedirect(workoutId?: string) {
  return workoutId ? `/workout/${workoutId}` : '/';
}
