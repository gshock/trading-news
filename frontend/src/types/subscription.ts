export type SubscriptionStatus = "pending" | "active" | "unsubscribed";

export interface SubscribeRequest {
  email: string;
  topics: string;
  source: string;
}

export interface UpdateStatusRequest {
  status: SubscriptionStatus;
}

export interface SubscribeResponse {
  message: string;
  email: string;
}

export interface SubscriptionResponse {
  partitionKey: string;
  rowKey: string;
  status: SubscriptionStatus;
  createdUtc: string;
  confirmedUtc?: string;
  topics?: string;
  source?: string;
}

export interface UpdateStatusResponse {
  message: string;
  email: string;
  status: SubscriptionStatus;
}

export interface DeleteSubscriptionResponse {
  message: string;
  email: string;
}

export interface ApiError {
  error: string;
  status?: SubscriptionStatus;
  message?: string;
}
