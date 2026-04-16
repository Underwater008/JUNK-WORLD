"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import MemberCard from "@/components/MemberCard";
import MemberEditor from "@/components/portal/MemberEditor";
import { PORTAL_READ_ONLY_MESSAGE } from "@/lib/portal/mode";
import type { Member, University } from "@/types";

const NEW_MEMBER_ID = "__new_member__";

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
  members: Member[];
  universities: University[];
  onSelectMember: (universityId: string | undefined) => void;
  editorUnlocked?: boolean;
  writesDisabled?: boolean;
}

export default function MembersContent({
  members,
  universities,
  onSelectMember,
  editorUnlocked = false,
  writesDisabled = false,
}: MembersContentProps) {
  const router = useRouter();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const editingMember = useMemo(
    () =>
      editingMemberId && editingMemberId !== NEW_MEMBER_ID
        ? members.find((member) => member.id === editingMemberId) ?? null
        : null,
    [editingMemberId, members]
  );
  const showEditor =
    editorUnlocked &&
    Boolean(editingMemberId) &&
    (editingMemberId === NEW_MEMBER_ID || Boolean(editingMember));

  function handleSaved(member: Member) {
    setEditingMemberId(null);
    onSelectMember(member.universityId);
    router.refresh();
  }

  return (
    <motion.div
      className="h-full overflow-y-auto sidebar-scroll"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <div className="px-6 py-8 md:px-10 md:py-12">
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <h1 className="font-serif text-6xl leading-[0.95] tracking-tight text-black md:text-7xl">
              Members
            </h1>
            <div className="mt-8 h-[2px] w-[120px] bg-black" />
          </div>

          {editorUnlocked ? (
            <div className="flex flex-wrap items-center gap-2">
              {showEditor ? (
                <button
                  type="button"
                  onClick={() => setEditingMemberId(null)}
                  className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                >
                  Back To Members
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingMemberId(NEW_MEMBER_ID)}
                  disabled={writesDisabled}
                  className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                >
                  Add Member
                </button>
              )}
            </div>
          ) : null}
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mb-10 mt-6 font-serif text-xl italic text-[var(--ink-wash-700)]"
        >
          Faculty and researchers of the JUNK Consortium
        </motion.p>

        {editorUnlocked && writesDisabled ? (
          <motion.div
            variants={fadeUp}
            className="mb-8 border-2 border-[#D97706] bg-[#FFF4E8] px-4 py-4 text-sm leading-7 text-[#8A3B12]"
          >
            {PORTAL_READ_ONLY_MESSAGE}
          </motion.div>
        ) : null}

        <AnimatePresence initial={false} mode="wait">
          {showEditor ? (
            <motion.div
              key={`member-editor-${editingMemberId}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <MemberEditor
                mode={editingMemberId === NEW_MEMBER_ID ? "create" : "edit"}
                member={editingMember ?? undefined}
                universities={universities}
                writesDisabled={writesDisabled}
                onBack={() => setEditingMemberId(null)}
                onSaved={handleSaved}
              />
            </motion.div>
          ) : (
            <motion.div
              key="members-grid"
              variants={fadeUp}
              className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2 lg:grid-cols-3"
            >
              {members.map((member, index) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  index={index}
                  onSelect={onSelectMember}
                  editable={editorUnlocked}
                  onEdit={(entry) => {
                    onSelectMember(entry.universityId);
                    setEditingMemberId(entry.id);
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!showEditor ? (
          <motion.p
            variants={fadeUp}
            className="mt-16 pb-8 font-mono text-[10px] tracking-wider text-[var(--ink-wash-500)]"
          >
            JUNK CONSORTIUM - MEMBERS DIRECTORY
          </motion.p>
        ) : null}
      </div>
    </motion.div>
  );
}
