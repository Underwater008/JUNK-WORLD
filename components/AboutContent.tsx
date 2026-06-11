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
      className="h-full overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <div className="relative h-full px-5 pt-5 md:px-12 md:pt-7">
        <section className="relative z-20 mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.img
            variants={fadeUp}
            src="/images/JUNK logos/JUNK-logo.gif"
            alt="JUNK"
            className="h-32 md:h-40 lg:h-44"
          />

          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-[36rem] text-balance font-serif text-[1.05rem] leading-[1.16] text-black md:mt-6 md:text-[1.35rem] lg:text-[1.5rem]"
          >
            JUNK is a research laboratory and global education initiative
            connecting disciplines, cultures, and schools through world
            building.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 hidden md:flex md:items-stretch lg:mt-8"
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`px-7 text-center lg:px-10 ${
                  index > 0 ? "border-l border-black/20" : ""
                }`}
              >
                <span className="block font-serif text-[2rem] leading-none text-black lg:text-[2.5rem]">
                  {stat.value}
                </span>
                <span className="mt-1.5 block whitespace-nowrap text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[var(--ink-wash-900)] lg:text-[0.7rem]">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-3 md:hidden"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="relative border-t-2 border-black pt-1.5 text-left"
              >
                <span className="absolute right-0 top-[-5px] h-2 w-2 rounded-full bg-black" />
                <span className="block font-serif text-[1.55rem] leading-none text-black">
                  {stat.value}
                </span>
                <span className="mt-0.5 block text-[0.58rem] font-bold uppercase leading-tight text-[var(--ink-wash-900)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </section>
      </div>
    </motion.div>
  );
}
