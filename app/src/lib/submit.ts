"use client";
// Why this exists: with <form action={...}>, React 19 automatically RESETS the form after the
// server answers. If the server returns a validation error, the user's typing and ticked
// checkboxes get wiped (sometimes one click later). For a clinical form that's unacceptable.
//
// The forms that use this also carry method="post": if pressed before the page script has
// loaded, the browser posts the fields in the body (never in the URL, where passwords and
// patient data would end up in history and server logs).
//
// Using onSubmit + startTransition sends the same FormData to the same Server Action, but
// skips the automatic reset, so whatever the user entered stays on screen.
import { startTransition, type FormEvent } from "react";

export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
