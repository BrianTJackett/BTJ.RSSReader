import type { FeedlyEntry } from "@/types/feedly";
import type { SortOrder } from "@/app/hooks/useUserSettings";

export function sortEntriesByOrder(entries: FeedlyEntry[], order: SortOrder): FeedlyEntry[] {
  return [...entries].sort((left, right) => {
    if (order === "oldest") {
      return left.ageTimestamp - right.ageTimestamp;
    }

    return right.ageTimestamp - left.ageTimestamp;
  });
}
