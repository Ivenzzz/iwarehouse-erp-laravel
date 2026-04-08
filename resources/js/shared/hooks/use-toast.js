import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1500;

const listeners = [];
let memoryState = { toasts: [] };
const toastTimeouts = new Map();

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) => (toast.id === action.toast.id ? { ...toast, ...action.toast } : toast)),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) => (toast.id === action.toastId || action.toastId === undefined
          ? { ...toast, open: false }
          : toast)),
      };
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }

      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };
    default:
      return state;
  }
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = window.setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function toast({ ...props }) {
  const id = genId();

  const update = (next) => dispatch({
    type: "UPDATE_TOAST",
    toast: { ...next, id },
  });

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismiss();
        }
      },
    },
  });

  addToRemoveQueue(id);

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);

    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { toast, useToast };
