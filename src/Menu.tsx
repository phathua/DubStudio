import React, { useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
  safePolygon,
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react";

export function Menu({
  trigger,
  children,
  hover = false,
  align = "end",
}: {
  trigger: React.ReactElement;
  children: (close: () => void) => React.ReactNode;
  hover?: boolean;
  align?: "start" | "end";
}) {
  const [isOpen, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setOpen,
    placement: `bottom-${align}`,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const over = useHover(context, {
    enabled: hover,
    delay: { open: 150, close: 300 },
    handleClose: safePolygon(),
    move: false,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
    over,
  ]);
  return (
    <>
      {React.cloneElement(trigger as React.ReactElement<any>, {
        ref: refs.setReference,
        ...getReferenceProps(trigger.props as any),
        "aria-expanded": isOpen,
      })}
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
          >
            <div
              className="menu"
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              {children(() => setOpen(false))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
