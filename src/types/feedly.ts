export type FeedlyEntry = {
  id: string;
  feedId: string;
  title: string;
  summary: string;
  source: string;
  published: number;
  ageTimestamp: number;
  url: string;
};

export type FeedlyFeed = {
  id: string;
  title: string;
  groups: string[];
  unreadCount: number;
};
