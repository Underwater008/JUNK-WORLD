"use client";

import type {
  ProjectFacultySubmitter,
  ProjectStudent,
} from "@/types";

interface ContributorsFormProps {
  facultySubmitters: ProjectFacultySubmitter[];
  students: ProjectStudent[];
  onFacultyChange: (submitters: ProjectFacultySubmitter[]) => void;
  onStudentsChange: (students: ProjectStudent[]) => void;
  disabled?: boolean;
  /** Headline & description tuned to the entity. Defaults to project copy. */
  entity?: "project" | "world";
}

const inputClass =
  "w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-black disabled:bg-black/[0.03] disabled:text-black/45";

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45";

const sectionHeading =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55";

const addButtonClass =
  "rounded-md border border-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40";

const removeButtonClass =
  "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-black/35 transition hover:bg-black/5 hover:text-black/70 disabled:cursor-not-allowed disabled:opacity-40";

export default function ContributorsForm({
  facultySubmitters,
  students,
  onFacultyChange,
  onStudentsChange,
  disabled = false,
  entity = "project",
}: ContributorsFormProps) {
  const headline =
    entity === "world" ? "Who made this world?" : "Who made this project?";
  const description =
    entity === "world"
      ? "Add the faculty member(s) submitting on behalf of the class, and the students who built this world along with the skills they brought."
      : "Add the faculty member(s) submitting on behalf of the class, and the students who contributed along with the skills they brought to the project.";
  function updateFaculty(index: number, patch: Partial<ProjectFacultySubmitter>) {
    onFacultyChange(
      facultySubmitters.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry
      )
    );
  }

  function removeFaculty(index: number) {
    onFacultyChange(facultySubmitters.filter((_, i) => i !== index));
  }

  function addFaculty() {
    onFacultyChange([...facultySubmitters, { name: "", position: "" }]);
  }

  function updateStudent(index: number, patch: Partial<ProjectStudent>) {
    onStudentsChange(
      students.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  }

  function removeStudent(index: number) {
    onStudentsChange(students.filter((_, i) => i !== index));
  }

  function addStudent() {
    onStudentsChange([...students, { name: "", skills: "" }]);
  }

  return (
    <div className="space-y-8 border border-black/10 bg-[#FBF8F1] px-5 py-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
          Contributors
        </p>
        <h3 className="mt-2 font-serif text-2xl leading-tight text-black">
          {headline}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-6 text-black/60">
          {description}
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className={sectionHeading}>Faculty submitter(s)</h4>
          <button
            type="button"
            onClick={addFaculty}
            disabled={disabled}
            className={addButtonClass}
          >
            + Add faculty
          </button>
        </div>

        {facultySubmitters.length === 0 ? (
          <p className="text-sm text-black/45">
            No faculty added yet. Add at least one name + position so we know
            who submitted this project.
          </p>
        ) : (
          <div className="space-y-3">
            {facultySubmitters.map((entry, index) => (
              <div
                key={`faculty-${index}`}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Name</span>
                  <input
                    value={entry.name}
                    onChange={(event) =>
                      updateFaculty(index, { name: event.target.value })
                    }
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Full name"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Position</span>
                  <input
                    value={entry.position}
                    onChange={(event) =>
                      updateFaculty(index, { position: event.target.value })
                    }
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Professor, Course Lead, ..."
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeFaculty(index)}
                    disabled={disabled}
                    className={removeButtonClass}
                    aria-label="Remove faculty"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className={sectionHeading}>Students &amp; skills</h4>
          <button
            type="button"
            onClick={addStudent}
            disabled={disabled}
            className={addButtonClass}
          >
            + Add student
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-black/45">
            No students added yet. List each student name with the skills they
            represented (e.g. illustration, sound design, 3D).
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((entry, index) => (
              <div
                key={`student-${index}`}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]"
              >
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Name</span>
                  <input
                    value={entry.name}
                    onChange={(event) =>
                      updateStudent(index, { name: event.target.value })
                    }
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Student name"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Skills represented</span>
                  <input
                    value={entry.skills}
                    onChange={(event) =>
                      updateStudent(index, { skills: event.target.value })
                    }
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Animation, sound design, ..."
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeStudent(index)}
                    disabled={disabled}
                    className={removeButtonClass}
                    aria-label="Remove student"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
