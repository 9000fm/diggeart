import { useEffect } from "react";
import type { CuratorTab, ApprovedChannel } from "../types";

interface UseKeyboardShortcutsProps {
  activeTab: CuratorTab;
  setActiveTab: (tab: CuratorTab) => void;
  // Review mode
  handleDecision: (d: "approve" | "reject" | "unsubscribe") => void;
  handleSkip: () => void;
  handleGoBack: () => void;
  handleToggleStar: () => void;
  handleRescan: () => void;
  setPlayingVideoId: (id: string | null) => void;
  // Audit mode
  auditChannel: ApprovedChannel | null;
  handleSaveAuditLabels: () => void;
  handleChangeDecision: (
    id: string,
    name: string,
    d: "reject" | "unsubscribe"
  ) => void;
  handleToggleStarAudit: () => void;
  handleAuditRescan: () => void;
  exitAudit: () => void;
}

export function useKeyboardShortcuts({
  activeTab,
  setActiveTab,
  handleDecision,
  handleSkip,
  handleGoBack,
  handleToggleStar,
  handleRescan,
  setPlayingVideoId,
  auditChannel,
  handleSaveAuditLabels,
  handleChangeDecision,
  handleToggleStarAudit,
  handleAuditRescan,
  exitAudit,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Tab keyboard nav: 1/2/3
      if (e.key === "1") {
        setActiveTab("review");
        return;
      }
      if (e.key === "2") {
        setActiveTab("library");
        return;
      }
      if (e.key === "3") {
        setActiveTab("rejected");
        return;
      }

      // Audit mode shortcuts (library tab)
      if (auditChannel) {
        if (e.key === "l" || e.key === "L") handleSaveAuditLabels();
        if (e.key === "r" || e.key === "R")
          handleChangeDecision(
            auditChannel.id,
            auditChannel.name,
            "reject"
          );
        if (e.key === "u" || e.key === "U")
          handleChangeDecision(
            auditChannel.id,
            auditChannel.name,
            "unsubscribe"
          );
        if (e.key === "f" || e.key === "F") handleToggleStarAudit();
        if (e.key === "x" || e.key === "X") handleAuditRescan();
        if (e.key === "b" || e.key === "B" || e.key === "Escape") {
          exitAudit();
        }
        return;
      }

      if (activeTab !== "review") return;
      if (e.key === "a" || e.key === "A") handleDecision("approve");
      if (e.key === "r" || e.key === "R") handleDecision("reject");
      if (e.key === "u" || e.key === "U") handleDecision("unsubscribe");
      if (e.key === "s" || e.key === "S") handleSkip();
      if (e.key === "b" || e.key === "B") handleGoBack();
      if (e.key === "f" || e.key === "F") handleToggleStar();
      if (e.key === "x" || e.key === "X") handleRescan();
      if (e.key === "Escape") setPlayingVideoId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTab,
    setActiveTab,
    handleDecision,
    handleSkip,
    handleGoBack,
    handleToggleStar,
    handleRescan,
    setPlayingVideoId,
    auditChannel,
    handleSaveAuditLabels,
    handleChangeDecision,
    handleToggleStarAudit,
    handleAuditRescan,
    exitAudit,
  ]);
}
