"use client";

import { motion } from "framer-motion";
import { universities } from "@/data/mock";

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const countryCount = new Set(universities.map((u) => u.country)).size;
const disciplineCount = new Set(universities.flatMap((u) => u.disciplines)).size;

const stats = [
  { value: String(countryCount), label: "Countries" },
  { value: String(universities.length), label: "Universities" },
  { value: String(disciplineCount), label: "Disciplines" },
  { value: "400+", label: "Worlds Built" },
];

export default function AboutContent() {
  return (
    <motion.div
      className="h-full overflow-y-auto sidebar-scroll"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <div className="px-10 py-12 max-w-[640px]">
        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="font-serif text-6xl md:text-7xl leading-[0.95] tracking-tight text-black"
        >
          World
          <br />
          Building
        </motion.h1>

        {/* Divider */}
        <motion.div
          variants={fadeUp}
          className="w-[120px] h-[2px] bg-black mt-8 mb-6"
        />

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="font-serif text-xl italic text-[#888] mb-10"
        >
          A definition for the JUNK Consortium
        </motion.p>

        {/* Body paragraph 1 */}
        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-black mb-6"
        >
          World Building is a system that supports the unique capability of
          co-creation to gather knowledge, prototype, develop and deliver ideas
          that create change.
        </motion.p>

        {/* Body paragraph 2 */}
        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-black mb-6"
        >
          Its foundation in storytelling creates a shared language that
          facilitates collaboration across multiple disciplines that do not
          traditionally work together, vastly expanding possible solutions to
          complex problems.
        </motion.p>

        {/* Body paragraph 3 */}
        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-black mb-10"
        >
          It uses the collective imagination to translate complexity into
          comprehension.
        </motion.p>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          className="flex gap-0 mb-10"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 border-t-2 border-black pt-4 pr-6"
            >
              <span className="font-serif text-4xl text-black block">
                {stat.value}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#888] font-bold mt-1 block">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Body paragraph 4 */}
        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-black mb-6"
        >
          JUNK and the Junk Consortium are a research laboratory for a wide
          range of disciplines and cultures&mdash;from politics to anthropology,
          economics to journalism, media to medicine, science, art and
          design&mdash;in a global education initiative within schools on 4
          continents.
        </motion.p>

        {/* Body paragraph 5 */}
        <motion.p
          variants={fadeUp}
          className="text-sm leading-relaxed text-black mb-12"
        >
          The Junk Consortium continues to educate participants&mdash;in the
          past 3 years over 200 students&mdash;to use new muscle memory and
          collaborative tools to support their work with a powerful platform:
          world building.
        </motion.p>

        {/* Attribution */}
        <motion.p
          variants={fadeUp}
          className="text-[10px] text-[#AAA] font-mono tracking-wider"
        >
          draft.ff &mdash; AM 06252024
        </motion.p>
      </div>
    </motion.div>
  );
}
