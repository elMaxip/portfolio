import { type SubmitEvent, useEffect, useRef, useState } from "react";

interface Props {
  emailjs: { serviceId: string; templateId: string; publicKey: string };
}

const FIELDS = ["nombre", "correo", "asunto", "mensaje"] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;
/** Nombre accesible de cada campo. */
const NAMES: Record<Field, string> = { nombre: "Nombre", correo: "Correo", asunto: "Asunto", mensaje: "Mensaje" };
type Line = { text: string; tone?: "ok" | "error" };

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.nombre.trim().length < 3) e.nombre = "Escribe tu nombre, al menos tres letras.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.correo.trim())) e.correo = "Revisa el correo: debería verse como nombre@dominio.cl";
  if (v.asunto.trim().length < 3) e.asunto = "Cuéntame el tema en al menos tres letras.";
  if (v.mensaje.trim().length < 10) e.mensaje = "El mensaje necesita al menos diez caracteres.";
  return e;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Envía con la API de EmailJS: el sitio sigue siendo estático. */
async function send({ serviceId, templateId, publicKey }: Props["emailjs"], v: Values): Promise<boolean> {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      // Los mismos nombres que usa la plantilla de EmailJS
      template_params: {
        title: v.asunto.trim(),
        name: v.nombre.trim(),
        email: v.correo.trim(),
        email_id: v.correo.trim(),
        message: v.mensaje.trim(),
        time: new Date().toLocaleDateString("es-CL"),
      },
    }),
  });
  return response.ok;
}

/** Formulario de contacto con forma de terminal: cada campo es una ruta y el envío deja un registro. */
export default function ContactForm({ emailjs }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [log, setLog] = useState<Line[]>([]);
  const alive = useRef(true);
  // Hasta que React toma el formulario, el botón queda apagado: así el navegador
  // no lo envía por su cuenta y el mensaje nunca termina en la dirección de la página.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    return () => void (alive.current = false);
  }, []);

  const add = (line: Line) => alive.current && setLog((l) => [...l, line]);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || !form.current) return;
    const data = new FormData(form.current);
    const values = Object.fromEntries(FIELDS.map((k) => [k, String(data.get(k) ?? "")])) as Values;
    const found = validate(values);
    const first = FIELDS.find((k) => found[k]);
    if (first) {
      setErrors(found);
      setLog([]);
      setSent(false);
      const el = form.current.elements.namedItem(first);
      if (el instanceof HTMLElement) el.focus();
      return;
    }
    setErrors({});
    setSent(false);
    setSending(true);
    setLog([{ text: "> estableciendo conexión…" }]);
    // Se deja ver cada paso, aunque el envío sea más rápido
    const [ok] = await Promise.all([send(emailjs, values).catch(() => false), wait(650)]);
    add({ text: "> enviando mensaje…" });
    await wait(450);
    if (!alive.current) return;
    if (ok) {
      add({ text: "> mensaje enviado", tone: "ok" });
      form.current?.reset();
      setSent(true);
    } else {
      add({ text: "> no se pudo enviar", tone: "error" });
      add({ text: "estado: error. Vuelve a intentarlo o escríbeme por LinkedIn.", tone: "error" });
    }
    setSending(false);
  }

  const field = (k: Field) => ({
    id: `c-${k}`,
    name: k,
    className: "campo-entrada",
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `e-${k}` : undefined,
    disabled: sending,
    spellCheck: false,
    onInput: () => errors[k] && setErrors((all) => ({ ...all, [k]: undefined })),
  });
  const label = (k: Field) => (
    <label className="campo-ruta" htmlFor={`c-${k}`}>
      {/* La ruta es decoración; el lector de pantalla oye el nombre del campo */}
      <span aria-hidden="true">/contacto/{k}&gt;</span>
      <span className="oculto">{NAMES[k]}</span>
    </label>
  );
  const error = (k: Field) =>
    errors[k] && (
      <p className="campo-error" id={`e-${k}`}>
        {errors[k]}
      </p>
    );

  return (
    <form ref={form} className="formulario" noValidate aria-label="Contacto" onSubmit={submit}>
      <div className="formulario-barra">
        <p className="t-ventana">
          <span aria-hidden="true">&gt; </span>Mensaje nuevo
        </p>
      </div>
      <div className="formulario-cuerpo">
        <div className="campo">
          {label("nombre")}
          <input {...field("nombre")} type="text" autoComplete="name" />
          {error("nombre")}
        </div>
        <div className="campo">
          {label("correo")}
          <input {...field("correo")} type="email" autoComplete="email" />
          {error("correo")}
        </div>
        <div className="campo">
          {label("asunto")}
          <input {...field("asunto")} type="text" autoComplete="off" />
          {error("asunto")}
        </div>
        <div className="campo">
          {label("mensaje")}
          <textarea {...field("mensaje")} rows={6} spellCheck />
          {error("mensaje")}
        </div>
        <div className="formulario-enviar">
          <button className="cta" type="submit" disabled={sending || !ready}>
            {sending ? "Enviando…" : sent ? "Enviar otro mensaje" : "Enviar mensaje"}
          </button>
        </div>
        <ol className="registro" aria-live="polite">
          {log.map((l, i) => (
            <li key={i} className={l.tone}>
              {l.text}
            </li>
          ))}
        </ol>
      </div>
    </form>
  );
}
