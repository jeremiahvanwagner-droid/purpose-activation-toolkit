import type { Metadata } from "next";
import Link from "next/link";
import { COURSE_ACCESS, courseAccessHref, getCourseAccessHelp } from "@/lib/store/course-access";

export const metadata: Metadata = {
  title: "Course access help",
  description: "Help finding access to a Truth J Blue course you have purchased.",
  robots: { index: false, follow: true },
};

export default async function CourseAccessPage({ searchParams }: {
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const course = getCourseAccessHelp((await searchParams).course);
  return (
    <div className="st-container st-section">
      <div className="st-head">
        <div>
          <p className="st-kicker">Already purchased?</p>
          <h1 className="st-h2">Find your course access</h1>
          {course ? <p className="st-product-tag">{course.title}</p> : null}
        </div>
      </div>
      <div className="st-prose">
        <p>If you received a course invitation, open the course portal link in that email and use the email address you used at checkout. Check your spam folder too.</p>
        <p>The course portal has its own sign-in. Signing in to the Truth J Blue website or Toolkit does not sign you in to the course portal.</p>
        <p>If you cannot find an invitation or cannot open your course, contact us for access help. Include the course name and your order reference if you have it. Do not send a password or payment-card details.</p>
        <p>You do not need to purchase the course again to request help.</p>
        {course ? (
          <p><a className="st-btn st-btn-primary" href={course.supportHref}>Get help with this course</a></p>
        ) : (
          <ul>{Object.entries(COURSE_ACCESS).map(([key, value]) => (
            <li key={key}><Link href={courseAccessHref(key as keyof typeof COURSE_ACCESS)}>{value.title}</Link></li>
          ))}</ul>
        )}
        <p>Your personalized Divine Alignment Blueprint opens separately at <a href="https://www.truthjblue.com/store/blueprint">Open your Blueprint</a>.</p>
      </div>
    </div>
  );
}
