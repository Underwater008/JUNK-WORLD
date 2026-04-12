"use client";

import type {
  DefaultReactSuggestionItem,
  SuggestionMenuProps,
} from "@blocknote/react";

export default function ProjectSlashMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  return (
    <div className="project-slash-menu">
      {(loadingState === "loading" || loadingState === "loading-initial") && (
        <div className="project-slash-menu__status">Loading blocks...</div>
      )}

      {items.map((item, index) => {
        const previousGroup = index > 0 ? items[index - 1]?.group : undefined;
        const shouldRenderGroup = item.group && item.group !== previousGroup;

        return (
          <div key={`${item.title}-${index}`}>
            {shouldRenderGroup ? (
              <p className="project-slash-menu__group">{item.group}</p>
            ) : null}
            <button
              type="button"
              onClick={() => onItemClick?.(item)}
              className={`project-slash-menu__item ${
                index === selectedIndex ? "is-selected" : ""
              }`}
            >
              <span className="project-slash-menu__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="project-slash-menu__copy">
                <span className="project-slash-menu__title">{item.title}</span>
                {item.subtext ? (
                  <span className="project-slash-menu__subtext">
                    {item.subtext}
                  </span>
                ) : null}
              </span>
              {item.badge ? (
                <span className="project-slash-menu__badge">{item.badge}</span>
              ) : null}
            </button>
          </div>
        );
      })}

      {items.length === 0 && loadingState === "loaded" ? (
        <div className="project-slash-menu__status">No matching blocks.</div>
      ) : null}
    </div>
  );
}
