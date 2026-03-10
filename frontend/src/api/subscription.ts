import { api } from "./axios";
import type {
  SubscribeRequest,
  SubscribeResponse,
  SubscriptionResponse,
  UpdateStatusResponse,
  DeleteSubscriptionResponse,
} from "../types/subscription";

export async function subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
  const res = await api.post<SubscribeResponse>("/subscribe", data);
  return res.data;
}

export async function getSubscription(email: string): Promise<SubscriptionResponse> {
  const res = await api.get<SubscriptionResponse>(`/subscription/${encodeURIComponent(email)}`);
  return res.data;
}

export async function unsubscribe(email: string): Promise<UpdateStatusResponse> {
  const res = await api.put<UpdateStatusResponse>(
    `/subscription/${encodeURIComponent(email)}/status`,
    { status: "unsubscribed" },
  );
  return res.data;
}

export async function deleteSubscription(email: string): Promise<DeleteSubscriptionResponse> {
  const res = await api.delete<DeleteSubscriptionResponse>(
    `/subscription/${encodeURIComponent(email)}`,
  );
  return res.data;
}

export async function confirmSubscription(token: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/subscription/confirm", { token });
  return res.data;
}
