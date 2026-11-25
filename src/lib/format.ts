const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** 250000 → "$250.000" */
export const formatPrice = (value: number): string => clp.format(value);

/** Sin número enlaza a https://wa.me/ (provisorio). `message` queda escrito en el chat, sin enviarse. */
export const whatsappUrl = (number: string, message?: string): string =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

/** Barra de avance de "Así trabajo": [######............] */
export const progressBar = (filled: number, total = 18): string =>
  `[${"#".repeat(filled)}${".".repeat(total - filled)}]`;
