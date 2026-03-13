export type TopicId = "530AM" | "945AM" | "10AM";

export type TabItem = "subscribe" | "status" | "unsubscribe";

export interface Tab {
  id: TabItem;
  label: string;
}

export interface Topic {
  id: TopicId;
  label: string;
}

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}
