"use client";

import { motion } from "framer-motion";
import { members } from "@/data/members";
import MemberCard from "@/components/MemberCard";

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
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

interface MembersContentProps {
  onSelectMember: (universityId: string | undefined) => void;
}

export default function MembersContent({ onSelectMember }: MembersContentProps) {
  return (
    <motion.div
      className="h-full overflow-y-auto sidebar-scroll"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <div className="px-6 py-8 md:px-10 md:py-12">
        <motion.h1
          variants={fadeUp}
          className="font-serif text-6xl md:text-7xl leading-[0.95] tracking-tight text-black"
        >
          Members
        </motion.h1>

        <motion.div
          variants={fadeUp}
          className="w-[120px] h-[2px] bg-black mt-8 mb-6"
        />

        <motion.p
          variants={fadeUp}
          className="font-serif text-xl italic text-[var(--ink-wash-700)] mb-10"
        >
          Faculty and researchers of the JUNK Consortium
        </motion.p>

        {/* Members grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
          {members.map((member, i) => (
            <MemberCard
              key={member.id}
              member={member}
              index={i}
              onSelect={onSelectMember}
            />
          ))}
        </div>

        {/* Footer attribution */}
        <motion.p
          variants={fadeUp}
          className="text-[10px] text-[var(--ink-wash-500)] font-mono tracking-wider mt-16 pb-8"
        >
          JUNK CONSORTIUM &mdash; MEMBERS DIRECTORY
        </motion.p>
      </div>
    </motion.div>
  );
}
