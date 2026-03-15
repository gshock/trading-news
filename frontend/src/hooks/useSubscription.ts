import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import * as subscriptionApi from "../api/subscription";
import type { SubscribeRequest, ApiError } from "../types/subscription";

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error ?? data?.message ?? error.message;
  }
  return "Something went wrong";
}

export function useSubscribe() {
  return useMutation({
    mutationFn: (data: SubscribeRequest) => subscriptionApi.subscribe(data),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useGetSubscription(email: string) {
  return useQuery({
    queryKey: ["subscription", email],
    queryFn: () => subscriptionApi.getSubscription(email),
    enabled: false,
    retry: (failureCount, error) => {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
}

export function useUnsubscribe() {
  return useMutation({
    mutationFn: (email: string) => subscriptionApi.unsubscribe(email),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useConfirmSubscription() {
  return useMutation({
    mutationFn: (token: string) => subscriptionApi.confirmSubscription(token),
  });
}

export function useUnsubscribeByToken() {
  return useMutation({
    mutationFn: ({ token, topics }: { token: string; topics: string[] }) =>
      subscriptionApi.unsubscribeByToken(token, topics),
  });
}
