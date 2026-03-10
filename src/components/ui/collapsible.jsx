"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

const CollapsibleContext = React.createContext({
  open: false,
  setOpen: () => {},
});

const Collapsible = ({ children, defaultOpen = false, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div>{children}</div>
    </CollapsibleContext.Provider>
  );
};

const CollapsibleTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const { open, setOpen } = React.useContext(CollapsibleContext);

  const handleClick = () => {
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        handleClick();
        children.props.onClick?.(e);
      },
      ref,
    });
  }

  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = ({ children, className = "" }) => {
  const { open } = React.useContext(CollapsibleContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
