import { SKILLPACK_HEADER, SKILLREF_HEADER } from "./constants";

export type SkillValueType = "skillpack" | "skillref" | "string";

export function detectSkillValueType(value: string): SkillValueType {
  if (value.startsWith(SKILLPACK_HEADER)) return "skillpack";
  if (value.startsWith(SKILLREF_HEADER)) return "skillref";
  return "string";
}
