import { useEffect } from "react";
import type { CuratorTab, ApprovedChannel } from "../types";

interface UseKeyboardShortcutsProps {
  activeTab: CuratorTab;
  setActiveTab: (tab: CuratorTab) => void;
  // Review mode (viewing a channel)
  isReviewing: boolean;
  handleDecision: (d: "approve" | "reject") => void;
  handleGoBack: () => void;
  handleToggleStar: () => void;
  handleRescan: () => void;
  exitReview: () => void;
  // Audit mode (approved tab)
  auditChannel: ApprovedChannel | null;
}

export function useKeyboardShortcuts({
  activeTab,
  setActiveTab,
  isReviewing,
  handleDecision,
  handleGoBack,
  handleToggleStar,
  handleRescan,
  exitReview,
  auditChannel,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Audit mode: AuditMode handles its own shortcuts
      if (auditChannel) return;

      // Tab keyboard nav: 1/2/3
      if (e.key === "1") { setActiveTab("approved"); return; }
      if (e.key === "2") { setActiveTab("review"); return; }
      if (e.key === "3") { setActiveTab("rejected"); return; }

      // Review mode: ReviewQueue component handles its own shortcuts
      if (isReviewing) return;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTab, setActiveTab, isReviewing,
    handleDecision, handleGoBack, handleToggleStar, handleRescan, exitReview,
    auditChannel,
  ]);
}
