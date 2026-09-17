import { redirect } from "next/navigation";

/**
 * The gift codes screen moved to /studio/gift-codes — HOTFIX-29 Part 3.
 *
 * A redirect rather than a deletion because this path is in muscle memory
 * and possibly in a bookmark. Two screens for one job is the same shape of
 * bug as the two switches Part 1 removed, so there is exactly one screen and
 * the old address points at it.
 */
export default function LegacyGiftsPage() {
  redirect("/studio/gift-codes");
}
