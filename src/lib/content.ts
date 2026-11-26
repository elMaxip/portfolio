import { getCollection, getEntry } from "astro:content";
import { whatsappUrl } from "./format";

const byOrder = (a: { data: { order: number } }, b: { data: { order: number } }) =>
  a.data.order - b.data.order;

export async function getSite() {
  const entry = await getEntry("site", "main");
  if (!entry) throw new Error("Falta la entrada main en src/content/site.yaml");
  return {
    ...entry.data,
    name: `${entry.data.firstName} ${entry.data.lastName}`,
    whatsappHref: whatsappUrl(entry.data.whatsapp.number),
  };
}

export const getProjects = async () => (await getCollection("projects")).sort(byOrder);
export const getSteps = async () => (await getCollection("steps")).sort(byOrder);
export const getServices = async () => (await getCollection("services")).sort(byOrder);

/* Portafolio profesional */
export async function getProSite() {
  const entry = await getEntry("proSite", "main");
  if (!entry) throw new Error("Falta la entrada main en src/content/profesional/site.yaml");
  return entry.data;
}
export const getProProjects = async () => (await getCollection("proProjects")).sort(byOrder);
export const getStack = async () => (await getCollection("stack")).sort(byOrder);
