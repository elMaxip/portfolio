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

/** Tramo de la línea de tiempo de "Así trabajo": (3, 14) → [...###########....] */
export const timelineBar = (start: number, end: number, total = 18): string =>
  `[${".".repeat(start)}${"#".repeat(end - start)}${".".repeat(total - end)}]`;
