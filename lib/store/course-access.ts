/** Public recovery help, not enrollment or an entitlement check. */
export const COURSE_ACCESS = {
  "inner-work": { productId: "699f939f4346b061ac834235", title: "Inner-Work Integration Course" },
  "first-step": { productId: "6a4eb9eb6630447c7bd80f0d", title: "First Step Through the Veil" },
} as const;

export type CourseAccessKey = keyof typeof COURSE_ACCESS;

export function courseAccessHref(key: CourseAccessKey): string {
  // Absolute www route also works from the store hostname and preview builds.
  return `https://www.truthjblue.com/store/course-access?course=${key}`;
}

export function getCourseAccessHelp(key: string | string[] | undefined) {
  if (typeof key !== "string" || !Object.hasOwn(COURSE_ACCESS, key)) return null;
  const course = COURSE_ACCESS[key as CourseAccessKey];
  return {
    ...course,
    supportHref: `mailto:support@truthjblue.com?subject=${encodeURIComponent(`Course access: ${course.title}`)}`,
  };
}
