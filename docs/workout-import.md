# Workout text import

Import is beside Export on the workouts page. Choose or drop one UTF-8 `.txt` export (maximum 1 MiB, 100 workouts, 100 exercises per workout, 100 sets per exercise). Review the proposed cards, edit dates, remove unwanted workouts, and save.

The entire drop card opens the native file picker, including via keyboard. After all selected workouts save successfully, the page reloads to fetch persisted workouts and exercises. Partial failures keep the overlay open without reloading.

## Assumptions and decisions

- Dates are preserved and editable, per user instruction. Past dates are allowed.
- Export years with two digits are interpreted as 2000–2099. Weekday labels are informational; the numeric date determines scheduling.
- Imported status and set completion are discarded: these are new scheduled workouts with incomplete sets.
- Exercise names match case-insensitively against accessible catalog entries of the same exercise type. Unknown or ambiguous names block saving for that workout; remove it or correct the source file. Automatic exercise creation remains a product decision because the export does not contain target muscle information.
- Imports add records without overwriting existing workouts. Reimporting a file can create duplicates; users are warned before saving.
- Derived cardio pace and speed are accepted but recomputed from duration and distance by the app. Fields absent from the export cannot be restored (templates, notes, intensity, heart rate, resistance, incline, exercise IDs).

## File management and security

The browser reads the file locally. The original file is not modified, uploaded, retained in storage, or logged. Parsed exercise names are rendered as escaped React text. Extension, size, numeric dates, metrics, and structural limits are validated; malformed files fail as a whole. The file picker uses the operating system's standard dialog, including Windows Explorer on Windows.

Only Save writes workout data through the existing authenticated Supabase client and ownership controls. Exercise lookup explicitly limits results to shared exercises and the signed-in user's exercises. No new privileges, storage buckets, or schema changes are introduced.

Saving is sequential. Successfully saved workouts are removed from the preview and added to the page immediately, so a later failure leaves only unsaved previews to retry. A failed workout creation attempts to delete its incomplete parent record, using the account owner filter. Cleanup failure is surfaced explicitly. This is not a transactional batch: disconnects after a server write but before its response can leave an uncertain result; refresh and inspect the schedule before retrying in that case.
