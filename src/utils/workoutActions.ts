import { deleteWorkout } from '../services/workoutService';

export async function confirmAndDeleteWorkout({
  workoutId,
  userId,
  confirmationMessage = 'Delete this workout?',
}: {
  workoutId: string;
  userId: string;
  confirmationMessage?: string;
}): Promise<{ deleted: boolean; error: string | null }> {
  const confirmed = window.confirm(confirmationMessage);
  if (!confirmed) {
    return { deleted: false, error: null };
  }

  const { error } = await deleteWorkout(workoutId, userId);
  if (error) {
    return { deleted: false, error };
  }

  return { deleted: true, error: null };
}
