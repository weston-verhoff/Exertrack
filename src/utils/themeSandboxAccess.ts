export function canAccessThemeSandbox(user: { email?: string } | null | undefined): boolean {
  return user?.email?.trim().toLowerCase() === 'westonverhoff@gmail.com';
}
