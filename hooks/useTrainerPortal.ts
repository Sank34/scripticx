"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { trainerPortalCopy } from "@/lib/trainer-portal-copy";
import {
  createCommentRecord,
  createResourceRecord,
  createSectionRecord,
  createWorkshopRecord,
  deleteCommentRecord,
  deleteResourceRecord,
  deleteSectionRecord,
  deleteWorkshopRecord,
  duplicateWorkshopRecord,
  fetchWorkshops,
  moveSectionRecord,
  nextSortOrder,
  resetWorkshopProgress,
  setSectionResource,
  updateCommentRecord,
  updateResourceRecord,
  updateSectionRecord,
  updateWorkshopRecord,
} from "@/lib/trainer-portal-data";
import {
  parseTrainers,
  type Workshop,
  type WorkshopComment,
  type WorkshopDraft,
  type WorkshopResource,
  type WorkshopSection,
} from "@/lib/trainer-portal";

export type TrainerPortalSaveState = "idle" | "saving" | "saved" | "failed";

export const workshopsQueryKey = ["admin", "workshops"] as const;

type TrainerPortalTask = {
  run: () => Promise<unknown>;
  success?: string;
};

export function useTrainerPortal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const copy = trainerPortalCopy(locale);
  const userId = user?.id ?? null;

  const workshopsQuery = useQuery({
    queryKey: workshopsQueryKey,
    queryFn: fetchWorkshops,
    staleTime: 30_000,
  });

  const workshops = useMemo(
    () => workshopsQuery.data ?? [],
    [workshopsQuery.data]
  );

  const mutation = useMutation({
    mutationFn: (task: TrainerPortalTask) => task.run(),
    onSuccess: async (_result, task) => {
      await queryClient.invalidateQueries({ queryKey: workshopsQueryKey });
      if (task.success) toast.success(task.success);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : copy.saveFailed);
    },
  });

  const { mutate } = mutation;
  const run = useCallback(
    (work: () => Promise<unknown>, success?: string) =>
      mutate({ run: work, success }),
    [mutate]
  );

  const findWorkshop = useCallback(
    (id: string) => workshops.find((workshop) => workshop.id === id),
    [workshops]
  );

  const actions = useMemo(
    () => ({
      addWorkshop(draft: WorkshopDraft, success?: string) {
        run(
          () =>
            createWorkshopRecord(
              {
                title: draft.title,
                summary: draft.summary,
                startsAt: draft.startsAt,
                location: draft.location,
                audience: draft.audience,
                trainers: parseTrainers(draft.trainers),
              },
              userId
            ),
          success
        );
      },

      duplicate(id: string, title: string, success?: string) {
        run(() => duplicateWorkshopRecord(id, title), success);
      },

      removeWorkshop(id: string, success?: string) {
        run(() => deleteWorkshopRecord(id), success);
      },

      updateWorkshop(id: string, patch: Partial<Workshop>, success?: string) {
        run(() => updateWorkshopRecord(id, patch), success);
      },

      addSection(id: string, input: Partial<WorkshopSection>) {
        const count = findWorkshop(id)?.sections.length ?? 0;
        run(() => createSectionRecord(id, input, nextSortOrder(count)));
      },

      updateSection(
        _id: string,
        sectionId: string,
        patch: Partial<WorkshopSection>
      ) {
        run(() => updateSectionRecord(sectionId, patch));
      },

      removeSection(_id: string, sectionId: string) {
        run(() => deleteSectionRecord(sectionId));
      },

      moveSection(_id: string, sectionId: string, direction: "up" | "down") {
        run(() => moveSectionRecord(sectionId, direction));
      },

      resetProgress(id: string) {
        run(() => resetWorkshopProgress(id));
      },

      addResource(id: string, input: Partial<WorkshopResource>) {
        const count = findWorkshop(id)?.resources.length ?? 0;
        run(() => createResourceRecord(id, input, nextSortOrder(count)));
      },

      updateResource(
        _id: string,
        resourceId: string,
        patch: Partial<WorkshopResource>
      ) {
        run(() => updateResourceRecord(resourceId, patch));
      },

      removeResource(_id: string, resourceId: string) {
        run(() => deleteResourceRecord(resourceId));
      },

      toggleSectionResource(id: string, sectionId: string, resourceId: string) {
        const attached = findWorkshop(id)
          ?.sections.find((section) => section.id === sectionId)
          ?.resourceIds.includes(resourceId);

        run(() => setSectionResource(sectionId, resourceId, !attached));
      },

      addComment(
        id: string,
        input: Partial<WorkshopComment>,
        success?: string
      ) {
        run(() => createCommentRecord(id, input, userId), success);
      },

      updateComment(
        _id: string,
        commentId: string,
        patch: Partial<WorkshopComment>
      ) {
        run(() => updateCommentRecord(commentId, patch));
      },

      removeComment(_id: string, commentId: string) {
        run(() => deleteCommentRecord(commentId));
      },
    }),
    [findWorkshop, run, userId]
  );

  const saveState: TrainerPortalSaveState = mutation.isPending
    ? "saving"
    : mutation.isError
      ? "failed"
      : mutation.isSuccess
        ? "saved"
        : "idle";

  return {
    workshops,
    loading: workshopsQuery.isPending,
    isError: workshopsQuery.isError,
    refetch: workshopsQuery.refetch,
    saveState,
    ...actions,
  };
}
