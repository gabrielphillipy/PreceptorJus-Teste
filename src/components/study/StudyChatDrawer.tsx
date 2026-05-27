import { cn } from "@/lib/utils";
import { StudyPearlsCard } from "@/components/study/StudyPearlsCard";
import { PreceptorChatPanel } from "@/components/study/PreceptorChatPanel";

interface StudyChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function StudyChatDrawer({ open, onClose }: StudyChatDrawerProps) {
  return (
    <>
      {open && (
        <div className="study-drawer-backdrop" onClick={onClose} aria-hidden />
      )}

      <aside className={cn("study-drawer", open && "study-drawer--open")}>
        <div className="study-drawer__inner">
          <StudyPearlsCard />
          <PreceptorChatPanel variant="drawer" />
        </div>
      </aside>
    </>
  );
}
