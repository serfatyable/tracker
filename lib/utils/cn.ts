/**
 * Utility function to conditionally join classNames together.
 * Filters out falsy values (false, null, undefined) and joins the rest with spaces.
 *
 * @param classes - Array of class names or conditional values
 * @returns Joined string of valid class names
 *
 * @example
 * cn('base-class', condition && 'conditional-class', 'another-class')
 * // => 'base-class conditional-class another-class' (if condition is true)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
