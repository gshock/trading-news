export type TabItem = "subscribe" | "status" | "unsubscribe";

export interface Tab {
  id: TabItem;
  label: string;
}
