import { useState, type FormEvent } from "react";
import { ActionButton } from "./Button";
import { supabase, supabaseConfigError } from "../lib/supabase";

export function EnquiryForm({ admissions = false }: { admissions?: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!event.currentTarget.reportValidity()) return;
    if (!supabase) {
      setFeedback({ kind: "error", message: supabaseConfigError ?? "The enquiry service is not configured." });
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    setFeedback(null);
    try {
      const { error } = await supabase.rpc("submit_public_enquiry", {
        _parent_name: String(values.get("name") ?? "").trim(),
        _email: String(values.get("email") ?? "").trim(),
        _message: String(values.get("message") ?? "").trim(),
        _phone: String(values.get("phone") ?? "").trim() || null,
        _student_name: String(values.get("student_name") ?? "").trim() || null,
        _programme_interest: String(values.get("subject") ?? "").trim() || null,
        _website: String(values.get("website") ?? ""),
      });
      if (error) {
        const message = error.message.includes("Too many recent enquiries")
          ? error.message
          : "We could not save your enquiry. Please check the details and try again later.";
        setFeedback({ kind: "error", message });
        return;
      }
      form.reset();
      setFeedback({
        kind: "success",
        message: "Your enquiry was recorded. This form does not send an email; the school can review it in the administrator portal.",
      });
    } catch {
      setFeedback({ kind: "error", message: "We could not save your enquiry because the service could not be reached. Please try again later." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="enquiry-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Your name <span aria-hidden="true">*</span>
          <input autoComplete="name" maxLength={120} minLength={1} name="name" placeholder="Your name" required />
        </label>
        <label>
          Email address <span aria-hidden="true">*</span>
          <input autoComplete="email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
        </label>
        {admissions && <>
          <label>
            Phone number
            <input autoComplete="tel" maxLength={32} name="phone" type="tel" />
          </label>
          <label>
            Student name (optional)
            <input autoComplete="off" maxLength={120} name="student_name" />
          </label>
        </>}
        <label>
          {admissions ? "Enquiry topic" : "I am enquiring about"}
          <select defaultValue="" name="subject">
            <option disabled value="">Choose a topic</option>
            <option>Admissions</option>
            <option>General information</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          Your message <span aria-hidden="true">*</span>
          <textarea maxLength={5000} minLength={10} name="message" placeholder="How can we help?" required rows={4} />
        </label>
        <label className="enquiry-honeypot" aria-hidden="true">
          Leave this field empty
          <input autoComplete="off" name="website" tabIndex={-1} />
        </label>
      </div>
      <div className="form-submit">
        <ActionButton disabled={submitting} type="submit">{submitting ? "Submitting…" : "Submit enquiry"} <span aria-hidden="true">→</span></ActionButton>
        <p>Your enquiry is stored only if the database confirms it. No email is sent.</p>
      </div>
      {feedback && (
        <p className={`form-feedback${feedback.kind === "error" ? " form-feedback--error" : ""}`} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      )}
    </form>
  );
}
