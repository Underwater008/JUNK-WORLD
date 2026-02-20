"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Member } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MemberCard({
  member,
  index,
  onSelect,
}: {
  member: Member;
  index: number;
  onSelect?: (universityId: string | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(member.name);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      onClick={() => {
        setExpanded(!expanded);
        onSelect?.(member.universityId);
      }}
      className="group cursor-pointer border-t-2 border-black pt-6 pb-8"
    >
      {/* Photo / Initials */}
      <div className="mb-5">
        {member.image && !imgError ? (
          <div className="w-[100px] h-[100px] overflow-hidden grayscale hover:grayscale-0 transition-[filter] duration-500">
            <img
              src={member.image}
              alt={member.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-[100px] h-[100px] bg-black flex items-center justify-center">
            <span className="font-serif text-2xl text-white tracking-wide">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h2 className="font-serif text-2xl leading-tight tracking-tight text-black mb-1">
        {member.name}
      </h2>

      {/* University + Country */}
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#888] font-semibold mb-3">
        {member.university}
      </p>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#AAA] font-bold">
        {member.city}, {member.country}
      </p>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-5">
              {/* Title */}
              <p className="text-xs font-semibold text-black mb-3">
                {member.title}
              </p>

              {/* Bio */}
              <p className="text-sm leading-relaxed text-[#444] mb-4">
                {member.bio}
              </p>

              {/* Links */}
              <div className="flex gap-4">
                {member.profileUrl && (
                  <a
                    href={member.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] uppercase tracking-[0.12em] font-bold text-black underline underline-offset-4 decoration-[#CCC] hover:decoration-black transition-colors"
                  >
                    Profile
                  </a>
                )}
                {member.websiteUrl && (
                  <a
                    href={member.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] uppercase tracking-[0.12em] font-bold text-black underline underline-offset-4 decoration-[#CCC] hover:decoration-black transition-colors"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
