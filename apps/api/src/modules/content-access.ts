import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WorkspaceRole } from "../generated/prisma/client.js";

export type WorkspaceContext = { workspaceId: string; role: WorkspaceRole };

export async function workspaceContext(
  app: FastifyInstance,
  request: FastifyRequest,
  workspaceId: string,
): Promise<WorkspaceContext | null> {
  const member = await app.prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: request.authUser!.id,
      workspace: { deletedAt: null },
    },
    select: { role: true },
  });
  return member ? { workspaceId, role: member.role } : null;
}

export function canWrite(role: WorkspaceRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function notFound(reply: { code: (status: number) => any }) {
  return reply
    .code(404)
    .send({ error: { code: "NOT_FOUND", message: "İçerik bulunamadı." } });
}

export function forbidden(reply: { code: (status: number) => any }) {
  return reply.code(403).send({
    error: {
      code: "FORBIDDEN",
      message: "Bu işlem için düzenleme yetkisi gerekli.",
    },
  });
}

export function conflict(reply: { code: (status: number) => any }) {
  return reply.code(409).send({
    error: {
      code: "SLUG_IN_USE",
      message: "Bu adreste zaten etkin bir kayıt var.",
    },
  });
}

export function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
